import { expect, test } from "bun:test";
import { createCatalog } from "../index";
import { requestIdMiddleware, httpLoggerMiddleware } from "./hono";

interface MockCtx {
  req: {
    method: string;
    path: string;
    header(name: string): string | undefined;
    query(): Record<string, string | undefined>;
  };
  get(key: string): unknown;
  set(key: string, val: unknown): void;
  res?: { status: number };
}

function mockHonoContext(overrides?: {
  path?: string;
  header?: (name: string) => string | undefined;
}): MockCtx {
  const store: Record<string, unknown> = {};
  return {
    req: {
      method: "GET",
      path: overrides?.path ?? "/api/users",
      header: overrides?.header ?? ((_name: string) => undefined),
      query: () => ({}),
    },
    get: (key: string) => store[key],
    set: (key: string, val: unknown) => {
      store[key] = val;
    },
  };
}

test("requestIdMiddleware sets requestId on context", async () => {
  const catalog = createCatalog({ service: "test" });
  const c = mockHonoContext();
  let called = false;
  await requestIdMiddleware(catalog)(c, async () => {
    called = true;
  });
  expect(c.get("requestId")).toBeDefined();
  expect(called).toBe(true);
});

test("requestIdMiddleware preserves existing x-request-id header", async () => {
  const catalog = createCatalog({ service: "test" });
  const c = mockHonoContext({ header: () => "from-header" });
  await requestIdMiddleware(catalog)(c, async () => {});
  expect(c.get("requestId")).toBe("from-header");
});

test("httpLoggerMiddleware skips excluded paths", async () => {
  const catalog = createCatalog({ service: "test" });
  const c = mockHonoContext({ path: "/health" });
  let called = false;
  await httpLoggerMiddleware(catalog)(c, async () => {
    called = true;
  });
  expect(called).toBe(true);
});
