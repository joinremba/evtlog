import type { Catalog, LogLevel } from "./index";

export interface OtelSpanContext {
  traceId: string;
  spanId: string;
  traceFlags?: number;
}

export interface OtelSpan {
  spanContext(): OtelSpanContext;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  setAttribute(key: string, value: unknown): void;
}

export interface OtelApi {
  trace: {
    getActiveSpan(): OtelSpan | undefined;
  };
  SpanStatusCode: { OK: number; ERROR: number; UNSET: number };
}

export interface OtelBridgeOptions {
  api: OtelApi;
  captureSpanEvents?: boolean;
  spanAttributePrefix?: string;
}

export function otelBridge(catalog: Catalog, options: OtelBridgeOptions) {
  const { api, captureSpanEvents = false, spanAttributePrefix = "log" } = options;

  function withTraceContext(
    first: string | Record<string, unknown>,
    data?: Record<string, unknown>
  ) {
    const span = api.trace.getActiveSpan();
    if (!span) return { first, data };

    const ctx = span.spanContext();
    const traceData: Record<string, unknown> = {
      trace_id: ctx.traceId,
      span_id: ctx.spanId,
      ...(data as Record<string, unknown>),
    };

    if (captureSpanEvents) {
      const msg = typeof first === "string" ? first : "";
      span.addEvent(msg, traceData);
    }

    span.setAttribute(`${spanAttributePrefix}.trace_id`, ctx.traceId);

    return { first, data: traceData };
  }

  function adapt(method: LogLevel) {
    return (first: string | Record<string, unknown>, second?: Record<string, unknown>) => {
      const { first: f, data: d } = withTraceContext(first, second);
      const logFn = (catalog as unknown as Record<string, (...args: unknown[]) => void>)[method]!;
      logFn(f, d);
    };
  }

  return {
    trace: adapt("trace"),
    debug: adapt("debug"),
    info: adapt("info"),
    warn: adapt("warn"),
    error: adapt("error"),
    fatal: adapt("fatal"),
    child(bindings: Record<string, unknown>) {
      return otelBridge(catalog.child(bindings), options);
    },
    get level(): LogLevel {
      return catalog.level;
    },
  };
}
