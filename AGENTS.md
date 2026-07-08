## Commands

```bash
bun test                  # Run all tests
bun run typecheck         # TypeScript check (tsc --noEmit)
bun run format            # Prettier
bun run lint              # ESLint
bun run check             # All checks: lint + format:check + typecheck + test
bun run build             # Build to dist/
```

## Architecture

- **`evtlog`** — Production-ready logging and error event layer for TypeScript backends, built on Pino.
- **`src/index.ts`** — `createEvtlog(options)` → returns `Evtlog` with `trace|debug|info|warn|error|fatal` log methods, `child()`, `scope()`, `withContext()`.
- **`src/audit.ts`** — Audit event logger (`auditLogger(evtlog)`).
- **`src/security.ts`** — Security event logger (`securityLogger(evtlog)`).
- **`src/webhook.ts`** — Webhook log forwarding with HMAC SHA-256 signing and batching.
- **`src/otel.ts`** — OpenTelemetry bridge injecting trace context into log entries.
- **`src/sampling.ts`** — Deterministic log sampling.
- **`src/env-transport.ts`** — Environment-aware transport auto-configuration (pino-roll for production).
- **`src/adapters/`** — Framework adapters: Hono, Express, Fastify (request ID + HTTP logging middleware).

## Patterns

- **Named exports only** (no `export default` except `index.ts` which defaults to `createEvtlog`).
- **Event-name-first API** — `evtlog.info("event.name", { data })` wraps Pino internally.
- **Built-in redaction** — 40+ sensitive field names redacted recursively, case-insensitively from all log output.
- **Framework adapters are independent** — each receives a Evtlog instance; no framework coupling.
- **Cloud batching** — When `client` is provided, events are buffered and flushed via `client.ingestLogs()`.
- **All source in `src/`**, tests colocated: `src/*.test.ts`.
