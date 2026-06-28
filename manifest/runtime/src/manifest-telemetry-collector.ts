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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Execution status for telemetry records.
 */
export type TelemetryStatus = "success" | "failure" | "guard_denied";

/**
 * Guard failure details.
 */
export interface GuardFailure {
  constraintId?: string;
  guardExpression: string;
  reason: string;
}

/**
 * Telemetry data collected during command execution.
 */
export interface CommandTelemetryData {
  actionExecMs?: number;
  causationId?: string;
  commandName: string;
  correlationId?: string;
  durationMs: number;
  entityName?: string;
  errorCode?: string;
  errorMessage?: string;
  eventsEmitted: number;
  failedGuards?: GuardFailure[];
  guardEvalMs?: number;
  guardsEvaluated: number;
  guardsFailed: number;
  guardsPassed: number;
  idempotencyKey?: string;
  instanceId?: string;
  ipAddress?: string;
  performedBy?: string;
  requestId?: string;
  status: TelemetryStatus;
  wasIdempotentHit?: boolean;
}

/**
 * Timing metrics for different phases of command execution.
 */
export interface CommandTimingMetrics {
  actionExecEnd?: number;
  actionExecStart?: number;
  guardEvalEnd?: number;
  guardEvalStart?: number;
  startTime: number;
}

/**
 * Context for collecting telemetry during command execution.
 */
export interface TelemetryContext {
  causationId?: string;
  correlationId?: string;
  ipAddress?: string;
  performedBy?: string;
  requestId?: string;
  tenantId: string;
}

/**
 * Prisma client interface for telemetry operations.
 */
export interface TelemetryPrismaClient {
  $transaction?: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  manifestCommandTelemetry: {
    create: (args: { data: unknown }) => Promise<{ id: string }>;
    createMany?: (args: {
      data: unknown[];
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
    findMany?: (args: {
      where?: unknown;
      select?: unknown;
    }) => Promise<unknown[]>;
  };
}

/**
 * Configuration for the telemetry collector.
 */
export interface TelemetryCollectorConfig {
  batchSize?: number; // Default: 50
  enabled?: boolean; // Default: true
  flushIntervalMs?: number; // Default: 5000
  prisma: TelemetryPrismaClient;
  sampleRate?: number; // 0.0 to 1.0, default: 1.0 (all)
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * In-memory buffer for telemetry records before batch write.
 */
interface TelemetryBuffer {
  flushTimeout: ReturnType<typeof setTimeout> | null;
  records: CommandTelemetryData[];
}

/**
 * Manifest Command Telemetry Collector.
 *
 * Collects and persists detailed execution metrics for manifest commands.
 * Uses batch writes to minimize database impact.
 */
export class ManifestTelemetryCollector {
  private prisma: TelemetryPrismaClient;
  private enabled: boolean;
  private sampleRate: number;
  private batchSize: number;
  private flushIntervalMs: number;
  private buffer: TelemetryBuffer;

  constructor(config: TelemetryCollectorConfig) {
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
  private shouldSample(): boolean {
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
  private extractGuardFailures(result: CommandResult): {
    failedGuards: GuardFailure[];
    guardsFailed: number;
  } {
    const failedGuards: GuardFailure[] = [];
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
            guardExpression: (guardMatch[1] ?? "").trim(),
            reason: errorStr,
          });
        } else {
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
            constraintId: (constraintMatch[1] ?? "").trim(),
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
  async recordCommandExecution(params: {
    telemetry: CommandTelemetryData;
    context: TelemetryContext;
  }): Promise<void> {
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
  async recordFromCommandResult(params: {
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
  }): Promise<void> {
    if (!this.shouldSample()) {
      return;
    }

    const {
      commandName,
      entityName,
      result,
      timingMetrics,
      context,
      options = {},
    } = params;

    // Calculate total duration
    const durationMs = Date.now() - timingMetrics.startTime;

    // Calculate phase durations if available
    const guardEvalMs =
      timingMetrics.guardEvalStart && timingMetrics.guardEvalEnd
        ? timingMetrics.guardEvalEnd - timingMetrics.guardEvalStart
        : undefined;

    const actionExecMs =
      timingMetrics.actionExecStart && timingMetrics.actionExecEnd
        ? timingMetrics.actionExecEnd - timingMetrics.actionExecStart
        : undefined;

    // Determine status
    let status: TelemetryStatus = "success";
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
    const telemetry: CommandTelemetryData = {
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
      guardsFailed:
        guardsFailed > 0
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
  async flush(): Promise<void> {
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
      if (
        this.prisma.manifestCommandTelemetry.createMany &&
        this.prisma.$transaction
      ) {
        await this.prisma.$transaction(async (tx) => {
          const txClient = tx as TelemetryPrismaClient;
          if (!txClient.manifestCommandTelemetry.createMany) {
            throw new Error("createMany not available");
          }
          await txClient.manifestCommandTelemetry.createMany({
            data: recordsToWrite.map((r) =>
              this.mapToPrismaCreate(r, recordsToWrite[0]?.correlationId ?? "")
            ),
            skipDuplicates: true,
          });
        });
      } else {
        // Fall back to sequential writes
        if (this.prisma.$transaction) {
          await this.prisma.$transaction(async (tx) => {
            const txClient = tx as TelemetryPrismaClient;
            for (const record of recordsToWrite) {
              await txClient.manifestCommandTelemetry.create({
                data: this.mapToPrismaCreate(
                  record,
                  record.correlationId ?? ""
                ),
              });
            }
          });
        } else {
          for (const record of recordsToWrite) {
            await this.prisma.manifestCommandTelemetry.create({
              data: this.mapToPrismaCreate(record, record.correlationId ?? ""),
            });
          }
        }
      }
    } catch (error) {
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
  private scheduleFlush(): void {
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
  private mapToPrismaCreate(
    telemetry: CommandTelemetryData,
    tenantId: string
  ): unknown {
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
  async shutdown(): Promise<void> {
    if (this.buffer.flushTimeout) {
      clearTimeout(this.buffer.flushTimeout);
      this.buffer.flushTimeout = null;
    }
    await this.flush();
  }

  /**
   * Get aggregate metrics for a tenant from persisted telemetry data.
   * Queries the manifestCommandTelemetry table and computes real aggregates.
   */
  async getAggregateMetrics(params: {
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
  }> {
    try {
      // Build the where clause from params
      const where: Record<string, unknown> = {
        tenant_id: params.tenantId,
      };
      if (params.commandName) {
        (where as Record<string, unknown>).command_name = params.commandName;
      }
      if (params.entityName) {
        (where as Record<string, unknown>).entity_name = params.entityName;
      }
      if (params.startDate || params.endDate) {
        const executedAt: Record<string, unknown> = {};
        if (params.startDate) {
          executedAt.gte = params.startDate;
        }
        if (params.endDate) {
          executedAt.lte = params.endDate;
        }
        where.executed_at = executedAt;
      }

      // Aggregate metrics from persisted telemetry
      const findMany = this.prisma.manifestCommandTelemetry.findMany;
      if (!findMany) {
        // findMany not available — return zeros gracefully
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
      const records = await findMany({
        where,
        select: {
          status: true,
          duration_ms: true,
          was_idempotent_hit: true,
        },
      });

      const rows = records as Array<{
        status: string;
        duration_ms: number | null;
        was_idempotent_hit: boolean;
      }>;

      const totalExecutions = rows.length;
      const commandsByStatus: Record<string, number> = {};
      let successCount = 0;
      let failureCount = 0;
      let guardDeniedCount = 0;
      const durations: number[] = [];
      let idempotentHits = 0;
      let idempotentTotal = 0;

      for (const row of rows) {
        // Count by status
        commandsByStatus[row.status] = (commandsByStatus[row.status] || 0) + 1;

        // Classify status
        if (row.status === "success") {
          successCount++;
        } else if (
          row.status === "guard_denied" ||
          row.status === "policy_denied"
        ) {
          guardDeniedCount++;
        } else {
          failureCount++;
        }

        // Collect durations for percentile calculation
        if (row.duration_ms != null && row.duration_ms > 0) {
          durations.push(row.duration_ms);
        }

        // Idempotency tracking
        idempotentTotal++;
        if (row.was_idempotent_hit) {
          idempotentHits++;
        }
      }

      // Sort durations for percentile calculation
      durations.sort((a, b) => a - b);

      const avgDurationMs =
        durations.length > 0
          ? Math.round(
              durations.reduce((sum, d) => sum + d, 0) / durations.length
            )
          : 0;

      const p95DurationMs = percentile(durations, 95);
      const p99DurationMs = percentile(durations, 99);

      const idempotencyHitRate =
        idempotentTotal > 0 ? idempotentHits / idempotentTotal : 0;

      return {
        totalExecutions,
        successCount,
        failureCount,
        guardDeniedCount,
        avgDurationMs,
        p95DurationMs,
        p99DurationMs,
        idempotencyHitRate,
        commandsByStatus,
      };
    } catch {
      // Graceful fallback — if the query fails (e.g. table doesn't exist yet),
      // return zeros rather than crashing the caller.
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the Nth percentile from a sorted array of numbers.
 * Returns 0 for empty arrays.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    return sorted[0]!;
  }
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const lowerValue = sorted[lower]!;
  const upperValue = sorted[upper]!;
  if (lower === upper) {
    return lowerValue;
  }
  // Linear interpolation between adjacent values
  return Math.round(
    lowerValue + (upperValue - lowerValue) * (index - lower)
  );
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create a telemetry collector instance.
 */
export function createTelemetryCollector(
  config: TelemetryCollectorConfig
): ManifestTelemetryCollector {
  return new ManifestTelemetryCollector(config);
}

/**
 * Default telemetry collector instance (singleton per request).
 * The actual singleton management is handled by the calling application.
 */
let defaultCollector: ManifestTelemetryCollector | null = null;

/**
 * Get or create the default telemetry collector.
 */
export function getTelemetryCollector(
  config: TelemetryCollectorConfig
): ManifestTelemetryCollector {
  if (!defaultCollector) {
    defaultCollector = new ManifestTelemetryCollector(config);
  }
  return defaultCollector;
}

/**
 * Reset the default telemetry collector (for testing).
 */
export function resetTelemetryCollector(): void {
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
export function createTimingMetrics(): CommandTimingMetrics {
  return {
    startTime: Date.now(),
  };
}

/**
 * Mark the start of guard evaluation.
 */
export function markGuardEvalStart(
  metrics: CommandTimingMetrics
): CommandTimingMetrics {
  return {
    ...metrics,
    guardEvalStart: Date.now(),
  };
}

/**
 * Mark the end of guard evaluation.
 */
export function markGuardEvalEnd(
  metrics: CommandTimingMetrics
): CommandTimingMetrics {
  return {
    ...metrics,
    guardEvalEnd: Date.now(),
  };
}

/**
 * Mark the start of action execution.
 */
export function markActionExecStart(
  metrics: CommandTimingMetrics
): CommandTimingMetrics {
  return {
    ...metrics,
    actionExecStart: Date.now(),
  };
}

/**
 * Mark the end of action execution.
 */
export function markActionExecEnd(
  metrics: CommandTimingMetrics
): CommandTimingMetrics {
  return {
    ...metrics,
    actionExecEnd: Date.now(),
  };
}
