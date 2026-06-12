# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Security event logging (`catalog/security`) — structured security events with severity levels
- Audit event logging (`catalog/audit`) — action audit trail with actor, resource, outcome
- Hono request ID middleware (`catalog/adapters/hono`) — auto-generates or preserves `x-request-id`
- Hono HTTP request/response logger middleware — method, path, status, duration, query, user-agent
- Dual API: event-name-first (`catalog.info("event", { data })`) and standard Pino object logging
- Built-in sensitive field redaction (`password`, `email`, `token`, `ssn`, etc.)
- Child loggers with bound context (`catalog.child({ requestId })`)
- Multi-transport support (`pino/file`, `pino-pretty`, `pino-roll`, etc.)
- Error serializers (`err` and `error` keys auto-serialized)
- `mixin()` option for context injection
- `redactPaths` for Pino path-based redaction
- Environment-aware configuration (pretty in dev, JSON in prod)

## [0.2.0] — 2026-06-12

### Added

- Security event logging module (`catalog/security`) — structured security events with actor, IP, user-agent, severity
- Audit event logging module (`catalog/audit`) — action audit trail with actor, resource, resourceId, outcome
- Hono request ID middleware (`catalog/adapters/hono`) — generates or preserves `x-request-id`
- Hono HTTP request/response logger middleware — logs method, path, query, user-agent, status, duration
- Package exports for sub-module imports (`catalog/audit`, `catalog/security`, `catalog/adapters/hono`)

### Fixed

- Hono adapter types — replaced `any` context type with explicit `HonoContext` interface
