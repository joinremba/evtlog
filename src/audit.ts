import type { Catalog } from "./index";

export interface AuditEvent {
  action: string;
  actor: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  outcome: "success" | "failure";
  reason?: string;
}

export function auditLogger(catalog: Catalog) {
  return {
    log(event: AuditEvent) {
      catalog.info("audit." + event.action, {
        audit: true,
        actor: event.actor,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details,
        outcome: event.outcome,
        reason: event.reason,
      });
    },
  };
}
