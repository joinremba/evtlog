import type { Catalog } from "../index";

interface HonoContext {
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

export interface HonoRequestIdOptions {
  header?: string;
  generate?: () => string;
}

export function requestIdMiddleware(catalog: Catalog, options?: HonoRequestIdOptions) {
  const headerName = options?.header?.toLowerCase() ?? "x-request-id";
  const generate = options?.generate ?? (() => crypto.randomUUID());

  return (c: HonoContext, next: () => Promise<void>) => {
    const existing = c.req.header(headerName) ?? c.req.header("x-request-id");
    const requestId = existing ?? generate();
    c.set("requestId", requestId);
    return next();
  };
}

export interface HttpLogOptions {
  excludePaths?: string[];
  logBody?: boolean;
  maxBodyLength?: number;
}

export function httpLoggerMiddleware(catalog: Catalog, options?: HttpLogOptions) {
  const exclude = new Set(options?.excludePaths ?? ["/health", "/favicon.ico"]);

  return (c: HonoContext, next: () => Promise<void>) => {
    if (exclude.has(c.req.path)) return next();

    const requestId = c.get("requestId") as string | undefined;
    const log = requestId ? catalog.child({ requestId }) : catalog;
    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;

    log.info({
      message: `--> ${method} ${path}`,
      method,
      path,
      query: Object.fromEntries(Object.entries(c.req.query()).filter(([, v]) => v !== undefined)),
      userAgent: c.req.header("user-agent"),
    });

    return next().then(() => {
      const duration = (performance.now() - start).toFixed(2);
      const status = c.res?.status ?? 200;
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      const logData = {
        message: `<-- ${method} ${path} ${status} ${duration}ms`,
        status,
        durationMs: duration,
      };

      if (level === "info") log.info(logData);
      else if (level === "warn") log.warn(logData);
      else log.error(logData);
    });
  };
}
