---
name: Bug report
about: Create a report to help us improve
title: ""
labels: bug
assignees: ""
---

## Describe the bug

A clear and concise description of what the bug is.

## To Reproduce

Steps to reproduce the behaviour:

1. Create a logger with `...` options
2. Call `log.info(...)` with the following data
3. Observe the incorrect output

```ts
// Code snippet that reproduces the issue
import { createLogger } from "@joinremba/catalog";

const log = createLogger({ ... });
log.info({ ... });
```

## Expected behaviour

A clear and concise description of what you expected to happen.

## Environment

- Bun version: [e.g. 1.3.1]
- OS: [e.g. macOS 14, Ubuntu 22.04, Windows 11]
- Package version: [e.g. 0.1.0]

## Additional context

Add any other context about the problem here.
