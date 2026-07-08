import { expect, test } from "bun:test";
import { createEvtlog } from "./index";

test("creates a evtlog instance", () => {
  const evtlog = createEvtlog({ service: "test-service" });
  expect(evtlog).toBeDefined();
  expect(typeof evtlog.info).toBe("function");
});

test("logs info with event name (event-name-first)", () => {
  const evtlog = createEvtlog({ service: "test", level: "info" });
  expect(() => evtlog.info("user.created", { userId: "42" })).not.toThrow();
});

test("logs with object style (standard pino)", () => {
  const evtlog = createEvtlog({ service: "test", level: "info" });
  expect(() => evtlog.info({ userId: "42", message: "User created" })).not.toThrow();
});

test("logs error with event name", () => {
  const evtlog = createEvtlog({ service: "test", level: "error" });
  expect(() => evtlog.error("payment.failed", { amount: 100 })).not.toThrow();
});

test("logs with just an event name (no data)", () => {
  const evtlog = createEvtlog({ service: "test" });
  expect(() => evtlog.info("app.started")).not.toThrow();
});

test("respects log level", () => {
  const evtlog = createEvtlog({ service: "test", level: "warn" });
  expect(evtlog.level).toBe("warn");
});

test("level can be changed at runtime", () => {
  const evtlog = createEvtlog({ service: "test", level: "warn" });
  expect(evtlog.level).toBe("warn");
  evtlog.level = "debug";
  expect(evtlog.level).toBe("debug");
});

test("level setter affects what gets logged", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "test",
    level: "error",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  evtlog.info("should.not.appear");
  evtlog.level = "info";
  evtlog.info("should.appear");
  expect(lines.some((l) => l.msg === "should.appear")).toBe(true);
});

test("creates child logger with bound fields", () => {
  const evtlog = createEvtlog({ service: "app" });
  const child = evtlog.child({ requestId: "abc-123" });
  expect(child).toBeDefined();
  expect(typeof child.info).toBe("function");
});

test("child logger logs without errors", () => {
  const evtlog = createEvtlog({ service: "app" });
  const child = evtlog.child({ requestId: "abc-123" });
  expect(() => child.info("request.handled", { path: "/api" })).not.toThrow();
});

test("child logger supports object style", () => {
  const evtlog = createEvtlog({ service: "app" });
  const child = evtlog.child({ requestId: "abc-123" });
  expect(() => child.info({ path: "/api", method: "GET" })).not.toThrow();
});

test("redacts sensitive fields", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "secure-app",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  evtlog.info("user.login", { userId: "1", password: "secret" });
  const entry = lines[0]!;
  expect(entry.password).toBe("[REDACTED]");
  expect(entry.userId).toBe("1");
});

test("redacts sensitive fields in object style", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "secure-app",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  evtlog.info({ userId: "1", password: "secret", email: "a@b.com" });
  const entry = lines[0]!;
  expect(entry.password).toBe("[REDACTED]");
  expect(entry.email).toBe("[REDACTED]");
  expect(entry.userId).toBe("1");
});

test("handles multiple transport targets", () => {
  const evtlog = createEvtlog({
    service: "multi-transport",
    transport: [{ target: "pino/file", options: {} }],
  });
  expect(() => evtlog.info("app.started")).not.toThrow();
});

test("uses mixin for context injection", () => {
  const evtlog = createEvtlog({
    service: "with-mixin",
    mixin: () => ({ requestId: "abc-123" }),
  });
  expect(() => evtlog.info("request.started")).not.toThrow();
});

test("child logger inherits mixin", () => {
  const evtlog = createEvtlog({
    service: "with-mixin",
    mixin: () => ({ requestId: "abc-123" }),
  });
  const child = evtlog.child({ userId: "42" });
  expect(() => child.info("user.action")).not.toThrow();
});

test("withContext resolves context at log time", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "ctx",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxEvtlog = evtlog.withContext(() => ({ requestId: "dyn-456" }));
  ctxEvtlog.info("event");
  expect(lines.some((l) => l.requestId === "dyn-456")).toBe(true);
});

test("withContext merges with log data", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "ctx",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxEvtlog = evtlog.withContext(() => ({ region: "us-east" }));
  ctxEvtlog.info("order.placed", { orderId: "123" });
  const entry = lines.find((l) => l.msg === "order.placed")!;
  expect(entry.region).toBe("us-east");
  expect(entry.orderId).toBe("123");
});

test("withContext respects redaction", () => {
  const lines: Record<string, unknown>[] = [];
  const evtlog = createEvtlog({
    service: "ctx-redact",
    destination: {
      write(data) {
        lines.push(JSON.parse(data.toString()) as Record<string, unknown>);
      },
    },
  });
  const ctxEvtlog = evtlog.withContext(() => ({ password: "should-redact" }));
  ctxEvtlog.info("event");
  expect(lines.some((l) => l.password === "[REDACTED]")).toBe(true);
});
