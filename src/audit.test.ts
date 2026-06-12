import { expect, test } from "bun:test";
import { createCatalog } from "./index";
import { auditLogger } from "./audit";

test("auditLogger logs audit event", () => {
  const catalog = createCatalog({ service: "test" });
  const audit = auditLogger(catalog);
  expect(() =>
    audit.log({
      action: "user.deleted",
      actor: "admin@example.com",
      resource: "user",
      resourceId: "42",
      outcome: "success",
    })
  ).not.toThrow();
});
