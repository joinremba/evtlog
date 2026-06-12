# @joinremba/catalog

Production-ready logging and error event layer for TypeScript backends, built on Pino.

## Commands

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `bun test`          | Run tests                              |
| `bun run typecheck` | `tsc --noEmit`                         |
| `bun run lint`      | ESLint                                 |
| `bun run format`    | Prettier                               |
| `bun run check`     | lint + format:check + typecheck + test |
| `bun run build`     | Build to `dist/`                       |

## Stack

- TypeScript 6 (strict), Bun runtime
- Pino ^10.3.1 (runtime), pino-roll ^4.0.0 (runtime), pino-pretty ^13.1.3 (dev)
- ESLint 8 + Prettier for code quality

## Key API

- `createCatalog(options)` — Main export. Returns a Catalog instance.
- `catalog.info("event.name", { data })` — Event-name-first logging.
- `catalog.child({ requestId })` — Creates child logger with bound context.
- `catalog.level` — Current log level.

## Patterns

- All source in `src/`
- Tests colocated with source: `src/*.test.ts`
- Event-name-first API wraps Pino internally
- Redaction via Pino's built-in path-based redact
- `pino-roll` for production rolling file transport

## npm Publishing

- `publishConfig.access: public`
- CI publishes on `v*` tags via `npm publish --provenance`
- `NPM_TOKEN` secret required in GitHub

## Config Reference

| Field        | Value                |
| ------------ | -------------------- |
| Package name | `@joinremba/catalog` |
| Licence      | MIT                  |
| Engine       | `bun >=1.3.1`        |
| Runtime deps | pino, pino-roll      |
