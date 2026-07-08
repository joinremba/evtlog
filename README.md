# evtlog

[![npm version](https://img.shields.io/npm/v/evtlog)](https://www.npmjs.com/package/evtlog)
[![License](https://img.shields.io/npm/l/evtlog)](LICENSE)
[![CI](https://github.com/joinremba/evtlog/actions/workflows/ci.yml/badge.svg)](https://github.com/joinremba/evtlog/actions/workflows/ci.yml)
[![Bun](https://img.shields.io/badge/bun-1.3%2B-%23ffc83d?logo=bun)](https://bun.sh)

Production-ready logging and error event layer for TypeScript backends, built on [Pino](https://getpino.io/).

## Features

- **Event-name-first API** — `evtlog.info("user.created", { userId })` for consistent, searchable log events.
- **Pino under the hood** — Ultra-fast structured JSON logging with full Pino transport ecosystem.
- **Automatic sensitive data redaction** — Built-in denylist of PII, secrets, and credentials (email, phone, SSN, API keys, tokens, etc.), plus configurable path patterns.
- **Multi-transport** — Single transport or array of targets for console, file, rolling files (pino-roll), or external sinks.
- **`envTransport()`** — Auto-configure file transport per environment with zero config.
- **Child loggers** — `.child()` and `.scope()` for request-scoped and module-scoped context binding.
- **Error serialization** — `safeError()` helper strips internals from `Error` objects for safe API responses.
- **Framework adapters** — First-class support for Hono, Express, and Fastify.
- **Audit & Security events** — Structured modules for audit trails and security event logging.
- **Webhook forwarding** — Batch log delivery to external webhook endpoints with retry and HMAC signing.
- **OpenTelemetry bridge** — Correlate logs with active span context.
- **Log sampling** — Deterministic or custom sampling to control volume.
- **Cloud log ingestion** — Optional client for remote log batching.
- **Strict TypeScript** — Full type exports for `Evtlog`, `EvtlogOptions`, `LogLevel`, and more.

## Installation

```sh
bun add evtlog
```

Requires **Bun >= 1.3.1**.

## Quick Start

```ts
import { createEvtlog } from "evtlog";

const evtlog = createEvtlog({
  service: "my-api",
  environment: process.env.NODE_ENV ?? "development",
  level: "info",
});

evtlog.info("app.started", { port: 3000 });
evtlog.info("user.created", { userId: "usr_abc123" });
evtlog.error("payment.failed", { amount: 4999, currency: "USD" });
```

Output is newline-delimited JSON (NDJSON) written to stdout by default. Pipe through `pino-pretty` for dev:

```sh
bun run start | bunx pino-pretty
```

## Log Levels

| Level   | Method              | Usage                             |
| ------- | ------------------- | --------------------------------- |
| `trace` | `evtlog.trace(...)` | Diagnostic detail during dev      |
| `debug` | `evtlog.debug(...)` | Development debugging             |
| `info`  | `evtlog.info(...)`  | Normal operational events         |
| `warn`  | `evtlog.warn(...)`  | Unexpected but handled situations |
| `error` | `evtlog.error(...)` | Recoverable errors                |
| `fatal` | `evtlog.fatal(...)` | Unrecoverable failures            |

Each method supports event-name-first, object-style, and event-only:

```ts
evtlog.info("user.created", { userId: "usr_abc123" }); // event-name-first
evtlog.info({ userId: "usr_abc123", message: "User created" }); // object-style
evtlog.info("app.started"); // event only
```

Set `level` to the minimum level to emit — events below it are dropped.

## Child Loggers

Use `.child()` to bind context that appears in every log entry:

```ts
const reqLog = evtlog.child({ requestId: crypto.randomUUID() });
reqLog.info("request.handled", { path: "/api/users" });
// Includes "requestId": "uuid-..."
```

Use `.scope(name)` for module-scoped logging:

```ts
const dbLog = evtlog.scope("database");
dbLog.warn("query.slow", { query: "SELECT ..." });
// Includes "module": "database"
```

Child loggers inherit all parent options (redaction, mixin, transport, etc.).

## Transport

### Single Transport

```ts
const evtlog = createEvtlog({
  service: "my-app",
  transport: {
    target: "pino/file",
    options: { destination: "./logs/app.log", mkdir: true },
  },
});
```

### Multi-Transport (array of targets)

```ts
const evtlog = createEvtlog({
  service: "my-app",
  transport: [
    { target: "pino/file", options: { destination: "./logs/app.log" } },
    { target: "pino-roll", options: { file: "./logs/out.log", frequency: "daily", mkdir: true } },
  ],
});
```

### Environment-Aware Transport (`envTransport()`)

Use `envTransport()` to automatically configure the right transport per `NODE_ENV`:

```ts
import { createEvtlog, envTransport } from "evtlog";

const evtlog = createEvtlog({
  service: "my-api",
  ...envTransport(),
});
```

| NODE_ENV      | Transport           | Output                  | Level  |
| ------------- | ------------------- | ----------------------- | ------ |
| `development` | `pino/file`         | `./logs/dev.log`        | debug  |
| `test`        | (none)              | silent                  | silent |
| `staging`     | `pino/file`         | `./logs/staging.log`    | info   |
| `production`  | `pino-roll` (daily) | `./logs/production.log` | info   |

Override the environment explicitly:

```ts
const evtlog = createEvtlog({
  service: "my-api",
  ...envTransport("production"),
});
```

Import from the subpath:

```ts
import { envTransport } from "evtlog/env-transport";
```

## Redaction

Evtlog automatically redacts a comprehensive set of sensitive field names (case-insensitive, recursive):

`password`, `passwordHash`, `secret`, `apiKey`, `apiSecret`, `token`, `accessToken`, `refreshToken`, `idToken`, `ssn`, `taxId`, `passportNumber`, `driverLicense`, `phone`, `phoneNumber`, `mobile`, `email`, `emailAddress`, `accountNumber`, `routingNumber`, `iban`, `swift`, `cardNumber`, `cvv`, `cvc`, `expiryDate`, `pin`, `bvn`, `nin`, `bvnHash`, `ninHash`, `ip`, `ipAddress`, `userAgent`, `firstName`, `lastName`, `fullName`, `dateOfBirth`, `dob`, `address`, `location`, `otp`, `securityAnswer`

Add extra fields with the `redact` option:

```ts
const evtlog = createEvtlog({
  service: "secure-app",
  redact: ["authorization", "x-api-key"],
});
```

For path-level control, use Pino's built-in `redactPaths`:

```ts
const evtlog = createEvtlog({
  service: "secure-app",
  redactPaths: ["user.ssn", "headers.authorization"],
});
```

## `safeError()`

Converts an `Error` into a plain object safe for API responses — strips stack traces:

```ts
import { safeError, createEvtlog } from "evtlog";

try {
  await riskyOperation();
} catch (err) {
  evtlog.error("operation.failed", safeError(err));
  return Response.json(safeError(err), { status: 500 });
}
```

Output: `{ "message": "...", "name": "Error", "code": "ECONNREFUSED" }`

## `requestId` Mixin

Use the `mixin` option to inject request context into every log entry:

```ts
const evtlog = createEvtlog({
  service: "my-api",
  mixin: () => ({ requestId: crypto.randomUUID() }),
});

// Every log includes requestId
evtlog.info("request.started", { path: req.url });
```

Child loggers inherit and extend the mixin:

```ts
const child = evtlog.child({ userId: "usr_42" });
child.info("user.action"); // includes both requestId and userId
```

## Error Event Layer

Use event-name conventions to build a consistent error taxonomy:

```ts
evtlog.error("db.connection_failed", { database: "users", error: safeError(err) });
evtlog.error("payment.declined", { provider: "stripe", reason: "insufficient_funds" });
evtlog.fatal("system.out_of_memory", { heapUsed: process.memoryUsage().heapUsed });
```

Framework adapters map HTTP status to log level automatically:

| Status Range | Log Level |
| ------------ | --------- |
| 200–399      | `info`    |
| 400–499      | `warn`    |
| 500+         | `error`   |

## Sub-Modules

### Audit

```ts
import { auditLogger } from "evtlog/audit";
const audit = auditLogger(evtlog);
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
import { securityLogger } from "evtlog/security";
const security = securityLogger(evtlog);
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
import { webhookLogger } from "evtlog/webhook";
const webhook = webhookLogger(evtlog, {
  targets: [
    {
      url: "https://hooks.example.com/logs",
      level: "warn",
      headers: { Authorization: "Bearer tok_xxx" },
      secret: "whsec_xxx",
    },
  ],
  batchIntervalMs: 5000,
  maxBatchSize: 50,
  retryCount: 2,
});
webhook.warn("rate_limit.exceeded", { userId: "usr_42" });
webhook.stop(); // flush remaining on shutdown
```

### OpenTelemetry Bridge

```ts
import { otelBridge } from "evtlog/otel";
const otelEvtlog = otelBridge(evtlog, {
  api: trace, // from @opentelemetry/api
  captureSpanEvents: true,
});
otelEvtlog.info("user.created", { userId: "usr_abc123" });
// Every log includes trace_id and span_id
```

### Log Sampling

```ts
import { samplingEvtlog } from "evtlog/sampling";
const sampled = samplingEvtlog(evtlog, {
  rate: 0.1, // log 10% of events
  level: "debug",
});
```

## Centralized Logging (Microservices)

When running multiple services, you need a way to view logs from all of them in one place. Two approaches:

### 1. Webhook Aggregator

Each service forward logs to a central receiver using `evtlog/webhook`. The receiver collects logs from all services and writes them to a shared sink.

```ts
// Each microservice:
import { createEvtlog } from "evtlog";
import { webhookLogger } from "evtlog/webhook";

const evtlog = createEvtlog({
  service: "user-service", // different name per service
  environment: "production",
  ...envTransport(),
});

const webhook = webhookLogger(evtlog, {
  targets: [
    {
      url: "https://logs.internal:4000/ingest", // central receiver
      level: "warn", // only warns and above
      secret: process.env.WEBHOOK_SECRET!, // HMAC signing
    },
  ],
  batchIntervalMs: 5000,
  maxBatchSize: 50,
});
```

The central receiver can be a simple Hono/Express server that writes to a shared file, Loki, Elasticsearch, or any other sink.

### 2. File + Log Shipper

Each service writes to a local file. A log shipper (Vector, Filebeat, Fluentd, or Promtail) tails each file and forwards to a central store (Loki, Elasticsearch, ClickHouse).

```ts
// Each service writes its own file:
const evtlog = createEvtlog({
  service: "payment-service", // identifies the source
  environment: "production",
  ...envTransport("production"), // → ./logs/production.log
});
```

On each host, run:

```bash
# Example: Promtail → Loki
promtail --config.file=/etc/promtail.yml
```

Where `promtail.yml` tails `./logs/*.log` and adds `service` and `host` labels.

## Error Alerting

Evtlog does not include built-in alerting, but it provides the hooks to trigger alerts:

### Via Webhook Forwarding

Use `evtlog/webhook` to send errors to any alert endpoint:

```ts
import { webhookLogger } from "evtlog/webhook";

const alerts = webhookLogger(evtlog, {
  targets: [
    {
      url: "https://hooks.pagerduty.com/integration/...",
      level: "error", // only errors and fatals
      headers: { Authorization: "Bearer tok_xxx" },
    },
    {
      url: "https://hooks.slack.com/services/...",
      level: "error",
    },
  ],
  batchIntervalMs: 2000, // alert quickly
  maxBatchSize: 5,
});

// Elsewhere in your code:
alerts.error("payment.provider_down", { provider: "stripe" });
// Delivered to PagerDuty + Slack within ~2 seconds
```

### Manual Error Tracking

For custom monitoring, pipe the NDJSON output to a log processor:

```bash
bun run start | grep '"level":50' | while read -r line; do
  curl -X POST https://alerts.example.com/error -d "$line"
done
```

Level values: `10`=trace, `20`=debug, `30`=info, `40`=warn, `50`=error, `60`=fatal.

## Framework Adapters

### Hono

```ts
import { requestIdMiddleware, httpLoggerMiddleware } from "evtlog/adapters/hono";
app.use("*", requestIdMiddleware(evtlog));
app.use("*", httpLoggerMiddleware(evtlog, { excludePaths: ["/health"] }));
```

### Express

```ts
import { requestIdMiddleware, httpLoggerMiddleware } from "evtlog/adapters/express";
app.use(requestIdMiddleware(evtlog));
app.use(httpLoggerMiddleware(evtlog));
```

### Fastify

```ts
import { requestIdHook, httpLoggerHook } from "evtlog/adapters/fastify";
fastify.addHook("onRequest", requestIdHook(evtlog));
fastify.addHook("onRequest", httpLoggerHook(evtlog));
```

## Configuration Reference

| Option        | Type                                     | Default        | Description                                               |
| ------------- | ---------------------------------------- | -------------- | --------------------------------------------------------- |
| `service`     | `string`                                 | **(required)** | Service name included as `name` in every log entry.       |
| `environment` | `string`                                 | —              | Environment tag (e.g. `"production"`).                    |
| `level`       | `LogLevel`                               | `"info"`       | Minimum log level to emit.                                |
| `redact`      | `string[]`                               | —              | Extra sensitive field names to redact (case-insensitive). |
| `redactPaths` | `string[]`                               | —              | Pino path-based redact patterns (e.g. `"user.ssn"`).      |
| `transport`   | `TransportOptions \| TransportOptions[]` | stdout         | Pino transport config object or array of targets.         |
| `destination` | `PinoDestination`                        | —              | Custom writable stream (overrides `transport`).           |
| `mixin`       | `() => Record<string, unknown>`          | —              | Function returning extra fields to merge into every log.  |
| `base`        | `Record<string, unknown>`                | —              | Static base fields for every log entry.                   |

## TypeScript

All types are exported from the package root:

```ts
import type { Evtlog, EvtlogOptions, LogLevel, TransportOptions, PinoDestination } from "evtlog";
```

| Type               | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| `Evtlog`           | Logger instance returned by `createEvtlog`.                    |
| `EvtlogOptions`    | Input options for `createEvtlog`.                              |
| `LogLevel`         | `"trace" \| "debug" \| "info" \| "warn" \| "error" \| "fatal"` |
| `TransportOptions` | `{ target: string; options?: Record<string, unknown> }`        |
| `PinoDestination`  | `{ write: (data: string \| Uint8Array) => void }`              |

Subpackage types:

```ts
import type { AuditEvent } from "evtlog/audit";
import type { SecurityEvent } from "evtlog/security";
import type { WebhookOptions, WebhookTarget } from "evtlog/webhook";
import type { OtelBridgeOptions } from "evtlog/otel";
import type { SamplingOptions } from "evtlog/sampling";
import type { EnvTransportResult } from "evtlog/env-transport";
import type { HonoRequestIdOptions, HttpLogOptions } from "evtlog/adapters/hono";
import type { ExpressRequestIdOptions } from "evtlog/adapters/express";
import type { FastifyRequestIdOptions } from "evtlog/adapters/fastify";
```

## Package Exports

| Path                      | Contents                           |
| ------------------------- | ---------------------------------- |
| `evtlog`                  | Main `createEvtlog` + types        |
| `evtlog/audit`            | `auditLogger` + `AuditEvent`       |
| `evtlog/security`         | `securityLogger` + `SecurityEvent` |
| `evtlog/webhook`          | `webhookLogger` + types            |
| `evtlog/otel`             | `otelBridge` + types               |
| `evtlog/sampling`         | `samplingEvtlog` + types           |
| `evtlog/env-transport`    | `envTransport`                     |
| `evtlog/adapters/hono`    | Hono middleware                    |
| `evtlog/adapters/express` | Express middleware                 |
| `evtlog/adapters/fastify` | Fastify hooks                      |

## Related Packages

- [envoker](https://github.com/joinremba/envoker) — Environment validation, config, secrets, and feature gates.
- [permcheck](https://github.com/joinremba/permcheck) — API safety layer: validation, responses, idempotency, rate limiting, and API keys.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
