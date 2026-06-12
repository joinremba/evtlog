import type { Catalog, LogLevel } from "./index";

type SamplerFn = (level: LogLevel, message: string, data?: Record<string, unknown>) => boolean;

export interface SamplingOptions {
  rate: number;
  level?: LogLevel;
  sampler?: SamplerFn;
  keyFn?: (level: LogLevel, message: string, data?: Record<string, unknown>) => string;
}

function defaultKeyFn(_level: LogLevel, message: string, _data?: Record<string, unknown>): string {
  return message;
}

function deterministicSampler(
  rate: number,
  keyFn: (level: LogLevel, message: string, data?: Record<string, unknown>) => string
): SamplerFn {
  return (level, message, data) => {
    const key = keyFn(level, message, data);
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const normalized = Math.abs(hash) / 0x7fffffff;
    return normalized < rate;
  };
}

export function samplingCatalog(catalog: Catalog, options: SamplingOptions) {
  const { rate, level: levelFilter, sampler, keyFn } = options;
  const levels: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
  const minLevelIdx = levelFilter ? levels.indexOf(levelFilter) : 0;

  const shouldSample: SamplerFn =
    sampler ??
    (keyFn ? deterministicSampler(rate, keyFn) : deterministicSampler(rate, defaultKeyFn));

  function adapt(method: LogLevel) {
    return (first: string | Record<string, unknown>, second?: Record<string, unknown>) => {
      const levelIdx = levels.indexOf(method);
      if (levelIdx < minLevelIdx) return;

      const message = typeof first === "string" ? first : "";
      const data = typeof first === "object" ? (first as Record<string, unknown>) : second;

      if (!shouldSample(method, message, data)) return;

      const logFn = (catalog as unknown as Record<string, (...args: unknown[]) => void>)[method]!;
      if (typeof first === "string") {
        logFn(first, second);
      } else {
        logFn(first);
      }
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
      return samplingCatalog(catalog.child(bindings), options);
    },
    get level(): LogLevel {
      return catalog.level;
    },
  };
}
