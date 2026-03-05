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
function redactSensitiveData(obj, redact = true) {
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
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const lowerKey = key.toLowerCase();
            if (SENSITIVE_FIELDS.has(lowerKey)) {
                result[key] = "[REDACTED]";
            }
            else {
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
async function generateHash(data) {
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
    prisma;
    enableHashing;
    redactSensitiveFields;
    batchSize;
    pendingLogs = [];
    flushTimeout = null;
    constructor(config) {
        this.prisma = config.prisma;
        this.enableHashing = config.enableHashing ?? true;
        this.redactSensitiveFields = config.redactSensitiveFields ?? true;
        this.batchSize = config.batchSize ?? 10;
    }
    /**
     * Log a manifest command execution.
     */
    async logManifestCommand(params) {
        const { tenantId, entityName, command, result, performedBy, correlationId, } = params;
        // Sanitize output for logging
        const sanitizedOutput = this.sanitizeOutput(result);
        // Extract command name from IRCommand
        const cmdName = command?.name || "unknown";
        const cmdArgs = command?.args || {};
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
    async logProjectionMutation(params) {
        const { tenantId, mutationType, entityType, entityId, projectionId, performedBy, oldValue, newValue, status, errorMessage, durationMs, ipAddress, userAgent, correlationId, } = params;
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
    async logAiPlanApproval(params) {
        const { tenantId, planId, planTitle, stepCount, performedBy, status, result, errorMessage, durationMs, aiModel, aiConfidence, aiContext, ipAddress, userAgent, correlationId, } = params;
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
    async logConstraintOverride(params) {
        const { tenantId, entityType, entityId, constraintId, guardExpression, overriddenBy, overrideReason, authorizedBy, ipAddress, userAgent, correlationId, } = params;
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
    async log(params) {
        const logEntry = { ...params };
        // Redact sensitive fields
        logEntry.input = redactSensitiveData(logEntry.input, this.redactSensitiveFields);
        logEntry.output = redactSensitiveData(logEntry.output, this.redactSensitiveFields);
        logEntry.oldValue = redactSensitiveData(logEntry.oldValue, this.redactSensitiveFields);
        logEntry.newValue = redactSensitiveData(logEntry.newValue, this.redactSensitiveFields);
        // Generate immutable hash if enabled
        let immutableHash;
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
        });
        // Flush if batch size reached
        if (this.pendingLogs.length >= this.batchSize) {
            await this.flush();
        }
        else {
            // Schedule a flush in the near future
            this.scheduleFlush();
        }
    }
    /**
     * Flush pending logs to the database.
     */
    async flush() {
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
                        await tx.tenantAuditLog.create({
                            data: this.mapToPrismaCreate(log),
                        });
                    }
                });
            }
            else {
                // Sequential writes without transaction
                for (const log of logsToWrite) {
                    await this.prisma.tenantAuditLog.create({
                        data: this.mapToPrismaCreate(log),
                    });
                }
            }
        }
        catch (error) {
            // Re-queue failed logs
            this.pendingLogs.unshift(...logsToWrite);
            throw error;
        }
    }
    /**
     * Schedule a flush in the near future.
     */
    scheduleFlush() {
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
    mapToPrismaCreate(params) {
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
            input: params.input,
            output: params.output,
            oldValue: params.oldValue,
            newValue: params.newValue,
            status: params.status,
            errorMessage: params.errorMessage,
            durationMs: params.durationMs,
            aiModel: params.aiModel,
            aiConfidence: params.aiConfidence,
            aiContext: params.aiContext,
            policyChecks: params.policyChecks,
            overrides: params.overrides,
            immutableHash: params.immutableHash,
        };
    }
    /**
     * Extract entity ID from command result.
     */
    extractEntityId(result) {
        if (result.success && result.result) {
            const resultObj = result.result;
            return resultObj.id;
        }
        return undefined;
    }
    /**
     * Sanitize command input for logging.
     */
    sanitizeInput(args) {
        return redactSensitiveData(args, this.redactSensitiveFields);
    }
    /**
     * Sanitize command result for logging.
     */
    sanitizeOutput(result) {
        if (!result.success) {
            return {
                success: false,
                error: typeof result.error === "string" ? result.error : "Command failed",
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
    async queryLogs(params) {
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
export function createTenantAuditLogger(config) {
    return new TenantAuditLogger(config);
}
/**
 * Create a telemetry hook for manifest runtime integration.
 */
export function createAuditTelemetryHook(logger, context) {
    const startTime = Date.now();
    return {
        async onCommandExecuted(command, result, entityName) {
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
