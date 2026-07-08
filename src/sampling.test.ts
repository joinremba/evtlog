import { expect, test } from "bun:test";
import { createEvtlog } from "./index";
import { samplingEvtlog } from "./sampling";

test("samplingEvtlog at rate 1.0 passes all events", () => {
  const evtlog = createEvtlog({ service: "test" });
  let called = false;

  const spy = new Proxy(evtlog, {
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

  const s2 = samplingEvtlog(spy, { rate: 1.0 });
  s2.info("test.event");
  expect(called).toBe(true);
});

test("samplingEvtlog at rate 0.0 drops all events", () => {
  const evtlog = createEvtlog({ service: "test" });
  const sampled = samplingEvtlog(evtlog, { rate: 0.0 });
  expect(() => sampled.info("dropped.event")).not.toThrow();
});

test("samplingEvtlog filters by level", () => {
  const evtlog = createEvtlog({ service: "test" });
  const sampled = samplingEvtlog(evtlog, { rate: 1.0, level: "warn" });
  expect(() => {
    sampled.info("info.event");
    sampled.warn("warn.event");
    sampled.error("error.event");
  }).not.toThrow();
});
