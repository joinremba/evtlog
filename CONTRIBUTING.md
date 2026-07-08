# Contributing to @joinremba/catalog

Thank you for your interest in contributing to `@joinremba/catalog`! We welcome contributions from everyone, whether it is a bug report, feature suggestion, or a pull request.

## Code of Conduct

Please note that this project is governed by a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold its standards. Please report unacceptable behaviour to the maintainers.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.1 or later
- [Git](https://git-scm.com/)

### Setup

1. Fork the repository on GitHub.
2. Clone your fork:

   ```sh
   git clone https://github.com/your-username/catalog.git
   cd catalog
   ```

3. Install dependencies:

   ```sh
   bun install
   ```

4. Create a branch for your work:

   ```sh
   git checkout -b feature/your-feature-name
   ```

## Development Commands

| Command             | Description                                         |
| ------------------- | --------------------------------------------------- |
| `bun test`          | Run tests                                           |
| `bun run typecheck` | TypeScript type checking (`tsc --noEmit`)           |
| `bun run lint`      | ESLint                                              |
| `bun run format`    | Prettier formatting                                 |
| `bun run check`     | All checks (lint + format:check + typecheck + test) |
| `bun run build`     | Build to `dist/`                                    |

## Code Style

- Code formatting is enforced by [Prettier](https://prettier.io/) using the project's `.prettierrc`.
- Linting is enforced by [ESLint](https://eslint.org/) with strict TypeScript rules.
- Use **strict TypeScript** — the `tsconfig.json` enables all strict checks.
- The `any` type is **forbidden** by ESLint (`@typescript-eslint/no-explicit-any: error`). Exceptions are made in test files.
- Always use `bun` as the package manager. Never use `npm`, `npx`, or `yarn`.
- Use `import type` for type-only imports (`@typescript-eslint/consistent-type-imports: error`).

## Testing Guidelines

- Write tests for all new functionality and bug fixes.
- Place tests alongside source files using the `*.test.ts` convention (e.g. `src/logger.test.ts`).
- Use `bun:test` (the built-in Bun test runner) — no third-party test framework is needed.
- Aim for high coverage on logger creation paths and redaction patterns.
- Run `bun test` locally before submitting a pull request.

## Pull Request Process

1. Ensure `bun run check` passes — this runs lint, format check, typecheck, and tests.
2. Keep pull requests focused — one feature or bug fix per PR.
3. Write a clear PR description explaining the motivation and approach taken.
4. Update the README if the public API changes.
5. Add or update tests to cover your changes.
6. Request review from the repository maintainers.
7. Address any review feedback promptly.

## Conventional Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
type(scope): description
```

Types include: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `ci`.

Examples:

- `feat(catalog): add file transport rotation support`
- `fix(catalog): handle undefined redact paths gracefully`
- `docs(catalog): update API reference in README`
- `test(catalog): add coverage for multi-transport config`

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

- A clear description of the expected behaviour vs actual behaviour.
- Steps to reproduce the issue, including a minimal code snippet if possible.
- Environment details (Bun version, OS, package version).

### Feature Requests

When requesting a feature, please describe:

- The problem you are trying to solve.
- The proposed solution or API you have in mind.
- Any alternatives you have considered.

## Getting Help

If you have questions or need help, please open a [discussion](https://github.com/joinremba/catalog/discussions) or create an issue on GitHub.

## Publishing

This package is published to npm under the `@joinremba` scope.

### Prerequisites

- You need npm publishing rights for the `@joinremba` organisation.
- You need a valid npm OTP (one-time password) for 2FA.

### Release process

1. Update the version in `package.json` and `CHANGELOG.md` following [Semantic Versioning](https://semver.org/).
2. Commit and tag the release:
   ```sh
   git commit -m "chore: release v<version>"
   git tag v<version>
   git push && git push --tags
   ```
3. Build and publish with provenance:
   ```sh
   bun run build
   bun publish --provenance
   ```
   The `--provenance` flag attaches [npm provenance](https://docs.npmjs.com/generating-provenance-statements) to the published package, linking it to the GitHub Actions workflow that published it. This requires:
   - The publish to run in GitHub Actions (not locally)
   - The workflow to have `id-token: write` permission
   - The repository to be public

### Local publish (no provenance)

If you must publish locally (not recommended):

```sh
bun publish
```

## License

By contributing, you agree that your contributions will be licensed under the MIT Licence as described in [LICENSE](LICENSE).
