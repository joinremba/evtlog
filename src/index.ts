import pino from "pino";
import type { Logger as PinoLogger, Level as PinoLevel, LoggerOptions } from "pino";
import type { Client, LogEvent } from "@joinremba/core";

export type LogLevel = PinoLevel;

export interface TransportOptions {
  target: string;
  options?: Record<string, unknown>;
}

export interface PinoDestination {
  write: (data: string | Uint8Array) => void;
}

export interface CatalogOptions {
  service: string;
  level?: LogLevel;
  redact?: string[];
  redactPaths?: string[];
  transport?: TransportOptions | TransportOptions[];
  destination?: PinoDestination;
  mixin?: () => Record<string, unknown>;
  base?: Record<string, unknown>;
  environment?: string;
  client?: Client;
}

export interface Catalog {
  trace(msg: string, data?: Record<string, unknown>): void;
  trace(data: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  error(data: Record<string, unknown>): void;
  fatal(msg: string, data?: Record<string, unknown>): void;
  fatal(data: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Catalog;
  /** Create a scoped child logger bound to a module/package name.
   *  Equivalent to `.child({ module: name })` — every log entry from the
   *  returned logger includes `"module":"name"`. */
  scope(name: string): Catalog;
  readonly level: LogLevel;
}

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "secret",
  "apiKey",
  "apiSecret",
  "token",
  "accessToken",
  "refreshToken",
  "idToken",
  "ssn",
  "taxId",
  "passportNumber",
  "driverLicense",
  "phone",
  "phoneNumber",
  "mobile",
  "email",
  "emailAddress",
  "accountNumber",
  "routingNumber",
  "iban",
  "swift",
  "cardNumber",
  "cvv",
  "cvc",
  "expiryDate",
  "pin",
  "bvn",
  "nin",
  "bvnHash",
  "ninHash",
  "ip",
  "ipAddress",
  "userAgent",
  "firstName",
  "lastName",
  "fullName",
  "dateOfBirth",
  "dob",
  "address",
  "location",
  "otp",
  "securityAnswer",
]);

function redactFields(
  data: Record<string, unknown>,
  extraFields?: Set<string>
): Record<string, unknown> {
  const fields = extraFields ? new Set([...SENSITIVE_FIELDS, ...extraFields]) : SENSITIVE_FIELDS;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (fields.has(key) || fields.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof Error)
    ) {
      result[key] = redactFields(value as Record<string, unknown>, fields);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const serializer: LoggerOptions["serializers"] = {
  err: pino.stdSerializers.err,
  error: pino.stdSerializers.err,
};

export function createCatalog(options: CatalogOptions): Catalog {
  const {
    service,
    level,
    redact,
    redactPaths,
    transport,
    mixin,
    base,
    destination,
    environment,
    client,
  } = options;
  const extraRedactFields = redact ? new Set(redact) : undefined;

  const mergedBase = { ...base, ...(environment ? { environment } : {}) };
  const pinoOptions: LoggerOptions = {
    name: service,
    level: level ?? "info",
    redact: redactPaths ? { paths: redactPaths, censor: "[REDACTED]" } : undefined,
    serializers: serializer,
    ...(Object.keys(mergedBase).length > 0 && { base: mergedBase }),
    mixin() {
      return mixin ? mixin() : {};
    },
  };

  let logger: PinoLogger;

  if (destination) {
    logger = pino(pinoOptions, destination as unknown as pino.DestinationStream);
  } else if (transport) {
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

  const FLUSH_THRESHOLD = 100;
  const buffer: LogEvent[] = [];

  function flush(): void {
    if (!client || buffer.length === 0) return;
    const batch = buffer.splice(0);
    client.ingestLogs(batch).catch(() => {
      // NetworkError or any error: silently drop — local logs are already written
    });
  }

  function enqueue(method: string, message: string, data?: Record<string, unknown>): void {
    if (!client) return;
    buffer.push({ timestamp: new Date().toISOString(), level: method, service, message, data });
    if (buffer.length >= FLUSH_THRESHOLD) {
      flush();
    }
  }

  if (client) {
    process.on("beforeExit", flush);
  }

  const buildChild = (parentLogger: PinoLogger): Catalog => {
    const childAdapt = (method: PinoLevel) => {
      return (first: string | Record<string, unknown>, second?: Record<string, unknown>) => {
        if (typeof first === "string") {
          if (second) {
            parentLogger[method](redactFields(second, extraRedactFields), first);
            enqueue(method, first, second);
          } else {
            parentLogger[method](first);
            enqueue(method, first);
          }
        } else {
          parentLogger[method](redactFields(first, extraRedactFields));
          enqueue(method, "", first);
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

      child(bindings: Record<string, unknown>): Catalog {
        return buildChild(parentLogger.child(bindings));
      },

      scope(name: string): Catalog {
        return buildChild(parentLogger.child({ module: name }));
      },

      get level(): LogLevel {
        return parentLogger.level as LogLevel;
      },
    };
  };

  const catalog: Catalog = buildChild(logger);

  return catalog;
}

export function safeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const err = error as Error & { statusCode?: unknown; code?: unknown };
    const result: Record<string, unknown> = { message: err.message, name: err.name };
    if (err.statusCode != null) result.statusCode = err.statusCode;
    if (err.code != null) result.code = err.code;
    return result;
  }
  return { message: String(error) };
}

export default createCatalog;
