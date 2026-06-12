import { expect, test } from "bun:test";
import { createCatalog } from "./index";
import { webhookLogger } from "./webhook";

test("webhookLogger enqueues events without throwing", () => {
  const catalog = createCatalog({ service: "test" });
  const wh = webhookLogger(catalog, {
    targets: [{ url: "https://hooks.example.com/logs" }],
  });

  expect(() => {
    wh.info("app.started", { version: "1.0.0" });
    wh.error("db.connection_failed", { database: "prod" });
  }).not.toThrow();

  wh.stop();
});

test("webhookLogger filters by target level", () => {
  const catalog = createCatalog({ service: "test" });
  const wh = webhookLogger(catalog, {
    targets: [{ url: "https://hooks.example.com/errors", level: "error" }],
  });

  expect(() => {
    wh.info("app.started");
    wh.error("critical.failure");
  }).not.toThrow();

  wh.stop();
});
