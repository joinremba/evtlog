# @remba/catalog

Production-ready logging and error event layer for TypeScript backends, built on Pino.

## Commands

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `bun test`          | Run tests                                           |
| `bun run typecheck` | TypeScript type checking (`tsc --noEmit`)           |
| `bun run lint`      | ESLint                                              |
| `bun run format`    | Prettier formatting                                 |
| `bun run check`     | All checks (lint + format:check + typecheck + test) |
| `bun run build`     | Build to `dist/`                                    |

## Stack

- TypeScript 6 (strict), Bun runtime, Pino
- ESLint 8 + Prettier for code quality
- `bun:test` for testing (no third-party test framework)

## Key Patterns

- All source code lives in `src/`.
- Tests are colocated with source files as `*.test.ts` (e.g. `src/index.test.ts`).
- Built on top of **Pino** (`pino` runtime dependency) with optional `pino-pretty` for development.
- Focus on production logging patterns: structured JSON, redaction, multi-transport, request context correlation.
- No `any` types in source code (enforced by ESLint rule `@typescript-eslint/no-explicit-any: error`).
- Use `bun` for all package management and script execution — never `npm`, `npx`, or `yarn`.

## npm Publishing

- `package.json` is preconfigured with `"publishConfig": { "access": "public" }`.
- CI publishes to npm automatically when a `v*` tag is pushed (see `.github/workflows/publish.yml`).
- Publishing uses `npm publish --provenance` for attestation.
- An `NPM_TOKEN` secret must be configured in the GitHub repository settings.

## Config Reference

| Field                | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| Runtime dependencies | `pino` (required), `pino-pretty` (optional, dev)                |
| Licence              | MIT                                                             |
| Engines              | `bun >= 1.3.1`                                                  |
| Test runner          | `bun:test` (built-in)                                           |
| TypeScript           | Strict mode, `verbatimModuleSyntax`, `noUncheckedIndexedAccess` |
