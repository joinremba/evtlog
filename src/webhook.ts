import type { Catalog, LogLevel } from "./index";

export interface WebhookTarget {
  url: string;
  level?: LogLevel;
  headers?: Record<string, string>;
  secret?: string;
}

export interface WebhookOptions {
  targets: WebhookTarget[];
  batchIntervalMs?: number;
  maxBatchSize?: number;
  retryCount?: number;
}

interface QueuedEvent {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function webhookLogger(catalog: Catalog, options: WebhookOptions) {
  const { targets, batchIntervalMs = 5000, maxBatchSize = 50, retryCount = 2 } = options;
  const queues: Map<string, QueuedEvent[]> = new Map();
  const timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  const flushing = new Set<string>();

  for (const target of targets) {
    queues.set(target.url, []);
    const timer = setInterval(() => flush(target), batchIntervalMs);
    timers.set(target.url, timer);
  }

  async function flush(target: WebhookTarget) {
    if (flushing.has(target.url)) return;
    flushing.add(target.url);

    try {
      const queue = queues.get(target.url);
      if (!queue || queue.length === 0) return;

      const batch = queue.splice(0, maxBatchSize);
      const body = JSON.stringify({ events: batch });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...target.headers,
      };

      if (target.secret) {
        headers["X-Signature-256"] = await signPayload(body, target.secret);
      }

      let delivered = false;
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const res = await fetch(target.url, { method: "POST", headers, body });
          if (res.ok) {
            delivered = true;
            break;
          }
          if (attempt < retryCount) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } catch {
          if (attempt < retryCount) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (!delivered) {
        catalog.error("webhook.delivery_failed", {
          url: target.url,
          batchSize: batch.length,
        });
      }
    } finally {
      flushing.delete(target.url);
    }
  }

  function shouldLog(level: LogLevel, targetLevel?: LogLevel): boolean {
    const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
    const targetIdx = targetLevel ? levels.indexOf(targetLevel) : 0;
    const eventIdx = levels.indexOf(level);
    return eventIdx >= targetIdx;
  }

  function enqueue(
    level: LogLevel,
    first: string | Record<string, unknown>,
    second?: Record<string, unknown>
  ) {
    const message = typeof first === "string" ? first : "";
    const data = typeof first === "object" ? first : second;

    for (const target of targets) {
      if (!shouldLog(level, target.level)) continue;
      const queue = queues.get(target.url);
      if (queue) {
        queue.push({ level, message, data, timestamp: Date.now() });
      }
    }
  }

  function stop() {
    for (const [url, timer] of timers) {
      clearInterval(timer);
      const target = targets.find((t) => t.url === url);
      if (target) {
        flush(target);
      }
    }
    timers.clear();
    queues.clear();
  }

  return {
    trace(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("trace", first, second);
    },
    debug(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("debug", first, second);
    },
    info(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("info", first, second);
    },
    warn(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("warn", first, second);
    },
    error(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("error", first, second);
    },
    fatal(first: string | Record<string, unknown>, second?: Record<string, unknown>) {
      enqueue("fatal", first, second);
    },
    stop,
    flush: () => Promise.all(targets.map(flush)),
  };
}
