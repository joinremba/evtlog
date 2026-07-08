# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `evtlog`, please report it by emailing **bensxnisaac@gmail.com**. Do not open a public issue for security-related reports.

You can also report vulnerabilities privately through the GitHub Security Advisory tab at https://github.com/joinremba/evtlog/security/advisories.

We aim to acknowledge receipt of your report within 48 hours and provide a timeline for a fix within 5 business days.

## Supported Versions

Only the latest published version of `evtlog` receives security updates. We do not backport fixes to older versions. Please ensure you are always using the most recent release.

## Security Best Practices

### Avoid logging sensitive data

Even with built-in redaction support, you should never intentionally log sensitive information such as passwords, API keys, credit card numbers, or personal data. The redaction feature is a defence-in-depth measure, not a substitute for careful coding.

### Use redact patterns

Always configure the `redact` option when creating a logger to strip known sensitive fields:

```ts
const log = createCatalog({
  service: "my-app",
  redact: ["password", "authorization", "creditCard", "ssn", "secret"],
});
```

### Keep dependencies updated

Regularly update `pino` and `evtlog` to the latest versions to receive security patches. Use `bun update` to check for updates.

### Review log output in production

Monitor and audit your production log output to ensure no sensitive data is leaking. Consider using log shippers that support additional redaction or filtering at the transport layer.
