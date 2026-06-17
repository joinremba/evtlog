# @joinremba/catalog

[![npm version](https://img.shields.io/npm/v/@joinremba/catalog)](https://www.npmjs.com/package/@joinremba/catalog)
[![License](https://img.shields.io/npm/l/@joinremba/catalog)](LICENSE)
[![CI](https://github.com/joinremba/catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/joinremba/catalog/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-1.3%2B-%23ffc83d?logo=bun)](https://bun.sh)

Production-ready logging and error event layer for TypeScript backends, built on [Pino](https://getpino.io/).

## Features

- **Event-name-first API** — `catalog.info("user.created", { userId })` for consistent, searchable log events.
- **Pino under the hood** — Ultra-fast structured JSON logging with full Pino transport ecosystem.
- **Automatic sensitive data redaction** — Built-in denylist of PII, secrets, and credentials (email, phone, SSN, API keys, tokens, etc.), plus configurable path patterns.
- **Multi-transport** — Single transport or array of targets for console, file, rolling files (pino-roll), or external sinks.
- **Child loggers** — `.child()` and `.scope()` for request-scoped and module-scoped context binding.
- **Error serialization** — `safeError()` helper strips internals from `Error` objects for safe API responses.
- **Framework adapters** — First-class support for Hono, Express, and Fastify.
- **Audit & Security events** — Structured modules for audit trails and security event logging.
- **Webhook forwarding** — Batch log delivery to external webhook endpoints with retry and HMAC signing.
- **OpenTelemetry bridge** — Correlate logs with active span context.
- **Log sampling** — Deterministic or custom sampling to control volume.
- **Cloud log ingestion** — Optional `@joinremba/core` client for remote log batching.
- **Strict TypeScript** — Full type exports for `Catalog`, `CatalogOptions`, `LogLevel`, and more.

## Installation

```sh
bun add @joinremba/catalog
```

Requires **Bun >= 1.3.1**.

## Quick Start

```ts
import { createCatalog } from "@joinremba/catalog";

const catalog = createCatalog({
  service: "my-api",
  environment: process.env.NODE_ENV ?? "development",
  level: "info",
});

catalog.info("app.started", { port: 3000 });
catalog.info("user.created", { userId: "usr_abc123" });
catalog.error("payment.failed", { amount: 4999, currency: "USD" });
```

Output is newline-delimited JSON (NDJSON) written to stdout by default. Pipe through `pino-pretty` for dev:

```sh
bun run start | bunx pino-pretty
```

## Log Levels

| Level   | Method                 | Usage                              |
| ------- | ---------------------- | ---------------------------------- |
| `trace` | `catalog.trace(...)`   | Diagnostic detail during dev       |
| `debug` | `catalog.debug(...)`   | Development debugging              |
| `info`  | `catalog.info(...)`    | Normal operational events          |
| `warn`  | `catalog.warn(...)`    | Unexpected but handled situations  |
| `error` | `catalog.error(...)`   | Recoverable errors                 |
| `fatal` | `catalog.fatal(...)`   | Unrecoverable failures             |

Each method supports event-name-first, object-style, and event-only:

```ts
catalog.info("user.created", { userId: "usr_abc123" }); // event-name-first
catalog.info({ userId: "usr_abc123", message: "User created" }); // object-style
catalog.info("app.started"); // event only
```

Set `level` to the minimum level to emit — events below it are dropped.

## Child Loggers

Use `.child()` to bind context that appears in every log entry:

```ts
const reqLog = catalog.child({ requestId: crypto.randomUUID() });
reqLog.info("request.handled", { path: "/api/users" });
// Includes "requestId": "uuid-..."
```

Use `.scope(name)` for module-scoped logging:

```ts
const dbLog = catalog.scope("database");
dbLog.warn("query.slow", { query: "SELECT ..." });
// Includes "module": "database"
```

Child loggers inherit all parent options (redaction, mixin, transport, etc.).

## Transport

### Single Transport

```ts
const catalog = createCatalog({
  service: "my-app",
  transport: {
    target: "pino/file",
    options: { destination: "./logs/app.log", mkdir: true },
  },
});
```

### Multi-Transport (array of targets)

```ts
const catalog = createCatalog({
  service: "my-app",
  transport: [
    { target: "pino/file", options: { destination: "./logs/app.log" } },
    { target: "pino-roll", options: { file: "./logs/out.log", frequency: "daily", mkdir: true } },
  ],
});
```

### Development Pretty-Print

```ts
const catalog = createCatalog({
  service: "my-app",
  transport:
    process.env.NODE_ENV === "production"
      ? { target: "pino/file", options: { destination: "./logs/app.log" } }
      : { target: "pino-pretty", options: { colorize: true } },
});
```

## Redaction

Catalog automatically redacts a comprehensive set of sensitive field names (case-insensitive, recursive):

`password`, `passwordHash`, `secret`, `apiKey`, `apiSecret`, `token`, `accessToken`, `refreshToken`, `idToken`, `ssn`, `taxId`, `passportNumber`, `driverLicense`, `phone`, `phoneNumber`, `mobile`, `email`, `emailAddress`, `accountNumber`, `routingNumber`, `iban`, `swift`, `cardNumber`, `cvv`, `cvc`, `expiryDate`, `pin`, `bvn`, `nin`, `bvnHash`, `ninHash`, `ip`, `ipAddress`, `userAgent`, `firstName`, `lastName`, `fullName`, `dateOfBirth`, `dob`, `address`, `location`, `otp`, `securityAnswer`

Add extra fields with the `redact` option:

```ts
const catalog = createCatalog({
  service: "secure-app",
  redact: ["authorization", "x-api-key"],
});
```

For path-level control, use Pino's built-in `redactPaths`:

```ts
const catalog = createCatalog({
  service: "secure-app",
  redactPaths: ["user.ssn", "headers.authorization"],
});
```

## `safeError()`

Converts an `Error` into a plain object safe for API responses — strips stack traces:

```ts
import { safeError, createCatalog } from "@joinremba/catalog";

try {
  await riskyOperation();
} catch (err) {
  catalog.error("operation.failed", safeError(err));
  return Response.json(safeError(err), { status: 500 });
}
```

Output: `{ "message": "...", "name": "Error", "code": "ECONNREFUSED" }`

## `requestId` Mixin

Use the `mixin` option to inject request context into every log entry:

```ts
const catalog = createCatalog({
  service: "my-api",
  mixin: () => ({ requestId: crypto.randomUUID() }),
});

// Every log includes requestId
catalog.info("request.started", { path: req.url });
```

Child loggers inherit and extend the mixin:

```ts
const child = catalog.child({ userId: "usr_42" });
child.info("user.action"); // includes both requestId and userId
```

## Error Event Layer

Use event-name conventions to build a consistent error taxonomy:

```ts
catalog.error("db.connection_failed", { database: "users", error: safeError(err) });
catalog.error("payment.declined", { provider: "stripe", reason: "insufficient_funds" });
catalog.fatal("system.out_of_memory", { heapUsed: process.memoryUsage().heapUsed });
```

Framework adapters map HTTP status to log level automatically:

| Status Range | Log Level |
| ------------ | --------- |
| 200–399      | `info`    |
| 400–499      | `warn`    |
| 500+         | `error`   |

## Integration with `@joinremba/core`

Pass a `Client` instance for cloud log ingestion. Logs buffer locally and flush remotely:

```ts
import { createCatalog } from "@joinremba/catalog";
import { createClient } from "@joinremba/core";

const client = createClient({ apiKey: process.env.REMBA_API_KEY });

const catalog = createCatalog({
  service: "my-api",
  environment: "production",
  client, // enables remote ingestion
  transport: { target: "pino-roll", options: { file: "./logs/out.log", frequency: "daily" } },
});

catalog.info("user.created", { userId: "usr_abc123" });
// Flushes every 100 events or on process exit
```

## Sub-Modules

### Audit

```ts
import { auditLogger } from "@joinremba/catalog/audit";
const audit = auditLogger(catalog);
audit.log({
  action: "user.role_changed",
  actor: "admin@company.com",
  resource: "user",
  resourceId: "usr_abc123",
  outcome: "success",
  details: { fromRole: "viewer", toRole: "admin" },
});
```

### Security

```ts
import { securityLogger } from "@joinremba/catalog/security";
const security = securityLogger(catalog);
security.log({
  action: "login.failed",
  actor: "user@example.com",
  ip: "203.0.113.42",
  severity: "critical",
  details: { attemptCount: 5 },
});
```

### Webhook Forwarding

```ts
import { webhookLogger } from "@joinremba/catalog/webhook";
const webhook = webhookLogger(catalog, {
  targets: [{
    url: "https://hooks.example.com/logs",
    level: "warn",
    headers: { Authorization: "Bearer tok_xxx" },
    secret: "whsec_xxx",
  }],
  batchIntervalMs: 5000,
  maxBatchSize: 50,
  retryCount: 2,
});
webhook.warn("rate_limit.exceeded", { userId: "usr_42" });
webhook.stop(); // flush remaining on shutdown
```

### OpenTelemetry Bridge

```ts
import { otelBridge } from "@joinremba/catalog/otel";
const otelCatalog = otelBridge(catalog, {
  api: trace, // from @opentelemetry/api
  captureSpanEvents: true,
});
otelCatalog.info("user.created", { userId: "usr_abc123" });
// Every log includes trace_id and span_id
```

### Log Sampling

```ts
import { samplingCatalog } from "@joinremba/catalog/sampling";
const sampled = samplingCatalog(catalog, {
  rate: 0.1, // log 10% of events
  level: "debug",
});
```

## Framework Adapters

### Hono

```ts
import { requestIdMiddleware, httpLoggerMiddleware } from "@joinremba/catalog/adapters/hono";
app.use("*", requestIdMiddleware(catalog));
app.use("*", httpLoggerMiddleware(catalog, { excludePaths: ["/health"] }));
```

### Express

```ts
import { requestIdMiddleware, httpLoggerMiddleware } from "@joinremba/catalog/adapters/express";
app.use(requestIdMiddleware(catalog));
app.use(httpLoggerMiddleware(catalog));
```

### Fastify

```ts
import { requestIdHook, httpLoggerHook } from "@joinremba/catalog/adapters/fastify";
fastify.addHook("onRequest", requestIdHook(catalog));
fastify.addHook("onRequest", httpLoggerHook(catalog));
```

## Configuration Reference

| Option          | Type                                                     | Default       | Description                                          |
| --------------- | -------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| `service`       | `string`                                                 | **(required)** | Service name included as `name` in every log entry. |
| `environment`   | `string`                                                 | —             | Environment tag (e.g. `"production"`).               |
| `level`         | `LogLevel`                                               | `"info"`      | Minimum log level to emit.                           |
| `redact`        | `string[]`                                               | —             | Extra sensitive field names to redact (case-insensitive). |
| `redactPaths`   | `string[]`                                               | —             | Pino path-based redact patterns (e.g. `"user.ssn"`). |
| `transport`     | `TransportOptions \| TransportOptions[]`                 | stdout        | Pino transport config object or array of targets.    |
| `destination`   | `PinoDestination`                                        | —             | Custom writable stream (overrides `transport`).      |
| `mixin`         | `() => Record<string, unknown>`                          | —             | Function returning extra fields to merge into every log. |
| `base`          | `Record<string, unknown>`                                | —             | Static base fields for every log entry.              |
| `client`        | `Client`                                                 | —             | `@joinremba/core` client for cloud log ingestion.    |

## TypeScript

All types are exported from the package root:

```ts
import type { Catalog, CatalogOptions, LogLevel, TransportOptions, PinoDestination } from "@joinremba/catalog";
```

| Type               | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `Catalog`          | Logger instance returned by `createCatalog`.                   |
| `CatalogOptions`   | Input options for `createCatalog`.                             |
| `LogLevel`         | `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal"` |
| `TransportOptions` | `{ target: string; options?: Record<string, unknown> }`        |
| `PinoDestination`  | `{ write: (data: string \| Uint8Array) => void }`              |

Subpackage types:

```ts
import type { AuditEvent } from "@joinremba/catalog/audit";
import type { SecurityEvent } from "@joinremba/catalog/security";
import type { WebhookOptions, WebhookTarget } from "@joinremba/catalog/webhook";
import type { OtelBridgeOptions } from "@joinremba/catalog/otel";
import type { SamplingOptions } from "@joinremba/catalog/sampling";
import type { HonoRequestIdOptions, HttpLogOptions } from "@joinremba/catalog/adapters/hono";
import type { ExpressRequestIdOptions } from "@joinremba/catalog/adapters/express";
import type { FastifyRequestIdOptions } from "@joinremba/catalog/adapters/fastify";
```

## Package Exports

| Path                                | Contents                       |
| ----------------------------------- | ------------------------------ |
| `@joinremba/catalog`                | Main `createCatalog` + types   |
| `@joinremba/catalog/audit`          | `auditLogger` + `AuditEvent`   |
| `@joinremba/catalog/security`       | `securityLogger` + `SecurityEvent` |
| `@joinremba/catalog/webhook`        | `webhookLogger` + types        |
| `@joinremba/catalog/otel`           | `otelBridge` + types           |
| `@joinremba/catalog/sampling`       | `samplingCatalog` + types      |
| `@joinremba/catalog/adapters/hono`  | Hono middleware                |
| `@joinremba/catalog/adapters/express` | Express middleware           |
| `@joinremba/catalog/adapters/fastify` | Fastify hooks              |

## Related Packages

- [@joinremba/core](https://github.com/joinremba/core) — Cloud log ingestion client.
- [@joinremba/beacon](https://github.com/joinremba/beacon) — Environment validation, config, secrets, and feature gates.
- [@joinremba/gate](https://github.com/joinremba/gate) — API safety layer: validation, responses, idempotency, rate limiting, and API keys.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
