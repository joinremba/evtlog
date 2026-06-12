# @joinremba/catalog

[![npm version](https://img.shields.io/npm/v/@joinremba/catalog)](https://www.npmjs.com/package/@joinremba/catalog)
[![Licence](https://img.shields.io/npm/l/@joinremba/catalog)](LICENSE)
[![CI](https://github.com/joinremba/catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/joinremba/catalog/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-1.3%2B-%23ffc83d?logo=bun)](https://bun.sh)

Catalog is a production-ready logging and error event layer for TypeScript backends, built on [Pino](https://getpino.io/).

## Features

- **Event-name-first API** — Log with descriptive event names: `catalog.info("wallet.created", { userId })`. Events are indexed, searchable, and consistent across your codebase.
- **Pino-based** — Ultra-fast structured JSON logging with full Pino ecosystem support.
- **Sensitive data redaction** — Automatically redacts PII, secrets, and credentials from log output via configurable path patterns.
- **Multi-transport** — Route logs to console, file, rolling files, or external services based on environment.
- **Request context** — Correlate logs with request IDs via child loggers.
- **Error serializer** — Standardised error serialization for consistent error objects in logs.
- **HTTP request logging** — Middleware for automatic request/response logging.
- **Environment-aware** — Pretty printing in development, structured JSON and file rolling in production.
- **Framework adapters** — Plug into Express, Hono, Fastify, or any Bun-native server.

## Installation

```sh
bun add @joinremba/catalog
```

## Quick Start

```ts
import { createCatalog } from "@joinremba/catalog";

const catalog = createCatalog({
  service: "@joinremba/api",
  environment: process.env.NODE_ENV,
  redact: ["authorization", "password", "bvn", "nin"],
});

catalog.info("wallet.created", { userId, walletId });
catalog.error("payment.failed", { amount: 100, error: err.message });
```

## API Reference

### `createCatalog(options)`

Creates and returns a configured Catalog instance. It is the main entry point for the package.

#### Options

| Option        | Type                                     | Default               | Description                                            |
| ------------- | ---------------------------------------- | --------------------- | ------------------------------------------------------ |
| `service`     | `string`                                 | —                     | Application or service name, included in every log.    |
| `environment` | `string`                                 | —                     | Environment name (e.g. `"production"`, `"staging"`).   |
| `level`       | `LogLevel`                               | `"info"`              | Minimum log level.                                     |
| `redact`      | `string[]`                               | —                     | Paths to redact (e.g. `["password", "creditCard.*"]`). |
| `transport`   | `TransportOptions \| TransportOptions[]` | Pino default (stdout) | Single or array of transport configurations.           |

#### Log Levels

| Method               | Use                   |
| -------------------- | --------------------- |
| `catalog.trace(...)` | Trace-level logging   |
| `catalog.debug(...)` | Debug-level logging   |
| `catalog.info(...)`  | Informational logging |
| `catalog.warn(...)`  | Warning logging       |
| `catalog.error(...)` | Error logging         |
| `catalog.fatal(...)` | Fatal logging         |

Each method accepts an event name (string) and an optional data object:

```ts
catalog.info("user.signed-in", { userId: 42 });
catalog.error("db.connection-failed", { err });
catalog.info("app.started"); // event name only
```

### Child Loggers

Create a child logger that inherits the parent's configuration and adds bound fields:

```ts
const catalog = createCatalog({ service: "app" });
const reqLog = catalog.child({ requestId: "abc-123" });

reqLog.info("request.handled", { path: "/api/users" });
// Includes requestId: "abc-123" in every log
```

### Redaction

Sensitive data is automatically redacted from log output. Configure paths using dot notation:

```ts
const catalog = createCatalog({
  service: "secure-app",
  redact: ["password", "creditCard.number", "ssn", "authorization"],
});

catalog.info("user.login", { userId: 42, password: "secret" });
// password is redacted as [REDACTED]
```

### Multi-transport

Route logs to multiple destinations:

```ts
const catalog = createCatalog({
  service: "my-app",
  transport: [
    { target: "pino/file", options: {} }, // stdout
    { target: "pino/file", options: { destination: "./logs/app.log" } }, // file
    { target: "pino-roll", options: { file: "./logs/out.log", frequency: "daily" } }, // rolling
  ],
});
```

### Error Serializer

Catalog includes a built-in error serializer that converts `Error` instances into structured objects:

```ts
try {
  await riskyOperation();
} catch (err) {
  catalog.error("operation.failed", { error: err });
  // error is serialised: { message, name, stack, cause }
}
```

### Safe Error Response Helper

For API backends, Catalog provides helpers to build safe error responses without leaking internals:

```ts
import { safeError } from "@joinremba/catalog";

app.onError((err, c) => {
  catalog.error("request.error", { error: err });
  return c.json(safeError(err), 500);
});
```

## Middleware

### Request ID Middleware

Automatically generates or extracts a request ID and binds it to all logs within a request:

```ts
import { requestId } from "@joinremba/catalog";
import { createCatalog } from "@joinremba/catalog";

const catalog = createCatalog({ service: "my-api" });

// Express
app.use(requestId({ header: "X-Request-Id" }));
app.use((req, res, next) => {
  const log = catalog.child({ requestId: req.headers["x-request-id"] });
  req.log = log;
  next();
});
```

### HTTP Request Logger

Automatically log incoming requests and responses:

```ts
import { httpLogger } from "@joinremba/catalog";

// Express
app.use(httpLogger({ catalog, excludePaths: ["/health"] }));
```

## Framework Adapters

Catalog is framework-agnostic but ships with adapters for popular frameworks:

```ts
// Express
import { expressAdapter } from "@joinremba/catalog/adapters/express";

// Hono
import { honoAdapter } from "@joinremba/catalog/adapters/hono";

// Fastify
import { fastifyAdapter } from "@joinremba/catalog/adapters/fastify";
```

Adapters automatically configure request ID tracking, error serialization, and HTTP logging for the target framework.

## TypeScript Types

```ts
import type { Catalog, LogLevel, CatalogOptions, TransportOptions } from "@joinremba/catalog";
```

| Type               | Description                                                            |
| ------------------ | ---------------------------------------------------------------------- |
| `Catalog`          | The logger instance type.                                              |
| `LogLevel`         | Union: `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal"`. |
| `CatalogOptions`   | Options object passed to `createCatalog`.                              |
| `TransportOptions` | Transport configuration with `target` and `options`.                   |

## Examples

### Basic usage

```ts
import { createCatalog } from "@joinremba/catalog";

const catalog = createCatalog({ service: "my-service" });

catalog.info("service.starting");
catalog.debug("config.loaded", { port: 3000 });
```

### With request context

```ts
import { createCatalog } from "@joinremba/catalog";

const catalog = createCatalog({ service: "web-app" });

Bun.serve({
  port: 3000,
  fetch(req) {
    const log = catalog.child({ requestId: crypto.randomUUID() });
    log.info("request.incoming", { url: req.url });
    return new Response("OK");
  },
});
```

### Environment-aware config

```ts
const catalog = createCatalog({
  service: "my-app",
  environment: process.env.NODE_ENV,
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV === "production"
      ? [
          { target: "pino/file", options: { destination: "./logs/app.log" } },
          { target: "pino-roll", options: { file: "./logs/out.log", frequency: "daily" } },
        ]
      : undefined, // pretty-print to console in dev
});
```

## Roadmap

**MVP** (current)

- Pino wrapper with event-name-first API
- Sensitive data redaction with configurable paths
- Child loggers with bound context
- Multi-transport support
- Error serializer
- Safe error response helper

**V1**

- Request ID middleware
- HTTP request logging middleware
- Express, Hono, Fastify adapters
- Audit event module (`catalog.audit()`)
- Security event module (`catalog.security()`)
- Webhook event module
- Payment-safe log redaction defaults
- Local pretty log viewer
- OpenTelemetry bridge
- Log sampling

**V2**

- Hosted log ingestion
- Dashboards and alerts
- Retention policies
- Compliance exports
- Audit-log immutability
- Team access controls

## Related Packages

- [@joinremba/beacon](https://github.com/joinremba/beacon) — Environment validation, config, secrets, and feature gates.
- [@joinremba/gate](https://github.com/joinremba/gate) — API safety layer: validation, responses, idempotency, rate limiting, and API keys.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

MIT &mdash; see [LICENSE](LICENSE).
