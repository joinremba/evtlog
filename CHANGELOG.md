# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.0] — 2026-06-21

### Added

- Runtime level setter — `evtlog.level = "debug"` changes log level on the fly
- `withContext(fn)` — lazy per-log context injection via mixin, designed for AsyncLocalStorage
- `envTransport("production", { retention: { maxFiles: 14, maxSize: "500MB" } })` — retention options for pino-roll

### Fixed

- `withContext()` context data now passes through `redactFields` for consistent redaction
- Child loggers created via `withContext` properly call `enqueue` for remote log ingestion

## [0.4.0] — 2026-06-13

### Added

- `client?: Client` option to `createEvtlog()` for cloud log ingestion
- Automatic log batching — events are buffered and flushed to `client.ingestLogs()` when buffer reaches 100 events or on process exit
- Cloud ingestion client dependency — type-safe client for cloud features

## [0.3.0] — 2026-06-12

### Added

- Security event logging (`evtlog/security`) — structured security events with severity levels
- Audit event logging (`evtlog/audit`) — action audit trail with actor, resource, outcome
- Webhook event module (`evtlog/webhook`) — batch-sends log events to webhook endpoints with configurable targets, level filtering, retry, and HMAC signing
- Hono request ID middleware (`evtlog/adapters/hono`) — auto-generates or preserves `x-request-id`
- Hono HTTP request/response logger middleware — method, path, status, duration, query, user-agent
- Express adapter (`evtlog/adapters/express`) — `requestIdMiddleware` and `httpLoggerMiddleware`
- Fastify adapter (`evtlog/adapters/fastify`) — `requestIdHook` and `httpLoggerHook`
- OpenTelemetry bridge (`evtlog/otel`) — injects `trace_id` and `span_id` from active span into log entries, optional span events
- Log sampling (`evtlog/sampling`) — deterministic sampling via hash-based sampler, level-based filtering
- Dual API: event-name-first (`evtlog.info("event", { data })`) and standard Pino object logging
- Built-in sensitive field redaction (`password`, `email`, `token`, `ssn`, etc.)
- Child loggers with bound context (`evtlog.child({ requestId })`)
- Multi-transport support (`pino/file`, `pino-pretty`, `pino-roll`, etc.)
- Error serializers (`err` and `error` keys auto-serialized)
- `mixin()` option for context injection
- `redactPaths` for Pino path-based redaction
- Environment-aware configuration (pretty in dev, JSON in prod)

## [0.2.0] — 2026-06-12

### Added

- Security event logging module (`evtlog/security`) — structured security events with actor, IP, user-agent, severity
- Audit event logging module (`evtlog/audit`) — action audit trail with actor, resource, resourceId, outcome
- Hono request ID middleware (`evtlog/adapters/hono`) — generates or preserves `x-request-id`
- Hono HTTP request/response logger middleware — logs method, path, query, user-agent, status, duration
- Package exports for sub-module imports (`evtlog/audit`, `evtlog/security`, `evtlog/adapters/hono`)

### Fixed

- Hono adapter types — replaced `any` context type with explicit `HonoContext` interface
