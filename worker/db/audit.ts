export interface AuditEventInput {
  requestId: string;
  actorType?: "USER" | "SYSTEM" | "SERVICE";
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export function createAuditStatement(db: D1Database, event: AuditEventInput): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO audit_logs
        (id, actor_type, actor_id, action, entity_type, entity_id, reason, metadata_json, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      event.actorType ?? (event.actorId ? "USER" : "SYSTEM"),
      event.actorId ?? null,
      event.action,
      event.entityType,
      event.entityId ?? null,
      event.reason ?? null,
      JSON.stringify(event.metadata ?? {}),
      event.requestId,
    );
}
