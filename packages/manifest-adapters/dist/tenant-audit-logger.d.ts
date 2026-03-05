/**
 * Tenant Audit Logger
 *
 * Comprehensive audit logging for all tenant-scoped operations including:
 * - Manifest command execution
 * - Projection mutations
 * - AI plan approvals
 * - Policy decisions
 *
 * This logger creates an immutable audit trail for all governed operations.
 *
 * @packageDocumentation
 */
import type { CommandResult } from "@angriff36/manifest";
import type { IRCommand } from "@angriff36/manifest/ir";
import type { Prisma } from "@repo/database";
/**
 * Operation types that can be audited.
 */
export type AuditOperationType = "manifest_command" | "projection_mutation" | "ai_plan_approval" | "policy_decision" | "constraint_override" | "direct_write";
/**
 * Audit log entry creation parameters.
 */
export interface AuditLogParams {
    tenantId: string;
    operationType: AuditOperationType;
    entityType?: string;
    entityId?: string;
    action: string;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
    input?: unknown;
    output?: unknown;
    oldValue?: unknown;
    newValue?: unknown;
    status: "success" | "failure" | "partial";
    errorMessage?: string;
    durationMs?: number;
    aiModel?: string;
    aiConfidence?: number;
    aiContext?: Record<string, unknown>;
    policyChecks?: Record<string, unknown>;
    overrides?: Record<string, unknown>;
}
/**
 * Prisma client interface for audit operations.
 */
export interface AuditPrismaClient {
    tenantAuditLog: {
        create: (args: {
            data: Prisma.TenantAuditLogUncheckedCreateInput;
        }) => Promise<{
            id: string;
        }>;
    };
    $transaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}
/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
    prisma: AuditPrismaClient;
    enableHashing?: boolean;
    redactSensitiveFields?: boolean;
    batchSize?: number;
}
/**
 * Tenant Audit Logger class.
 *
 * Provides comprehensive audit logging for all tenant-scoped operations.
 */
export declare class TenantAuditLogger {
    private prisma;
    private enableHashing;
    private redactSensitiveFields;
    private batchSize;
    private pendingLogs;
    private flushTimeout;
    constructor(config: AuditLoggerConfig);
    /**
     * Log a manifest command execution.
     */
    logManifestCommand(params: {
        tenantId: string;
        entityName?: string;
        command: IRCommand;
        result: CommandResult;
        performedBy?: string;
        correlationId?: string;
        durationMs?: number;
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
    }): Promise<void>;
    /**
     * Log a projection mutation (board operations).
     */
    logProjectionMutation(params: {
        tenantId: string;
        mutationType: string;
        entityType?: string;
        entityId?: string;
        projectionId?: string;
        performedBy?: string;
        oldValue?: unknown;
        newValue?: unknown;
        status: "success" | "failure";
        errorMessage?: string;
        durationMs?: number;
        ipAddress?: string;
        userAgent?: string;
        correlationId?: string;
    }): Promise<void>;
    /**
     * Log an AI plan approval.
     */
    logAiPlanApproval(params: {
        tenantId: string;
        planId: string;
        planTitle: string;
        stepCount: number;
        performedBy?: string;
        status: "success" | "failure";
        result?: {
            success: boolean;
            summary: string;
            stepResults: Array<{
                stepId: string;
                success: boolean;
                message: string;
            }>;
            boardMutationResults: Array<{
                mutationType: string;
                success: boolean;
                message: string;
            }>;
        };
        errorMessage?: string;
        durationMs?: number;
        aiModel?: string;
        aiConfidence?: number;
        aiContext?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
        correlationId?: string;
    }): Promise<void>;
    /**
     * Log a constraint override.
     */
    logConstraintOverride(params: {
        tenantId: string;
        entityType: string;
        entityId: string;
        constraintId: string;
        guardExpression?: string;
        overriddenBy: string;
        overrideReason: string;
        authorizedBy?: string;
        ipAddress?: string;
        userAgent?: string;
        correlationId?: string;
    }): Promise<void>;
    /**
     * Core log entry creation.
     */
    log(params: AuditLogParams): Promise<void>;
    /**
     * Flush pending logs to the database.
     */
    flush(): Promise<void>;
    /**
     * Schedule a flush in the near future.
     */
    private scheduleFlush;
    /**
     * Map audit log params to Prisma create input.
     */
    private mapToPrismaCreate;
    /**
     * Extract entity ID from command result.
     */
    private extractEntityId;
    /**
     * Sanitize command input for logging.
     */
    private sanitizeInput;
    /**
     * Sanitize command result for logging.
     */
    private sanitizeOutput;
    /**
     * Query audit logs for a tenant.
     */
    queryLogs(params: {
        tenantId: string;
        operationType?: AuditOperationType;
        entityType?: string;
        entityId?: string;
        performedBy?: string;
        correlationId?: string;
        limit?: number;
        offset?: number;
    }): Promise<Array<{
        id: string;
        operationType: string;
        entityType: string | null;
        entityId: string | null;
        action: string;
        performedBy: string | null;
        performedAt: Date;
        status: string;
        errorMessage: string | null;
        durationMs: number | null;
    }>>;
}
/**
 * Create a tenant audit logger instance.
 */
export declare function createTenantAuditLogger(config: AuditLoggerConfig): TenantAuditLogger;
/**
 * Create a telemetry hook for manifest runtime integration.
 */
export declare function createAuditTelemetryHook(logger: TenantAuditLogger, context: {
    tenantId: string;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
}): {
    onCommandExecuted(command: IRCommand, result: CommandResult, entityName?: string): Promise<void>;
};
//# sourceMappingURL=tenant-audit-logger.d.ts.map