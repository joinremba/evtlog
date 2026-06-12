import type { Catalog } from "./index";

export interface SecurityEvent {
  action: string;
  actor: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
}

export function securityLogger(catalog: Catalog) {
  return {
    log(event: SecurityEvent) {
      catalog.warn("security." + event.action, {
        security: true,
        actor: event.actor,
        ip: event.ip,
        userAgent: event.userAgent,
        details: event.details,
        severity: event.severity,
      });
    },
  };
}
