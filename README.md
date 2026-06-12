# @remba/catalog

[![npm version](https://img.shields.io/npm/v/@remba/catalog)](https://www.npmjs.com/package/@remba/catalog)
[![Licence](https://img.shields.io/npm/l/@remba/catalog)](LICENSE)
[![CI](https://github.com/joinremba/catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/joinremba/catalog/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-1.3%2B-%23ffc83d?logo=bun)](https://bun.sh)

Catalog is a production-ready logging and error event layer for TypeScript backends, built on [Pino](https://getpino.io/).

## Features

- **Pino-based** — Ultra-fast structured JSON logging with full Pino ecosystem support.
- **Sensitive data redaction** — Automatically redacts PII, secrets, and credentials from log output.
- **Multi-transport** — Route logs to console, file, rolling files, or external services based on environment.
- **Request context** — Correlate logs with request IDs automatically.
- **Environment-aware** — Pretty printing in development, structured JSON and file rolling in production.

## Installation

```sh
bun add @remba/catalog
```

## Quick Start

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({ name: "my-app" });

log.info({ message: "Server started", port: 3000 });
log.error({ message: "Failed to connect", error: err.message });
```

## API Reference

### `createLogger(options)`

Creates and returns a configured logger instance. It is the main entry point for the package.

#### Options

| Option           | Type                                      | Default                                 | Description                                                                                                      |
| ---------------- | ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `name`           | `string`                                  | `undefined`                             | Application or service name, included in every log entry.                                                        |
| `level`          | `LogLevel`                                | `"info"`                                | Minimum log level. One of `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"`.                        |
| `redact`         | `RedactOptions`                           | `{}`                                    | Configuration for sensitive data redaction. Accepts Pino-style paths (e.g. `["password", "creditCard.number"]`). |
| `transport`      | `TransportOptions \| TransportOptions[]`  | `{ target: "pino/file" }`               | Single or array of transport configurations. Each transport specifies a `target` module and optional `options`.  |
| `env`            | `"development" \| "production" \| "test"` | `process.env.NODE_ENV ?? "development"` | Environment context. Automatically selects pretty-printing in development and JSON in production.                |
| `requestContext` | `RequestContextFn`                        | `undefined`                             | A function that returns request-scoped context (e.g. `reqId`, `userId`). Merged into every log entry.            |
| `base`           | `Record<string, unknown>`                 | `{}`                                    | Static base fields to include in every log entry.                                                                |

#### Example

```ts
const log = createLogger({
  name: "api-server",
  level: "debug",
  redact: ["password", "authorization"],
  transport: { target: "pino/file", options: { destination: "./logs/app.log" } },
});
```

### Logger Methods

Every logger instance exposes the following methods, matching Pino's API:

| Method                | Use                   |
| --------------------- | --------------------- |
| `log.trace(obj, msg)` | Trace-level logging   |
| `log.debug(obj, msg)` | Debug-level logging   |
| `log.info(obj, msg)`  | Informational logging |
| `log.warn(obj, msg)`  | Warning logging       |
| `log.error(obj, msg)` | Error logging         |
| `log.fatal(obj, msg)` | Fatal logging         |

Each method accepts an optional data object and a message string:

```ts
log.info({ userId: 42 }, "User signed in");
log.error({ err }, "Database connection failed");
```

### Child Loggers

Create a child logger that inherits the parent's configuration and adds bound fields:

```ts
const log = createLogger({ name: "app" });
const reqLog = log.child({ requestId: "abc-123" });

reqLog.info("Handling request"); // includes requestId: "abc-123"
```

Child loggers support the same methods and redaction rules as the parent.

### TypeScript Types

The package exports the following types:

```ts
import type {
  Logger,
  LogLevel,
  LoggerOptions,
  RedactOptions,
  TransportOptions,
  RequestContextFn,
} from "@remba/catalog";
```

| Type               | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `Logger`           | The logger instance type.                                                                  |
| `LogLevel`         | Union of valid log levels: `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal"`. |
| `LoggerOptions`    | Options object passed to `createLogger`.                                                   |
| `RedactOptions`    | Redaction configuration (paths, censor, remove).                                           |
| `TransportOptions` | Transport configuration with `target` and `options`.                                       |
| `RequestContextFn` | Function signature for generating request context.                                         |

## Examples

### Basic usage

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({ name: "my-service" });

log.info("Service starting");
log.debug({ config: { port: 3000 } }, "Loaded configuration");
```

### With request context

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({
  name: "web-app",
  requestContext: () => ({
    requestId: crypto.randomUUID(),
  }),
});

// Every log entry will include a requestId field
log.info({ path: "/api/users" }, "Incoming request");
```

### Sensitive data redaction

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({
  name: "secure-app",
  redact: ["password", "creditCard", "authorization", "ssn"],
});

log.info({ user: "alice", password: "secret123" });
// password will be redacted as "[Redacted]"
```

### Multi-transport (console + file)

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({
  name: "app",
  transport: [
    { target: "pino/file", options: {} }, // console (stdout)
    { target: "pino/file", options: { destination: "./logs/app.log" } }, // file
    { target: "pino/file", options: { destination: "./logs/errors.log" } }, // error file
  ],
});

log.info("This goes to console and app.log");
log.error("This also goes to the error file");
```

### Environment-aware config

```ts
import { createLogger } from "@remba/catalog";

const log = createLogger({
  name: "my-app",
  env: process.env.NODE_ENV, // "development" or "production"
  // In development: pretty-printing to console
  // In production: structured JSON with file rolling
});
```

## Related Packages

- [@remba/beacon](https://github.com/joinremba/beacon) — Telemetry and metrics collection for Remba services.
- [@remba/gate](https://github.com/joinremba/gate) — Unified error handling and reporting layer.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

MIT &mdash; see [LICENSE](LICENSE).
