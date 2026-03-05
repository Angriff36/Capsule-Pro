/**
 * Projection Audit Logging Utilities
 *
 * Provides audit logging for board projection mutations (add, remove, move nodes, etc.)
 * All tenant-scoped projection changes are logged for compliance and debugging.
 *
 * @packageDocumentation
 */

import type { Database } from "@repo/database";
import { createTenantAuditLogger } from "@repo/manifest-adapters";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Projection mutation types that can be audited.
 */
export type ProjectionMutationType =
  | "addNode"
  | "removeNode"
  | "moveNode"
  | "addEdge"
  | "removeEdge"
  | "annotate"
  | "highlightNode";

/**
 * Audit context for projection mutations.
 */
export interface ProjectionAuditContext {
  tenantId: string;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

// ---------------------------------------------------------------------------
// Audit Logger Factory
// ---------------------------------------------------------------------------

let auditLoggerInstance: ReturnType<typeof createTenantAuditLogger> | null =
  null;

/**
 * Get or create the audit logger instance.
 */
function getAuditLogger(prisma: Database) {
  if (!auditLoggerInstance) {
    auditLoggerInstance = createTenantAuditLogger({
      prisma,
      enableHashing: true,
      redactSensitiveFields: true,
      batchSize: 10,
    });
  }
  return auditLoggerInstance;
}

/**
 * Log a projection mutation.
 */
export async function logProjectionMutation(params: {
  prisma: Database;
  context: ProjectionAuditContext;
  mutationType: ProjectionMutationType;
  entityType?: string;
  entityId?: string;
  projectionId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  status: "success" | "failure";
  errorMessage?: string;
  durationMs?: number;
}): Promise<void> {
  const logger = getAuditLogger(params.prisma);

  await logger.logProjectionMutation({
    tenantId: params.context.tenantId,
    mutationType: params.mutationType,
    entityType: params.entityType,
    entityId: params.entityId,
    projectionId: params.projectionId,
    performedBy: params.context.performedBy,
    correlationId: params.context.correlationId,
    oldValue: params.oldValue,
    newValue: params.newValue,
    status: params.status,
    errorMessage: params.errorMessage,
    durationMs: params.durationMs,
    ipAddress: params.context.ipAddress,
    userAgent: params.context.userAgent,
  });

  // Flush immediately for projection mutations to ensure visibility
  await logger.flush();
}

/**
 * Wrap a projection mutation with audit logging.
 *
 * Automatically logs success/failure and measures duration.
 */
export async function withProjectionAudit<T>(
  prisma: Database,
  context: ProjectionAuditContext,
  mutationType: ProjectionMutationType,
  mutationFn: () => Promise<T>,
  options?: {
    entityType?: string;
    entityId?: string;
    projectionId?: string;
    oldValue?: unknown;
  }
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await mutationFn();

    await logProjectionMutation({
      prisma,
      context,
      mutationType,
      entityType: options?.entityType,
      entityId: options?.entityId,
      projectionId: options?.projectionId,
      oldValue: options?.oldValue,
      newValue:
        result && typeof result === "object" && "id" in result
          ? { id: (result as { id: string }).id }
          : result,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    await logProjectionMutation({
      prisma,
      context,
      mutationType,
      entityType: options?.entityType,
      entityId: options?.entityId,
      projectionId: options?.projectionId,
      oldValue: options?.oldValue,
      status: "failure",
      errorMessage:
        error instanceof Error ? error.message : "Unknown error occurred",
      durationMs: Date.now() - startTime,
    });

    throw error;
  }
}

/**
 * Log multiple projection mutations in a batch (for complex operations).
 */
export async function logProjectionMutationsBatch(
  prisma: Database,
  context: ProjectionAuditContext,
  mutations: Array<{
    mutationType: ProjectionMutationType;
    entityType?: string;
    entityId?: string;
    projectionId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    status: "success" | "failure";
    errorMessage?: string;
    durationMs?: number;
  }>
): Promise<void> {
  const logger = getAuditLogger(prisma);

  for (const mutation of mutations) {
    await logger.logProjectionMutation({
      tenantId: context.tenantId,
      mutationType: mutation.mutationType,
      entityType: mutation.entityType,
      entityId: mutation.entityId,
      projectionId: mutation.projectionId,
      performedBy: context.performedBy,
      correlationId: context.correlationId,
      oldValue: mutation.oldValue,
      newValue: mutation.newValue,
      status: mutation.status,
      errorMessage: mutation.errorMessage,
      durationMs: mutation.durationMs,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  // Flush batch
  await logger.flush();
}
