import { expect, test } from "bun:test";
import { createEvtlog } from "./index";
import { auditLogger } from "./audit";

test("auditLogger logs audit event", () => {
  const evtlog = createEvtlog({ service: "test" });
  const audit = auditLogger(evtlog);
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
