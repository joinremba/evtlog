# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release
- Event-name-first logging (`catalog.info("event.name", { data })`)
- Standard Pino object logging (`catalog.info({ userId, action })`) — auto-detected from arg type
- Built-in sensitive field redaction (`password`, `email`, `token`, `ssn`, etc.)
- Child loggers with bound context (`catalog.child({ requestId })`)
- Multi-transport support (`pino/file`, `pino-pretty`, `pino-roll`, etc.)
- Error serializers (`err` and `error` keys auto-serialized)
- `mixin()` option for context injection (e.g. request ID from Hono)
- `redactPaths` for Pino path-based redaction
- Pino-based structured JSON logging
- Sensitive data redaction from log output
- Multi-transport support (console, file, rolling file)
- Request context correlation
- Environment-aware configuration (pretty in dev, JSON in prod)
