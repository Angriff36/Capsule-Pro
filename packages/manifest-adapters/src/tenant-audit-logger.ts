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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Operation types that can be audited.
 */
export type AuditOperationType =
  | "manifest_command"
  | "projection_mutation"
  | "ai_plan_approval"
  | "policy_decision"
  | "constraint_override"
  | "direct_write";

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
    }) => Promise<{ id: string }>;
  };
  $transaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}

/**
 * Audit logger configuration.
 */
export interface AuditLoggerConfig {
  prisma: AuditPrismaClient;
  enableHashing?: boolean; // Enable tamper detection hashing
  redactSensitiveFields?: boolean; // Redact sensitive fields from logs
  batchSize?: number; // Batch writes for performance
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Fields that should be redacted from audit logs for security.
 */
const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "ssn",
  "creditCard",
  "personalData",
]);

/**
 * Recursively redact sensitive fields from an object.
 */
function redactSensitiveData(obj: unknown, redact = true): unknown {
  if (!redact) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, redact));
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.has(lowerKey)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = redactSensitiveData(value, redact);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Generate a hash for tamper detection.
 */
async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Tenant Audit Logger class.
 *
 * Provides comprehensive audit logging for all tenant-scoped operations.
 */
export class TenantAuditLogger {
  private prisma: AuditPrismaClient;
  private enableHashing: boolean;
  private redactSensitiveFields: boolean;
  private batchSize: number;
  private pendingLogs: Array<AuditLogParams> = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: AuditLoggerConfig) {
    this.prisma = config.prisma;
    this.enableHashing = config.enableHashing ?? true;
    this.redactSensitiveFields = config.redactSensitiveFields ?? true;
    this.batchSize = config.batchSize ?? 10;
  }

  /**
   * Log a manifest command execution.
   */
  async logManifestCommand(params: {
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
  }): Promise<void> {
    const {
      tenantId,
      entityName,
      command,
      result,
      performedBy,
      correlationId,
    } = params;

    // Sanitize output for logging
    const sanitizedOutput = this.sanitizeOutput(result);

    // Extract command name from IRCommand
    const cmdName =
      (command as unknown as { name?: string })?.name || "unknown";
    const cmdArgs =
      (command as unknown as { args?: Record<string, unknown> })?.args || {};

    await this.log({
      tenantId,
      operationType: "manifest_command",
      entityType: entityName,
      entityId: this.extractEntityId(result),
      action: `${entityName || "Unknown"}.${cmdName}`,
      performedBy,
      correlationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      input: this.sanitizeInput(cmdArgs),
      output: sanitizedOutput,
      status: result.success ? "success" : "failure",
      errorMessage: typeof result.error === "string" ? result.error : undefined,
      durationMs: params.durationMs,
      policyChecks: result.success
        ? {
            eventsEmitted: result.emittedEvents?.length || 0,
          }
        : undefined,
    });
  }

  /**
   * Log a projection mutation (board operations).
   */
  async logProjectionMutation(params: {
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
  }): Promise<void> {
    const {
      tenantId,
      mutationType,
      entityType,
      entityId,
      projectionId,
      performedBy,
      oldValue,
      newValue,
      status,
      errorMessage,
      durationMs,
      ipAddress,
      userAgent,
      correlationId,
    } = params;

    await this.log({
      tenantId,
      operationType: "projection_mutation",
      entityType,
      entityId,
      action: `BoardProjection.${mutationType}`,
      performedBy,
      correlationId,
      ipAddress,
      userAgent,
      oldValue: oldValue
        ? redactSensitiveData(oldValue, this.redactSensitiveFields)
        : undefined,
      newValue: newValue
        ? redactSensitiveData(newValue, this.redactSensitiveFields)
        : undefined,
      status,
      errorMessage,
      durationMs,
    });
  }

  /**
   * Log an AI plan approval.
   */
  async logAiPlanApproval(params: {
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
  }): Promise<void> {
    const {
      tenantId,
      planId,
      planTitle,
      stepCount,
      performedBy,
      status,
      result,
      errorMessage,
      durationMs,
      aiModel,
      aiConfidence,
      aiContext,
      ipAddress,
      userAgent,
      correlationId,
    } = params;

    await this.log({
      tenantId,
      operationType: "ai_plan_approval",
      entityType: "ManifestPlan",
      entityId: planId,
      action: "AIPlan.approve",
      performedBy,
      correlationId: correlationId || planId,
      ipAddress,
      userAgent,
      input: {
        planTitle,
        stepCount,
      },
      output: result
        ? {
            success: result.success,
            summary: result.summary,
            stepResults: result.stepResults,
            boardMutationResults: result.boardMutationResults,
          }
        : undefined,
      status,
      errorMessage,
      durationMs,
      aiModel,
      aiConfidence,
      aiContext,
    });
  }

  /**
   * Log a constraint override.
   */
  async logConstraintOverride(params: {
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
  }): Promise<void> {
    const {
      tenantId,
      entityType,
      entityId,
      constraintId,
      guardExpression,
      overriddenBy,
      overrideReason,
      authorizedBy,
      ipAddress,
      userAgent,
      correlationId,
    } = params;

    await this.log({
      tenantId,
      operationType: "constraint_override",
      entityType,
      entityId,
      action: "Constraint.override",
      performedBy: overriddenBy,
      correlationId,
      ipAddress,
      userAgent,
      input: {
        constraintId,
        guardExpression,
        overrideReason,
        authorizedBy,
      },
      status: "success",
    });
  }

  /**
   * Core log entry creation.
   */
  async log(params: AuditLogParams): Promise<void> {
    const logEntry = { ...params };

    // Redact sensitive fields
    logEntry.input = redactSensitiveData(
      logEntry.input,
      this.redactSensitiveFields
    );
    logEntry.output = redactSensitiveData(
      logEntry.output,
      this.redactSensitiveFields
    );
    logEntry.oldValue = redactSensitiveData(
      logEntry.oldValue,
      this.redactSensitiveFields
    );
    logEntry.newValue = redactSensitiveData(
      logEntry.newValue,
      this.redactSensitiveFields
    );

    // Generate immutable hash if enabled
    let immutableHash: string | undefined;
    if (this.enableHashing) {
      const hashData = JSON.stringify({
        tenantId: logEntry.tenantId,
        operationType: logEntry.operationType,
        action: logEntry.action,
        performedAt: new Date().toISOString(),
        input: logEntry.input,
        output: logEntry.output,
      });
      immutableHash = await generateHash(hashData);
    }

    // Add to pending batch
    this.pendingLogs.push({
      ...logEntry,
      immutableHash,
    } as AuditLogParams & { immutableHash?: string });

    // Flush if batch size reached
    if (this.pendingLogs.length >= this.batchSize) {
      await this.flush();
    } else {
      // Schedule a flush in the near future
      this.scheduleFlush();
    }
  }

  /**
   * Flush pending logs to the database.
   */
  async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) {
      return;
    }

    const logsToWrite = [...this.pendingLogs];
    this.pendingLogs = [];

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    try {
      // Use transaction if available for atomic writes
      if (this.prisma.$transaction) {
        await this.prisma.$transaction(async (tx) => {
          for (const log of logsToWrite) {
            await (tx as AuditPrismaClient).tenantAuditLog.create({
              data: this.mapToPrismaCreate(
                log as AuditLogParams & { immutableHash?: string }
              ),
            });
          }
        });
      } else {
        // Sequential writes without transaction
        for (const log of logsToWrite) {
          await this.prisma.tenantAuditLog.create({
            data: this.mapToPrismaCreate(
              log as AuditLogParams & { immutableHash?: string }
            ),
          });
        }
      }
    } catch (error) {
      // Re-queue failed logs
      this.pendingLogs.unshift(...logsToWrite);
      throw error;
    }
  }

  /**
   * Schedule a flush in the near future.
   */
  private scheduleFlush(): void {
    if (this.flushTimeout) {
      return;
    }

    this.flushTimeout = setTimeout(() => {
      void this.flush();
    }, 100); // 100ms batching window
  }

  /**
   * Map audit log params to Prisma create input.
   */
  private mapToPrismaCreate(
    params: AuditLogParams & { immutableHash?: string }
  ): Prisma.TenantAuditLogUncheckedCreateInput {
    return {
      tenantId: params.tenantId,
      operationType: params.operationType,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      correlationId: params.correlationId,
      performedBy: params.performedBy,
      performedAt: new Date(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestId: params.requestId,
      input: params.input as Prisma.InputJsonValue,
      output: params.output as Prisma.InputJsonValue,
      oldValue: params.oldValue as Prisma.InputJsonValue,
      newValue: params.newValue as Prisma.InputJsonValue,
      status: params.status,
      errorMessage: params.errorMessage,
      durationMs: params.durationMs,
      aiModel: params.aiModel,
      aiConfidence: params.aiConfidence,
      aiContext: params.aiContext as Prisma.InputJsonValue,
      policyChecks: params.policyChecks as Prisma.InputJsonValue,
      overrides: params.overrides as Prisma.InputJsonValue,
      immutableHash: params.immutableHash,
    };
  }

  /**
   * Extract entity ID from command result.
   */
  private extractEntityId(result: CommandResult): string | undefined {
    if (result.success && result.result) {
      const resultObj = result.result as { id?: string };
      return resultObj.id;
    }
    return undefined;
  }

  /**
   * Sanitize command input for logging.
   */
  private sanitizeInput(args: Record<string, unknown>): unknown {
    return redactSensitiveData(args, this.redactSensitiveFields);
  }

  /**
   * Sanitize command result for logging.
   */
  private sanitizeOutput(result: CommandResult): unknown {
    if (!result.success) {
      return {
        success: false,
        error:
          typeof result.error === "string" ? result.error : "Command failed",
      };
    }

    return {
      success: true,
      result: result.result,
      eventsEmitted: result.emittedEvents?.length || 0,
    };
  }

  /**
   * Query audit logs for a tenant.
   */
  async queryLogs(params: {
    tenantId: string;
    operationType?: AuditOperationType;
    entityType?: string;
    entityId?: string;
    performedBy?: string;
    correlationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    Array<{
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
    }>
  > {
    // This is a placeholder - actual implementation would be in the API layer
    // where the full Prisma client is available
    return [];
  }
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a tenant audit logger instance.
 */
export function createTenantAuditLogger(
  config: AuditLoggerConfig
): TenantAuditLogger {
  return new TenantAuditLogger(config);
}

/**
 * Create a telemetry hook for manifest runtime integration.
 */
export function createAuditTelemetryHook(
  logger: TenantAuditLogger,
  context: {
    tenantId: string;
    performedBy?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  }
) {
  const startTime = Date.now();

  return {
    async onCommandExecuted(
      command: IRCommand,
      result: CommandResult,
      entityName?: string
    ): Promise<void> {
      const durationMs = Date.now() - startTime;

      await logger.logManifestCommand({
        tenantId: context.tenantId,
        entityName,
        command,
        result,
        performedBy: context.performedBy,
        correlationId: context.correlationId,
        durationMs,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
    },
  };
}
