import type { Evtlog } from "../index";

interface ExpressRequest {
  method: string;
  path: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
  get(name: string): string | undefined;
}

interface ExpressResponse {
  statusCode: number;
  status(code: number): ExpressResponse;
  on(event: string, listener: (...args: unknown[]) => void): ExpressResponse;
}

type ExpressNext = (err?: unknown) => void;

export interface ExpressRequestIdOptions {
  header?: string;
  generate?: () => string;
}

export function requestIdMiddleware(_evtlog: Evtlog, options?: ExpressRequestIdOptions) {
  const headerName = options?.header?.toLowerCase() ?? "x-request-id";
  const generate = options?.generate ?? (() => crypto.randomUUID());

  return (req: ExpressRequest, _res: ExpressResponse, next: ExpressNext) => {
    const existing = req.get(headerName) ?? req.get("x-request-id");
    (req as unknown as Record<string, unknown>).requestId = existing ?? generate();
    next();
  };
}

export interface HttpLogOptions {
  excludePaths?: string[];
}

export function httpLoggerMiddleware(evtlog: Evtlog, options?: HttpLogOptions) {
  const exclude = new Set(options?.excludePaths ?? ["/health", "/favicon.ico"]);

  return (req: ExpressRequest, res: ExpressResponse, next: ExpressNext) => {
    if (exclude.has(req.path)) return next();

    const requestId = (req as unknown as Record<string, unknown>).requestId as string | undefined;
    const log = requestId ? evtlog.child({ requestId }) : evtlog;
    const start = performance.now();
    const method = req.method;
    const path = req.path;

    log.info({
      message: `--> ${method} ${path}`,
      method,
      path,
      query: req.query,
      userAgent: req.get("user-agent"),
      ip: req.ip,
    });

    res.on("finish", () => {
      const duration = (performance.now() - start).toFixed(2);
      const status = res.statusCode;
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

    next();
  };
}
