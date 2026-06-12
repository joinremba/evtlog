import { expect, test } from "bun:test";
import { createCatalog } from "../index";
import { requestIdHook, httpLoggerHook } from "./fastify";

function mockRequest() {
  return {
    method: "GET",
    url: "/api/users",
    ip: "127.0.0.1",
    headers: { "user-agent": "test-agent" },
    query: { page: "1" },
  };
}

function mockReply(statusCode = 200) {
  return { statusCode };
}

test("requestIdHook sets requestId", () => {
  const catalog = createCatalog({ service: "test" });
  const req = mockRequest();
  const reply = mockReply();
  requestIdHook(catalog)(req as any, reply as any, () => {});
  expect((req as any).requestId).toBeDefined();
});

test("httpLoggerHook skips excluded paths", () => {
  const catalog = createCatalog({ service: "test" });
  const req = mockRequest();
  req.url = "/health";
  const reply = mockReply();
  let called = false;
  httpLoggerHook(catalog)(req as any, reply as any, () => {
    called = true;
  });
  expect(called).toBe(true);
});
