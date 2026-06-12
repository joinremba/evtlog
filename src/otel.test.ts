import { expect, test } from "bun:test";
import { createCatalog } from "./index";
import { otelBridge } from "./otel";
import type { OtelApi } from "./otel";

function mockOtelApi(): OtelApi {
  return {
    trace: {
      getActiveSpan() {
        return {
          spanContext() {
            return { traceId: "abc123", spanId: "def456", traceFlags: 1 };
          },
          addEvent(_name: string, _attrs?: Record<string, unknown>) {},
          setAttribute(_key: string, _value: unknown) {},
        };
      },
    },
    SpanStatusCode: { OK: 0, ERROR: 1, UNSET: 2 },
  };
}

test("otelBridge injects trace context", () => {
  const catalog = createCatalog({ service: "test" });
  const otel = mockOtelApi();
  const bridged = otelBridge(catalog, { api: otel });

  expect(() => {
    bridged.info("app.started", { version: "1.0.0" });
  }).not.toThrow();
});

test("otelBridge child preserves bridging", () => {
  const catalog = createCatalog({ service: "test" });
  const otel = mockOtelApi();
  const bridged = otelBridge(catalog, { api: otel });
  const child = bridged.child({ requestId: "req-1" });

  expect(() => {
    child.info("child.event");
  }).not.toThrow();
});
