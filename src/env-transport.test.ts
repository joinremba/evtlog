import { expect, test } from "bun:test";
import { envTransport } from "./env-transport";

test("returns pino-roll daily transport for production", () => {
  const result = envTransport("production");
  expect(result.level).toBe("info");
  expect(result.transport).toBeDefined();
  const t = result.transport as { target: string; options: Record<string, unknown> };
  expect(t.target).toBe("pino-roll");
  expect(t.options.frequency).toBe("daily");
  expect(t.options.file).toBe("./logs/production.log");
});

test("returns pino/file for staging", () => {
  const result = envTransport("staging");
  expect(result.level).toBe("info");
  const t = result.transport as { target: string; options: Record<string, unknown> };
  expect(t.target).toBe("pino/file");
  expect(t.options.destination).toBe("./logs/staging.log");
});

test("returns silent noop destination for test", () => {
  const result = envTransport("test");
  expect(result.destination).toBeDefined();
  expect(typeof result.destination!.write).toBe("function");
  expect(result.transport).toBeUndefined();
});

test("returns pino/file for development", () => {
  const result = envTransport("development");
  expect(result.level).toBe("debug");
  const t = result.transport as { target: string; options: Record<string, unknown> };
  expect(t.target).toBe("pino/file");
  expect(t.options.destination).toBe("./logs/development.log");
});

test("respects NODE_ENV when env is omitted", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const result = envTransport();
    expect(result.level).toBe("debug");
  } finally {
    if (prev === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev;
  }
});

test("falls back to development for unknown env", () => {
  process.env.NODE_ENV = undefined;
  const result = envTransport();
  expect(result.level).toBe("debug");
});

test("falls back to development for unknown env", () => {
  const result = envTransport("unknown-env");
  expect(result.level).toBe("debug");
});
