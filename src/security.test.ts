import { expect, test } from "bun:test";
import { createCatalog } from "./index";
import { securityLogger } from "./security";

test("securityLogger logs without throwing", () => {
  const catalog = createCatalog({ service: "test" });
  const log = securityLogger(catalog);

  expect(() =>
    log.log({
      action: "user.login",
      actor: "admin@example.com",
      severity: "high",
    })
  ).not.toThrow();
});

test("securityLogger includes all fields", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "test",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const log = securityLogger(catalog);

  log.log({
    action: "api.key_created",
    actor: "user-42",
    ip: "10.0.0.1",
    userAgent: "curl/8.0",
    details: { keyName: "deploy-key" },
    severity: "medium",
  });

  const entry = lines[0]!;
  expect(entry.msg).toBe("security.api.key_created");
  expect(entry.security).toBe(true);
  expect(entry.actor).toBe("user-42");
  expect(entry.severity).toBe("medium");
});
