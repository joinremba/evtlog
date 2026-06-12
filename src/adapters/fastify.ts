import type { Catalog } from "../index";

interface FastifyRequest {
  method: string;
  url: string;
  ip: string;
  headers: Record<string, string | string[] | undefined>;
  query: Record<string, string | undefined>;
}

interface FastifyReply {
  statusCode: number;
}

export interface FastifyRequestIdOptions {
  header?: string;
  generate?: () => string;
}

export function requestIdHook(catalog: Catalog, options?: FastifyRequestIdOptions) {
  const headerName = options?.header?.toLowerCase() ?? "x-request-id";
  const generate = options?.generate ?? (() => crypto.randomUUID());

  return (request: FastifyRequest, _reply: FastifyReply, done: () => void) => {
    const existing = request.headers[headerName] ?? request.headers["x-request-id"];
    (request as unknown as Record<string, unknown>).requestId = existing ?? generate();
    done();
  };
}

export interface HttpLogOptions {
  excludePaths?: string[];
}

export function httpLoggerHook(catalog: Catalog, options?: HttpLogOptions) {
  const exclude = new Set(options?.excludePaths ?? ["/health", "/favicon.ico"]);

  return (request: FastifyRequest, reply: FastifyReply, done: () => void) => {
    if (exclude.has(request.url)) return done();

    const requestId = (request as unknown as Record<string, unknown>).requestId as
      | string
      | undefined;
    const log = requestId ? catalog.child({ requestId }) : catalog;
    const start = performance.now();
    const method = request.method;
    const url = request.url;

    log.info({
      message: `--> ${method} ${url}`,
      method,
      url,
      query: request.query,
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });

    done();

    // Capture duration when reply is sent (Fastify calls onResponse after send)
    queueMicrotask(() => {
      const duration = ((performance.now() - start) * 1000).toFixed(2);
      const status = reply.statusCode;
      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

      const logData = {
        message: `<-- ${method} ${url} ${status} ${duration}ms`,
        status,
        durationMs: duration,
      };

      if (level === "info") log.info(logData);
      else if (level === "warn") log.warn(logData);
      else log.error(logData);
    });
  };
}
