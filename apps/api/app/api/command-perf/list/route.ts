// Command Performance API Route
//
// Per-command latency percentiles (P50/P95/P99) for governed Manifest commands.
// Reads the wall-clock `duration_ms` the dispatcher already records for every
// settled command in `tenant_admin.reaction_logs` (written by the runtime's
// onCommandSettled telemetry) and aggregates it with Postgres' native
// `percentile_cont`. This is a READ PATH over an operational/observability log
// (constitution §10) — it never mutates governed state.
//
// ponytail: no separate command_perf rollup table or cron — reaction_logs is
// already the per-command timing store and percentile_cont computes the rolling
// summary on demand. Add a materialized rollup only if this query measurably
// slows at scale (it scans the [tenantId, entity, command, createdAt] index).

import { auth } from "@repo/auth/server";
import { Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

/** Default P95 alert threshold (ms). Override with MANIFEST_PERF_P95_THRESHOLD_MS. */
const DEFAULT_P95_THRESHOLD_MS =
  Number(process.env.MANIFEST_PERF_P95_THRESHOLD_MS) || 2000;

/** Default rolling window (hours) over which percentiles are computed. */
const DEFAULT_WINDOW_HOURS = 24;
const MAX_WINDOW_HOURS = 720; // 30 days

export interface CommandPerfRow {
  avg: number;
  /** True when P95 exceeds the configured threshold — the alert signal. */
  breachesThreshold: boolean;
  /** Command name (e.g. "create", "applyPayment"). */
  command: string;
  /** Number of executions in the window. */
  count: number;
  /** Triggering command's entity (e.g. "Event"). Null when the IR omits it. */
  entity: string | null;
  /** Failed executions in the window. */
  failures: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

// GET /api/command-perf/list — per-command latency percentiles, ranked by P95.
//
// Query params:
//   windowHours — rolling window for the aggregation (default 24, max 720)
//   thresholdMs — P95 alert threshold (default MANIFEST_PERF_P95_THRESHOLD_MS or 2000)
//   minCount    — drop commands with fewer than N samples (default 1)
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const windowHours = Math.min(
      Math.max(
        Number(searchParams.get("windowHours")) || DEFAULT_WINDOW_HOURS,
        1
      ),
      MAX_WINDOW_HOURS
    );
    const thresholdMs = Math.max(
      Number(searchParams.get("thresholdMs")) || DEFAULT_P95_THRESHOLD_MS,
      1
    );
    const minCount = Math.max(Number(searchParams.get("minCount")) || 1, 1);

    const rows = await database.$queryRaw<
      Array<{
        entity: string | null;
        command: string;
        count: number;
        failures: number;
        p50: number;
        p95: number;
        p99: number;
        max: number;
        avg: number;
      }>
    >(Prisma.sql`
      SELECT
        entity,
        command,
        count(*)::int AS count,
        count(*) FILTER (WHERE status = 'failed')::int AS failures,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::int AS p50,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95,
        percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms)::int AS p99,
        max(duration_ms)::int AS max,
        round(avg(duration_ms))::int AS avg
      FROM tenant_admin.reaction_logs
      WHERE tenant_id = ${tenantId}::uuid
        AND duration_ms IS NOT NULL
        AND created_at >= now() - make_interval(hours => ${windowHours}::int)
      GROUP BY entity, command
      HAVING count(*) >= ${minCount}
      ORDER BY p95 DESC
    `);

    const commands: CommandPerfRow[] = rows.map((r) => ({
      ...r,
      breachesThreshold: r.p95 > thresholdMs,
    }));
    const breaches = commands.filter((c) => c.breachesThreshold);

    // Emit an alert: surface slow commands to server logs / monitoring. The
    // dashboard reads `breachCount`/`breachesThreshold` to render the banner.
    if (breaches.length > 0) {
      log.warn(
        `[command-perf] ${breaches.length} command(s) exceeded P95 ${thresholdMs}ms over last ${windowHours}h`,
        {
          tenantId,
          thresholdMs,
          windowHours,
          breaches: breaches.map(
            (b) => `${b.entity ?? "?"}.${b.command}=${b.p95}ms`
          ),
        }
      );
    }

    return manifestSuccessResponse({
      commands,
      thresholdMs,
      windowHours,
      breachCount: breaches.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    captureException(error);
    log.error("Error computing command perf:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
