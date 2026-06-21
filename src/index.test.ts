import { expect, test } from "bun:test";
import { createCatalog } from "./index";

test("creates a catalog instance", () => {
  const catalog = createCatalog({ service: "test-service" });
  expect(catalog).toBeDefined();
  expect(typeof catalog.info).toBe("function");
});

test("logs info with event name (event-name-first)", () => {
  const catalog = createCatalog({ service: "test", level: "info" });
  expect(() => catalog.info("user.created", { userId: "42" })).not.toThrow();
});

test("logs with object style (standard pino)", () => {
  const catalog = createCatalog({ service: "test", level: "info" });
  expect(() => catalog.info({ userId: "42", message: "User created" })).not.toThrow();
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

test("level can be changed at runtime", () => {
  const catalog = createCatalog({ service: "test", level: "warn" });
  expect(catalog.level).toBe("warn");
  catalog.level = "debug";
  expect(catalog.level).toBe("debug");
});

test("level setter affects what gets logged", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "test",
    level: "error",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  catalog.info("should.not.appear");
  catalog.level = "info";
  catalog.info("should.appear");
  expect(lines.some((l) => l.msg === "should.appear")).toBe(true);
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

test("child logger supports object style", () => {
  const catalog = createCatalog({ service: "app" });
  const child = catalog.child({ requestId: "abc-123" });
  expect(() => child.info({ path: "/api", method: "GET" })).not.toThrow();
});

test("redacts sensitive fields", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "secure-app",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  catalog.info("user.login", { userId: "1", password: "secret" });
  const entry = lines[0]!;
  expect(entry.password).toBe("[REDACTED]");
  expect(entry.userId).toBe("1");
});

test("redacts sensitive fields in object style", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "secure-app",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  catalog.info({ userId: "1", password: "secret", email: "a@b.com" });
  const entry = lines[0]!;
  expect(entry.password).toBe("[REDACTED]");
  expect(entry.email).toBe("[REDACTED]");
  expect(entry.userId).toBe("1");
});

test("handles multiple transport targets", () => {
  const catalog = createCatalog({
    service: "multi-transport",
    transport: [{ target: "pino/file", options: {} }],
  });
  expect(() => catalog.info("app.started")).not.toThrow();
});

test("uses mixin for context injection", () => {
  const catalog = createCatalog({
    service: "with-mixin",
    mixin: () => ({ requestId: "abc-123" }),
  });
  expect(() => catalog.info("request.started")).not.toThrow();
});

test("child logger inherits mixin", () => {
  const catalog = createCatalog({
    service: "with-mixin",
    mixin: () => ({ requestId: "abc-123" }),
  });
  const child = catalog.child({ userId: "42" });
  expect(() => child.info("user.action")).not.toThrow();
});

test("withContext resolves context at log time", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "ctx",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxCatalog = catalog.withContext(() => ({ requestId: "dyn-456" }));
  ctxCatalog.info("event");
  expect(lines.some((l) => l.requestId === "dyn-456")).toBe(true);
});

test("withContext merges with log data", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "ctx",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxCatalog = catalog.withContext(() => ({ region: "us-east" }));
  ctxCatalog.info("order.placed", { orderId: "123" });
  const entry = lines.find((l) => l.msg === "order.placed")!;
  expect(entry.region).toBe("us-east");
  expect(entry.orderId).toBe("123");
});

test("withContext respects redaction", () => {
  const lines: Record<string, unknown>[] = [];
  const catalog = createCatalog({
    service: "ctx-redact",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxCatalog = catalog.withContext(() => ({ password: "should-redact" }));
  ctxCatalog.info("event");
  expect(lines.some((l) => l.password === "[REDACTED]")).toBe(true);
});
