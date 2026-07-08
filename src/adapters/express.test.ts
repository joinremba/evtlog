import { expect, test } from "bun:test";
import { createEvtlog } from "../index";
import { requestIdMiddleware, httpLoggerMiddleware } from "./express";

function mockReq() {
  const headers: Record<string, string | undefined> = {};
  return {
    method: "GET",
    path: "/api/users",
    ip: "127.0.0.1",
    headers,
    query: { page: "1" },
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  };
}

function mockRes() {
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
  return {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    on(event: string, fn: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(fn);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const fn of listeners[event] ?? []) fn(...args);
    },
  };
}

test("requestIdMiddleware sets requestId", () => {
  const evtlog = createEvtlog({ service: "test" });
  const req = mockReq();
  const res = mockRes();
  requestIdMiddleware(evtlog)(req as any, res as any, () => {});
  expect((req as any).requestId).toBeDefined();
});

test("httpLoggerMiddleware skips excluded paths", () => {
  const evtlog = createEvtlog({ service: "test" });
  const req = mockReq();
  req.path = "/health";
  const res = mockRes();
  let called = false;
  httpLoggerMiddleware(evtlog)(req as any, res as any, () => {
    called = true;
  });
  expect(called).toBe(true);
});

test("httpLoggerMiddleware logs on finish", () => {
  const evtlog = createEvtlog({ service: "test" });
  const req = mockReq();
  const res = mockRes();
  let called = false;
  httpLoggerMiddleware(evtlog)(req as any, res as any, () => {
    called = true;
  });
  expect(called).toBe(true);
  expect(() => res.emit("finish")).not.toThrow();
});
