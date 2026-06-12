/**
 * Audit Writer
 *
 * Central utility for writing entries to the platform.audit_log table.
 * Audit failures are silently caught so they never crash business logic.
 */

import { database, type Prisma } from "@repo/database";

export interface AuditEntryInput {
  action: "insert" | "update" | "delete";
  ipAddress?: string;
  newValues?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  performedBy?: string;
  recordId: string;
  tableName: string;
  tableSchema: string;
  tenantId: string;
  userAgent?: string;
}

/**
 * Write a single entry to the audit_log table.
 * Errors are caught and logged — audit failures must never interrupt business flows.
 */
export async function writeAuditEntry(input: AuditEntryInput): Promise<void> {
  try {
    await database.audit_log.create({
      data: {
        tenant_id: input.tenantId,
        table_schema: input.tableSchema,
        table_name: input.tableName,
        record_id: input.recordId,
        action: input.action,
        old_values: (input.oldValues ?? undefined) as Prisma.InputJsonValue,
        new_values: (input.newValues ?? undefined) as Prisma.InputJsonValue,
        performed_by: input.performedBy ?? undefined,
        ip_address: input.ipAddress ?? undefined,
        user_agent: input.userAgent ?? undefined,
      },
    });
  } catch (error) {
    console.error("[AuditWriter] Failed to write audit entry:", error);
  }
}

/** Convenience: audit an INSERT action. */
export async function auditCreate(
  input: Omit<AuditEntryInput, "action">
): Promise<void> {
  return writeAuditEntry({ ...input, action: "insert" });
}

/** Convenience: audit an UPDATE action. */
export async function auditUpdate(
  input: Omit<AuditEntryInput, "action">
): Promise<void> {
  return writeAuditEntry({ ...input, action: "update" });
}

/** Convenience: audit a DELETE action. */
export async function auditDelete(
  input: Omit<AuditEntryInput, "action">
): Promise<void> {
  return writeAuditEntry({ ...input, action: "delete" });
}
