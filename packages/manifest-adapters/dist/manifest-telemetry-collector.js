/**
 * Manifest Command Telemetry Collector
 *
 * Collects detailed execution metrics for all manifest commands including:
 * - Latency tracking (total, guard evaluation, action execution)
 * - Guard failures (which guards failed and why)
 * - Idempotency key usage (cache hits/misses)
 * - Success/failure rates
 *
 * This data is used for operational monitoring and performance analysis.
 *
 * @packageDocumentation
 */
/**
 * Manifest Command Telemetry Collector.
 *
 * Collects and persists detailed execution metrics for manifest commands.
 * Uses batch writes to minimize database impact.
 */
export class ManifestTelemetryCollector {
    prisma;
    enabled;
    sampleRate;
    batchSize;
    flushIntervalMs;
    buffer;
    constructor(config) {
        this.prisma = config.prisma;
        this.enabled = config.enabled ?? true;
        this.sampleRate = config.sampleRate ?? 1.0;
        this.batchSize = config.batchSize ?? 50;
        this.flushIntervalMs = config.flushIntervalMs ?? 5000;
        this.buffer = {
            records: [],
            flushTimeout: null,
        };
        // Set up auto-flush interval
        if (this.enabled) {
            this.scheduleFlush();
        }
    }
    /**
     * Check if telemetry should be collected based on sample rate.
     */
    shouldSample() {
        if (!this.enabled) {
            return false;
        }
        if (this.sampleRate >= 1.0) {
            return true;
        }
        return Math.random() < this.sampleRate;
    }
    /**
     * Extract guard failure information from a command result.
     */
    extractGuardFailures(result) {
        const failedGuards = [];
        let guardsFailed = 0;
        if (!result.success && result.error) {
            // Parse error message for guard failure details
            const errorStr = String(result.error);
            // Check for guard denial pattern
            if (errorStr.includes("Guard") || errorStr.includes("denied")) {
                guardsFailed = 1;
                // Try to extract the guard expression
                const guardMatch = errorStr.match(/Guard[:\s]+([^\n]+)/i);
                if (guardMatch) {
                    failedGuards.push({
                        guardExpression: guardMatch[1].trim(),
                        reason: errorStr,
                    });
                }
                else {
                    failedGuards.push({
                        guardExpression: "unknown",
                        reason: errorStr,
                    });
                }
            }
            // Check for constraint violations
            if (errorStr.includes("constraint") || errorStr.includes("Constraint")) {
                const constraintMatch = errorStr.match(/Constraint[:\s]+([^\n:]+)/i);
                if (constraintMatch) {
                    failedGuards.push({
                        guardExpression: "constraint",
                        reason: errorStr,
                        constraintId: constraintMatch[1].trim(),
                    });
                    guardsFailed++;
                }
            }
        }
        return { failedGuards, guardsFailed };
    }
    /**
     * Record command execution telemetry.
     */
    async recordCommandExecution(params) {
        if (!this.shouldSample()) {
            return;
        }
        const { telemetry, context } = params;
        // Add to buffer
        this.buffer.records.push({
            ...telemetry,
            performedBy: telemetry.performedBy ?? context.performedBy,
            correlationId: telemetry.correlationId ?? context.correlationId,
            causationId: telemetry.causationId ?? context.causationId,
            requestId: telemetry.requestId ?? context.requestId,
            ipAddress: telemetry.ipAddress ?? context.ipAddress,
        });
        // Flush if batch size reached
        if (this.buffer.records.length >= this.batchSize) {
            await this.flush();
        }
    }
    /**
     * Record command execution from runtime hook data.
     * This is the main entry point called by the telemetry hooks.
     */
    async recordFromCommandResult(params) {
        if (!this.shouldSample()) {
            return;
        }
        const { commandName, entityName, result, timingMetrics, context, options = {}, } = params;
        // Calculate total duration
        const durationMs = Date.now() - timingMetrics.startTime;
        // Calculate phase durations if available
        const guardEvalMs = timingMetrics.guardEvalStart && timingMetrics.guardEvalEnd
            ? timingMetrics.guardEvalEnd - timingMetrics.guardEvalStart
            : undefined;
        const actionExecMs = timingMetrics.actionExecStart && timingMetrics.actionExecEnd
            ? timingMetrics.actionExecEnd - timingMetrics.actionExecStart
            : undefined;
        // Determine status
        let status = "success";
        if (!result.success) {
            const errorStr = String(result.error);
            status =
                errorStr.includes("Guard") || errorStr.includes("denied")
                    ? "guard_denied"
                    : "failure";
        }
        // Extract guard failures
        const { failedGuards, guardsFailed } = this.extractGuardFailures(result);
        // Build telemetry record
        const telemetry = {
            commandName,
            entityName,
            instanceId: options.instanceId,
            status,
            errorMessage: result.success ? undefined : String(result.error),
            durationMs,
            guardEvalMs,
            actionExecMs,
            guardsEvaluated: options.guardsEvaluated ?? 0,
            guardsPassed: options.guardsPassed ?? 0,
            guardsFailed: guardsFailed > 0
                ? guardsFailed
                : status === "guard_denied"
                    ? 1
                    : options.guardsEvaluated && options.guardsPassed
                        ? (options.guardsEvaluated ?? 0) - options.guardsPassed
                        : 0,
            failedGuards: failedGuards.length > 0 ? failedGuards : undefined,
            idempotencyKey: options.idempotencyKey,
            wasIdempotentHit: options.wasIdempotentHit,
            eventsEmitted: result.emittedEvents?.length ?? 0,
        };
        await this.recordCommandExecution({ telemetry, context });
    }
    /**
     * Flush buffered records to the database.
     */
    async flush() {
        if (this.buffer.records.length === 0) {
            return;
        }
        const recordsToWrite = [...this.buffer.records];
        this.buffer.records = [];
        if (this.buffer.flushTimeout) {
            clearTimeout(this.buffer.flushTimeout);
            this.buffer.flushTimeout = null;
        }
        try {
            // Try batch insert first
            if (this.prisma.manifestCommandTelemetry.createMany &&
                this.prisma.$transaction) {
                await this.prisma.$transaction(async (tx) => {
                    const txClient = tx;
                    if (!txClient.manifestCommandTelemetry.createMany) {
                        throw new Error("createMany not available");
                    }
                    await txClient.manifestCommandTelemetry.createMany({
                        data: recordsToWrite.map((r) => this.mapToPrismaCreate(r, recordsToWrite[0].correlationId ?? "")),
                        skipDuplicates: true,
                    });
                });
            }
            else {
                // Fall back to sequential writes
                if (this.prisma.$transaction) {
                    await this.prisma.$transaction(async (tx) => {
                        const txClient = tx;
                        for (const record of recordsToWrite) {
                            await txClient.manifestCommandTelemetry.create({
                                data: this.mapToPrismaCreate(record, record.correlationId ?? ""),
                            });
                        }
                    });
                }
                else {
                    for (const record of recordsToWrite) {
                        await this.prisma.manifestCommandTelemetry.create({
                            data: this.mapToPrismaCreate(record, record.correlationId ?? ""),
                        });
                    }
                }
            }
        }
        catch (error) {
            // Re-queue failed records
            this.buffer.records.unshift(...recordsToWrite);
            throw error;
        }
        // Schedule next flush
        this.scheduleFlush();
    }
    /**
     * Schedule a flush in the near future.
     */
    scheduleFlush() {
        if (this.buffer.flushTimeout || !this.enabled) {
            return;
        }
        this.buffer.flushTimeout = setTimeout(() => {
            void this.flush();
        }, this.flushIntervalMs);
    }
    /**
     * Map telemetry data to Prisma create input.
     */
    mapToPrismaCreate(telemetry, tenantId) {
        return {
            tenantId,
            commandName: telemetry.commandName,
            entityName: telemetry.entityName,
            instanceId: telemetry.instanceId,
            status: telemetry.status,
            errorMessage: telemetry.errorMessage,
            errorCode: telemetry.errorCode,
            durationMs: telemetry.durationMs,
            guardEvalMs: telemetry.guardEvalMs,
            actionExecMs: telemetry.actionExecMs,
            guardsEvaluated: telemetry.guardsEvaluated,
            guardsPassed: telemetry.guardsPassed,
            guardsFailed: telemetry.guardsFailed,
            failedGuards: telemetry.failedGuards,
            idempotencyKey: telemetry.idempotencyKey,
            wasIdempotentHit: telemetry.wasIdempotentHit,
            eventsEmitted: telemetry.eventsEmitted,
            performedBy: telemetry.performedBy,
            correlationId: telemetry.correlationId,
            causationId: telemetry.causationId,
            requestId: telemetry.requestId,
            ipAddress: telemetry.ipAddress,
        };
    }
    /**
     * Clean up resources (call before shutting down).
     */
    async shutdown() {
        if (this.buffer.flushTimeout) {
            clearTimeout(this.buffer.flushTimeout);
            this.buffer.flushTimeout = null;
        }
        await this.flush();
    }
    /**
     * Get aggregate metrics for a tenant.
     */
    async getAggregateMetrics(params) {
        // This would be implemented in a separate query module
        // For now, return placeholder
        return {
            totalExecutions: 0,
            successCount: 0,
            failureCount: 0,
            guardDeniedCount: 0,
            avgDurationMs: 0,
            p95DurationMs: 0,
            p99DurationMs: 0,
            idempotencyHitRate: 0,
            commandsByStatus: {},
        };
    }
}
// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------
/**
 * Create a telemetry collector instance.
 */
export function createTelemetryCollector(config) {
    return new ManifestTelemetryCollector(config);
}
/**
 * Default telemetry collector instance (singleton per request).
 * The actual singleton management is handled by the calling application.
 */
let defaultCollector = null;
/**
 * Get or create the default telemetry collector.
 */
export function getTelemetryCollector(config) {
    if (!defaultCollector) {
        defaultCollector = new ManifestTelemetryCollector(config);
    }
    return defaultCollector;
}
/**
 * Reset the default telemetry collector (for testing).
 */
export function resetTelemetryCollector() {
    if (defaultCollector) {
        void defaultCollector.shutdown();
        defaultCollector = null;
    }
}
// ---------------------------------------------------------------------------
// Timing utilities
// ---------------------------------------------------------------------------
/**
 * Create a new timing metrics tracker.
 */
export function createTimingMetrics() {
    return {
        startTime: Date.now(),
    };
}
/**
 * Mark the start of guard evaluation.
 */
export function markGuardEvalStart(metrics) {
    return {
        ...metrics,
        guardEvalStart: Date.now(),
    };
}
/**
 * Mark the end of guard evaluation.
 */
export function markGuardEvalEnd(metrics) {
    return {
        ...metrics,
        guardEvalEnd: Date.now(),
    };
}
/**
 * Mark the start of action execution.
 */
export function markActionExecStart(metrics) {
    return {
        ...metrics,
        actionExecStart: Date.now(),
    };
}
/**
 * Mark the end of action execution.
 */
export function markActionExecEnd(metrics) {
    return {
        ...metrics,
        actionExecEnd: Date.now(),
    };
}
