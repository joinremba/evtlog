import { expect, test } from "bun:test";
import { createCatalog } from "./index";
import { samplingCatalog } from "./sampling";

test("samplingCatalog at rate 1.0 passes all events", () => {
  const catalog = createCatalog({ service: "test" });
  let called = false;

  const spy = new Proxy(catalog, {
    get(target, prop) {
      if (prop === "info")
        return () => {
          called = true;
        };
      if (typeof prop === "string") {
        return (target as unknown as Record<string, unknown>)[prop];
      }
      return undefined;
    },
  });

  const s2 = samplingCatalog(spy, { rate: 1.0 });
  s2.info("test.event");
  expect(called).toBe(true);
});

test("samplingCatalog at rate 0.0 drops all events", () => {
  const catalog = createCatalog({ service: "test" });
  const sampled = samplingCatalog(catalog, { rate: 0.0 });
  expect(() => sampled.info("dropped.event")).not.toThrow();
});

test("samplingCatalog filters by level", () => {
  const catalog = createCatalog({ service: "test" });
  const sampled = samplingCatalog(catalog, { rate: 1.0, level: "warn" });
  expect(() => {
    sampled.info("info.event");
    sampled.warn("warn.event");
    sampled.error("error.event");
  }).not.toThrow();
});
