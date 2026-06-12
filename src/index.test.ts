import { expect, test } from "bun:test";
import { createCatalog } from "./index";

test("creates a catalog instance", () => {
  const catalog = createCatalog({ service: "test-service" });
  expect(catalog).toBeDefined();
  expect(typeof catalog.info).toBe("function");
});

test("logs info with event name", () => {
  const catalog = createCatalog({ service: "test", level: "info" });
  expect(() => catalog.info("user.created", { userId: "42" })).not.toThrow();
});

test("logs error with event name", () => {
  const catalog = createCatalog({ service: "test", level: "error" });
  expect(() => catalog.error("payment.failed", { amount: 100 })).not.toThrow();
});

test("logs with just an event name (no data)", () => {
  const catalog = createCatalog({ service: "test" });
  expect(() => catalog.info("app.started")).not.toThrow();
});

test("respects log level", () => {
  const catalog = createCatalog({ service: "test", level: "warn" });
  expect(catalog.level).toBe("warn");
});

test("creates child logger with bound fields", () => {
  const catalog = createCatalog({ service: "app" });
  const child = catalog.child({ requestId: "abc-123" });
  expect(child).toBeDefined();
  expect(typeof child.info).toBe("function");
});

test("child logger logs without errors", () => {
  const catalog = createCatalog({ service: "app" });
  const child = catalog.child({ requestId: "abc-123" });
  expect(() => child.info("request.handled", { path: "/api" })).not.toThrow();
});

test("handles redact option", () => {
  const catalog = createCatalog({
    service: "secure-app",
    redact: ["password", "creditCard"],
  });
  expect(() => catalog.info("user.login", { userId: "1", password: "secret" })).not.toThrow();
});

test("handles multiple transport targets", () => {
  const catalog = createCatalog({
    service: "multi-transport",
    transport: [{ target: "pino/file", options: {} }],
  });
  expect(() => catalog.info("app.started")).not.toThrow();
});
