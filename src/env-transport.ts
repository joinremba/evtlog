import type { LogLevel, PinoDestination, TransportOptions } from "./index";

export type EnvTransportResult = {
  transport?: TransportOptions | TransportOptions[];
  destination?: PinoDestination;
  level?: LogLevel;
};

export interface EnvTransportOptions {
  /** Number of log files to keep (pino-roll `maxFiles`). Only applies to production. */
  maxFiles?: number;
  /** Maximum total size before rotation, e.g. "500MB", "1GB" (pino-roll `maxSize`). */
  maxSize?: string;
}

const noopDestination: PinoDestination = { write() {} };

export function envTransport(env?: string, opts?: EnvTransportOptions): EnvTransportResult {
  const environment = env ?? process.env.NODE_ENV ?? "development";

  switch (environment) {
    case "production":
      return {
        transport: {
          target: "pino-roll",
          options: {
            file: "./logs/production.log",
            frequency: "daily",
            mkdir: true,
            ...(opts?.maxFiles !== undefined && { maxFiles: opts.maxFiles }),
            ...(opts?.maxSize !== undefined && { maxSize: opts.maxSize }),
          },
        },
        level: "info",
      };
    case "staging":
      return {
        transport: {
          target: "pino/file",
          options: { destination: "./logs/staging.log", mkdir: true },
        },
        level: "info",
      };
    case "test":
      return { destination: noopDestination, level: "silent" as LogLevel };
    case "development":
    default:
      return {
        transport: {
          target: "pino/file",
          options: { destination: "./logs/development.log", mkdir: true },
        },
        level: "debug",
      };
  }
}
