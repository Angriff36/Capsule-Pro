/**
 * Manifest Command Telemetry API
 *
 * Provides query endpoints for accessing detailed execution metrics
 * for all manifest commands including latency, guard failures,
 * idempotency usage, and success/failure rates.
 *
 * @packageDocumentation
 */

import { auth } from "@clerk/nextjs/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { createTenantContext } from "@/app/lib/tenant";

/**
 * GET /api/manifest/telemetry
 *
 * Query manifest command telemetry metrics with optional filters.
 *
 * Query parameters:
 * - commandName: Filter by specific command name
 * - entityName: Filter by entity name
 * - status: Filter by status (success, failure, guard_denied)
 * - startDate: Start of date range (ISO 8601)
 * - endDate: End of date range (ISO 8601)
 * - aggregate: If 'true', return aggregated metrics instead of raw records
 * - limit: Maximum number of records to return (default: 100, max: 1000)
 * - offset: Number of records to skip for pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantContext = await createTenantContext();

    if (!tenantContext) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const commandName = searchParams.get("commandName");
    const entityName = searchParams.get("entityName");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const aggregate = searchParams.get("aggregate") === "true";
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") ?? "100", 10),
      1000
    );
    const offset = Number.parseInt(searchParams.get("offset") ?? "0", 10);

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId: tenantContext.tenantId,
    };

    if (commandName) {
      where.commandName = commandName;
    }

    if (entityName) {
      where.entityName = entityName;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.executedAt = {};
      if (startDate) {
        (where.executedAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.executedAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Return aggregated metrics if requested
    if (aggregate) {
      const telemetryRecords = await database.manifestCommandTelemetry.findMany(
        {
          where,
          orderBy: { executedAt: "desc" },
          // For aggregation, we may need to fetch more records
          take: Math.min(limit * 10, 10_000),
        }
      );

      const aggregates = calculateAggregates(telemetryRecords);

      return NextResponse.json({
        aggregates,
        metadata: {
          totalRecords: telemetryRecords.length,
          filters: {
            commandName,
            entityName,
            status,
            startDate,
            endDate,
          },
        },
      });
    }

    // Return raw telemetry records with pagination
    const [records, totalCount] = await Promise.all([
      database.manifestCommandTelemetry.findMany({
        where,
        orderBy: { executedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.manifestCommandTelemetry.count({ where }),
    ]);

    return NextResponse.json({
      records,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("[ManifestTelemetry] GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch telemetry data",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate aggregate metrics from telemetry records.
 */
function calculateAggregates(
  records: Array<{
    status: string;
    durationMs: number;
    guardEvalMs: number | null;
    actionExecMs: number | null;
    guardsEvaluated: number;
    guardsPassed: number;
    guardsFailed: number;
    eventsEmitted: number;
    idempotencyKey: string | null;
    wasIdempotentHit: boolean | null;
    commandName: string;
    entityName: string | null;
  }>
) {
  if (records.length === 0) {
    return {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      guardDeniedCount: 0,
      avgDurationMs: 0,
      medianDurationMs: 0,
      p95DurationMs: 0,
      p99DurationMs: 0,
      minDurationMs: 0,
      maxDurationMs: 0,
      avgGuardEvalMs: 0,
      avgActionExecMs: 0,
      totalGuardsEvaluated: 0,
      totalGuardsPassed: 0,
      totalGuardsFailed: 0,
      totalEventsEmitted: 0,
      idempotencyUsage: {
        totalWithKey: 0,
        cacheHits: 0,
        cacheMisses: 0,
        hitRate: 0,
      },
      commandsByStatus: {} as Record<string, number>,
      commandsByName: {} as Record<string, number>,
      commandsByEntity: {} as Record<string, number>,
    };
  }

  const successCount = records.filter((r) => r.status === "success").length;
  const failureCount = records.filter((r) => r.status === "failure").length;
  const guardDeniedCount = records.filter(
    (r) => r.status === "guard_denied"
  ).length;

  const durations = records.map((r) => r.durationMs).sort((a, b) => a - b);
  const avgDurationMs =
    durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const medianDurationMs = durations[Math.floor(durations.length / 2)];
  const p95DurationMs = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99DurationMs = durations[Math.floor(durations.length * 0.99)] || 0;

  const guardEvalDurations = records
    .map((r) => r.guardEvalMs)
    .filter((d): d is number => d !== null);
  const avgGuardEvalMs =
    guardEvalDurations.length > 0
      ? guardEvalDurations.reduce((sum, d) => sum + d, 0) /
        guardEvalDurations.length
      : 0;

  const actionExecDurations = records
    .map((r) => r.actionExecMs)
    .filter((d): d is number => d !== null);
  const avgActionExecMs =
    actionExecDurations.length > 0
      ? actionExecDurations.reduce((sum, d) => sum + d, 0) /
        actionExecDurations.length
      : 0;

  const totalGuardsEvaluated = records.reduce(
    (sum, r) => sum + r.guardsEvaluated,
    0
  );
  const totalGuardsPassed = records.reduce((sum, r) => sum + r.guardsPassed, 0);
  const totalGuardsFailed = records.reduce((sum, r) => sum + r.guardsFailed, 0);

  const totalEventsEmitted = records.reduce(
    (sum, r) => sum + r.eventsEmitted,
    0
  );

  const withIdempotencyKey = records.filter((r) => r.idempotencyKey);
  const idempotencyHits = records.filter(
    (r) => r.wasIdempotentHit === true
  ).length;
  const idempotencyMisses = records.filter(
    (r) => r.idempotencyKey && r.wasIdempotentHit === false
  ).length;

  const commandsByStatus: Record<string, number> = {};
  const commandsByName: Record<string, number> = {};
  const commandsByEntity: Record<string, number> = {};

  for (const record of records) {
    commandsByStatus[record.status] =
      (commandsByStatus[record.status] || 0) + 1;
    commandsByName[record.commandName] =
      (commandsByName[record.commandName] || 0) + 1;
    if (record.entityName) {
      commandsByEntity[record.entityName] =
        (commandsByEntity[record.entityName] || 0) + 1;
    }
  }

  return {
    totalExecutions: records.length,
    successCount,
    failureCount,
    guardDeniedCount,
    avgDurationMs: Math.round(avgDurationMs),
    medianDurationMs,
    p95DurationMs,
    p99DurationMs,
    minDurationMs: durations[0],
    maxDurationMs: durations[durations.length - 1],
    avgGuardEvalMs: Math.round(avgGuardEvalMs),
    avgActionExecMs: Math.round(avgActionExecMs),
    totalGuardsEvaluated,
    totalGuardsPassed,
    totalGuardsFailed,
    totalEventsEmitted,
    idempotencyUsage: {
      totalWithKey: withIdempotencyKey.length,
      cacheHits: idempotencyHits,
      cacheMisses: idempotencyMisses,
      hitRate:
        withIdempotencyKey.length > 0
          ? idempotencyHits / withIdempotencyKey.length
          : 0,
    },
    commandsByStatus,
    commandsByName,
    commandsByEntity,
  };
}
