import pino from "pino";
import type { Logger as PinoLogger, Level as PinoLevel } from "pino";

export type LogLevel = PinoLevel;

export interface CatalogOptions {
  service: string;
  environment?: string;
  level?: LogLevel;
  redact?: string[];
  transport?: TransportOptions | TransportOptions[];
}

export interface TransportOptions {
  target: string;
  options?: Record<string, unknown>;
}

export interface Catalog {
  trace(event: string, data?: Record<string, unknown>): void;
  debug(event: string, data?: Record<string, unknown>): void;
  info(event: string, data?: Record<string, unknown>): void;
  warn(event: string, data?: Record<string, unknown>): void;
  error(event: string, data?: Record<string, unknown>): void;
  fatal(event: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Catalog;
  readonly level: LogLevel;
}

export function createCatalog(options: CatalogOptions): Catalog {
  const { service, environment, level, redact, transport } = options;

  const pinoOptions: pino.LoggerOptions = {
    name: service,
    level: level ?? "info",
    redact: redact ? { paths: redact, censor: "[REDACTED]" } : undefined,
    ...(environment && { env: environment }),
  };

  let logger: PinoLogger;

  if (transport) {
    const transports = Array.isArray(transport) ? transport : [transport];
    const targets = transports.map((t) => ({
      target: t.target,
      options: t.options ?? {},
      level: level ?? "info",
    }));

    logger = pino(pinoOptions, pino.transport({ targets }) as unknown as pino.DestinationStream);
  } else {
    logger = pino(pinoOptions);
  }

  const adapt = (method: PinoLevel) => {
    return (event: string, data?: Record<string, unknown>) => {
      if (data) {
        logger[method](data, event);
      } else {
        logger[method](event);
      }
    };
  };

  const catalog: Catalog = {
    trace: adapt("trace"),
    debug: adapt("debug"),
    info: adapt("info"),
    warn: adapt("warn"),
    error: adapt("error"),
    fatal: adapt("fatal"),

    child(bindings: Record<string, unknown>): Catalog {
      const childLogger = logger.child(bindings);
      const childAdapt = (method: PinoLevel) => {
        return (event: string, data?: Record<string, unknown>) => {
          if (data) {
            childLogger[method](data, event);
          } else {
            childLogger[method](event);
          }
        };
      };

      return {
        trace: childAdapt("trace"),
        debug: childAdapt("debug"),
        info: childAdapt("info"),
        warn: childAdapt("warn"),
        error: childAdapt("error"),
        fatal: childAdapt("fatal"),

        child(b: Record<string, unknown>): Catalog {
          return createCatalog({ ...options, service: (b.service as string) ?? service });
        },

        get level(): LogLevel {
          return childLogger.level as LogLevel;
        },
      };
    },

    get level(): LogLevel {
      return logger.level as LogLevel;
    },
  };

  return catalog;
}

export default createCatalog;
