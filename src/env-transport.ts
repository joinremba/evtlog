import type { LogLevel, PinoDestination, TransportOptions } from "./index";

export type EnvTransportResult = {
  transport?: TransportOptions | TransportOptions[];
  destination?: PinoDestination;
  level?: LogLevel;
};

const noopDestination: PinoDestination = { write() {} };

export function envTransport(env?: string): EnvTransportResult {
  const environment = env ?? process.env.NODE_ENV ?? "development";

  switch (environment) {
    case "production":
      return {
        transport: {
          target: "pino-roll",
          options: { file: "./logs/production.log", frequency: "daily", mkdir: true },
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
