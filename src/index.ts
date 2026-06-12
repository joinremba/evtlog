import pino from "pino";
import type { Logger as PinoLogger, Level as PinoLevel, LoggerOptions } from "pino";

export type LogLevel = PinoLevel;

export interface TransportOptions {
  target: string;
  options?: Record<string, unknown>;
}

export interface CatalogOptions {
  service: string;
  level?: LogLevel;
  redact?: string[];
  redactPaths?: string[];
  transport?: TransportOptions | TransportOptions[];
  mixin?: () => Record<string, unknown>;
  base?: Record<string, unknown>;
  environment?: string;
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
  const { service, level, redact, redactPaths, transport, mixin, base } = options;
  const extraRedactFields = redact ? new Set(redact) : undefined;

  const pinoOptions: LoggerOptions = {
    name: service,
    level: level ?? "info",
    redact: redactPaths ? { paths: redactPaths, censor: "[REDACTED]" } : undefined,
    serializers: serializer,
    ...(base && { base }),
    mixin() {
      return mixin ? mixin() : {};
    },
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

  const buildChild = (parentLogger: PinoLogger): Catalog => {
    const childAdapt = (method: PinoLevel) => {
      return (first: string | Record<string, unknown>, second?: Record<string, unknown>) => {
        if (typeof first === "string") {
          if (second) {
            parentLogger[method](redactFields(second, extraRedactFields), first);
          } else {
            parentLogger[method](first);
          }
        } else {
          parentLogger[method](redactFields(first, extraRedactFields));
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

      get level(): LogLevel {
        return parentLogger.level as LogLevel;
      },
    };
  };

  const catalog: Catalog = buildChild(logger);

  return catalog;
}

export default createCatalog;
