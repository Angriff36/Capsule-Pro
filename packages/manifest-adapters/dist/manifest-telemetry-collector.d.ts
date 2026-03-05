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
import type { CommandResult } from "@angriff36/manifest";
/**
 * Execution status for telemetry records.
 */
export type TelemetryStatus = "success" | "failure" | "guard_denied";
/**
 * Guard failure details.
 */
export interface GuardFailure {
    guardExpression: string;
    reason: string;
    constraintId?: string;
}
/**
 * Telemetry data collected during command execution.
 */
export interface CommandTelemetryData {
    commandName: string;
    entityName?: string;
    instanceId?: string;
    status: TelemetryStatus;
    errorMessage?: string;
    errorCode?: string;
    durationMs: number;
    guardEvalMs?: number;
    actionExecMs?: number;
    guardsEvaluated: number;
    guardsPassed: number;
    guardsFailed: number;
    failedGuards?: GuardFailure[];
    idempotencyKey?: string;
    wasIdempotentHit?: boolean;
    eventsEmitted: number;
    performedBy?: string;
    correlationId?: string;
    causationId?: string;
    requestId?: string;
    ipAddress?: string;
}
/**
 * Timing metrics for different phases of command execution.
 */
export interface CommandTimingMetrics {
    startTime: number;
    guardEvalStart?: number;
    guardEvalEnd?: number;
    actionExecStart?: number;
    actionExecEnd?: number;
}
/**
 * Context for collecting telemetry during command execution.
 */
export interface TelemetryContext {
    tenantId: string;
    performedBy?: string;
    correlationId?: string;
    causationId?: string;
    requestId?: string;
    ipAddress?: string;
}
/**
 * Prisma client interface for telemetry operations.
 */
export interface TelemetryPrismaClient {
    manifestCommandTelemetry: {
        create: (args: {
            data: unknown;
        }) => Promise<{
            id: string;
        }>;
        createMany?: (args: {
            data: unknown[];
            skipDuplicates?: boolean;
        }) => Promise<{
            count: number;
        }>;
    };
    $transaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
}
/**
 * Configuration for the telemetry collector.
 */
export interface TelemetryCollectorConfig {
    prisma: TelemetryPrismaClient;
    enabled?: boolean;
    sampleRate?: number;
    batchSize?: number;
    flushIntervalMs?: number;
}
/**
 * Manifest Command Telemetry Collector.
 *
 * Collects and persists detailed execution metrics for manifest commands.
 * Uses batch writes to minimize database impact.
 */
export declare class ManifestTelemetryCollector {
    private prisma;
    private enabled;
    private sampleRate;
    private batchSize;
    private flushIntervalMs;
    private buffer;
    constructor(config: TelemetryCollectorConfig);
    /**
     * Check if telemetry should be collected based on sample rate.
     */
    private shouldSample;
    /**
     * Extract guard failure information from a command result.
     */
    private extractGuardFailures;
    /**
     * Record command execution telemetry.
     */
    recordCommandExecution(params: {
        telemetry: CommandTelemetryData;
        context: TelemetryContext;
    }): Promise<void>;
    /**
     * Record command execution from runtime hook data.
     * This is the main entry point called by the telemetry hooks.
     */
    recordFromCommandResult(params: {
        commandName: string;
        entityName?: string;
        result: CommandResult;
        timingMetrics: CommandTimingMetrics;
        context: TelemetryContext;
        options?: {
            instanceId?: string;
            idempotencyKey?: string;
            wasIdempotentHit?: boolean;
            guardsEvaluated?: number;
            guardsPassed?: number;
        };
    }): Promise<void>;
    /**
     * Flush buffered records to the database.
     */
    flush(): Promise<void>;
    /**
     * Schedule a flush in the near future.
     */
    private scheduleFlush;
    /**
     * Map telemetry data to Prisma create input.
     */
    private mapToPrismaCreate;
    /**
     * Clean up resources (call before shutting down).
     */
    shutdown(): Promise<void>;
    /**
     * Get aggregate metrics for a tenant.
     */
    getAggregateMetrics(params: {
        tenantId: string;
        commandName?: string;
        entityName?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        totalExecutions: number;
        successCount: number;
        failureCount: number;
        guardDeniedCount: number;
        avgDurationMs: number;
        p95DurationMs: number;
        p99DurationMs: number;
        idempotencyHitRate: number;
        commandsByStatus: Record<string, number>;
    }>;
}
/**
 * Create a telemetry collector instance.
 */
export declare function createTelemetryCollector(config: TelemetryCollectorConfig): ManifestTelemetryCollector;
/**
 * Get or create the default telemetry collector.
 */
export declare function getTelemetryCollector(config: TelemetryCollectorConfig): ManifestTelemetryCollector;
/**
 * Reset the default telemetry collector (for testing).
 */
export declare function resetTelemetryCollector(): void;
/**
 * Create a new timing metrics tracker.
 */
export declare function createTimingMetrics(): CommandTimingMetrics;
/**
 * Mark the start of guard evaluation.
 */
export declare function markGuardEvalStart(metrics: CommandTimingMetrics): CommandTimingMetrics;
/**
 * Mark the end of guard evaluation.
 */
export declare function markGuardEvalEnd(metrics: CommandTimingMetrics): CommandTimingMetrics;
/**
 * Mark the start of action execution.
 */
export declare function markActionExecStart(metrics: CommandTimingMetrics): CommandTimingMetrics;
/**
 * Mark the end of action execution.
 */
export declare function markActionExecEnd(metrics: CommandTimingMetrics): CommandTimingMetrics;
//# sourceMappingURL=manifest-telemetry-collector.d.ts.map