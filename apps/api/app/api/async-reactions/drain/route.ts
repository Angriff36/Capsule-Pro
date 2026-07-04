/**
 * Async Reaction Queue — worker drain endpoint.
 *
 * POST /api/async-reactions/drain
 *
 * Drains one batch from the durable async-reaction queue. Intended to be
 * invoked by a cron scheduler (Vercel Cron, GitHub Actions, etc.) at a fixed
 * cadence (e.g. every 30s). Each invocation claims up to `batchSize` pending
 * jobs, dispatches them through the registered handlers via a tenant-scoped
 * Manifest runtime, and reports the outcome.
 *
 * Auth: CRON_SECRET bearer token. The drain runs as a system principal — it
 * builds a fresh runtime per job using the job's captured `tenantId` +
 * `actorId`, so governed dispatch + audit attribution are preserved.
 *
 * Behavior when no DB / no queue configured: returns 200 with `{ skipped: true }`
 * (dev/test environments without the queue wired).
 *
 * Failure policy: per-job failures are handled inside `drainAsyncReactions`
 * (retry with exponential backoff → DLQ + alerting). The route itself only
 * returns 5xx on a queue infrastructure fault.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import {
  drainAsyncReactions,
  type AsyncReactionHandlerContext,
  type AsyncReactionJob,
} from "@repo/manifest-runtime/async-reactions";
import {
  buildStoreProvider,
} from "@repo/manifest-runtime/manifest-runtime-factory";
import {
  createManifestRuntime,
  getAsyncReactionStore,
} from "@/lib/manifest-runtime";
import { createManifestRuntimeLogger } from "@/lib/manifest/manifest-runtime-log";
import type { RuntimeEngine } from "@angriff36/manifest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DrainRequestBody {
  batchSize?: number;
}

/**
 * Build a tenant-scoped runtime for a job and return the bound dispatch +
 * store provider the worker needs. Constructs a fresh runtime per job (typical
 * case: the drain spans multiple tenants). Throws on construction failure so
 * the worker's retry path engages.
 */
async function buildHandlerContext(job: AsyncReactionJob): Promise<
  Pick<AsyncReactionHandlerContext, "dispatchCommand" | "storeProvider">
> {
  const engine: RuntimeEngine = await createManifestRuntime({
    user: {
      id: job.actorId ?? "system",
      tenantId: job.tenantId,
      role: "system",
    },
    entityName: undefined,
  });

  // Build a tenant-scoped store provider bound to the SAME database + tenant
  // as the engine. Handlers use it for raw entity reads (load source rows);
  // governed writes go through engine.runCommand (constitution §6 + §10).
  const storeProvider = buildStoreProvider(
    database,
    job.tenantId,
    job.actorId ?? "system",
    createManifestRuntimeLogger()
  );

  return {
    dispatchCommand: (commandName, input, options) =>
      engine
        .runCommand(commandName, input, options)
        .then((result) => ({
          success: result.success,
          error: (result as { error?: string }).error,
          emittedEvents: result.emittedEvents as unknown[],
        })),
    storeProvider,
  };
}

/**
 * Run one drain batch. Shared by POST (manual/worker) and GET (Vercel Cron —
 * cron requests are GET-only, matching the /outbox/publish pattern).
 */
async function runDrain(batchSize: number): Promise<Response> {
  const store = getAsyncReactionStore();
  if (!store) {
    // No DB / queue not wired (dev, test). Not an error — cron pings should
    // be cheap no-ops in this state.
    return NextResponse.json({ skipped: true, reason: "queue-not-configured" });
  }

  const result = await drainAsyncReactions({
    store,
    batchSize,
    buildHandlerContext,
    log,
    captureException,
  });

  return NextResponse.json({ data: result });
}

/**
 * POST /api/async-reactions/drain
 *
 * Headers: `Authorization: Bearer <CRON_SECRET>`
 * Body (optional): `{ batchSize?: number }` (default 25, max 100)
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Auth: CRON_SECRET bearer token. Falls back to Clerk auth() when the
    // secret is unset (local dev convenience — never relied on in prod).
    const authHeader = request.headers.get("authorization") ?? "";
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = authHeader.replace(/^Bearer\s+/i, "");
      if (provided !== cronSecret) {
        return NextResponse.json(
          { message: "Unauthorized" },
          { status: 401 }
        );
      }
    } else {
      const { orgId } = await auth();
      if (!orgId) {
        return NextResponse.json(
          { message: "Unauthorized (set CRON_SECRET for cron use)" },
          { status: 401 }
        );
      }
    }

    let batchSize = 25;
    try {
      const body = (await request.json()) as DrainRequestBody | null;
      if (body && typeof body.batchSize === "number") {
        batchSize = Math.max(1, Math.min(100, Math.trunc(body.batchSize)));
      }
    } catch {
      // Body is optional; ignore parse failures (cron pings with no body).
    }

    return await runDrain(batchSize);
  } catch (error: unknown) {
    captureException(error);
    log.error("async-reactions/drain failed:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/async-reactions/drain
 *
 * Dual purpose:
 * - Vercel Cron with `Authorization: Bearer <CRON_SECRET>`: runs one drain
 *   batch — crons cannot POST, matching the /outbox/publish pattern.
 * - Otherwise (dev without CRON_SECRET): queue depth snapshot by status.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = (request.headers.get("authorization") ?? "").replace(
      /^Bearer\s+/i,
      ""
    );
    const isCron = Boolean(cronSecret) && provided === cronSecret;
    if (isCron) {
      return await runDrain(25);
    }
    if (cronSecret) {
      // Cron-secret environments: require the header on GET too (server-to-server only).
      // Browser dashboards would proxy through an authenticated endpoint instead.
      return NextResponse.json({
        data: { configured: true, secretRequired: true },
      });
    }
    const store = getAsyncReactionStore();
    if (!store) {
      return NextResponse.json({ data: { configured: false } });
    }
    const [pending, running, retry, delivered, dead_letter] = await Promise.all([
      store.countByStatus("pending"),
      store.countByStatus("running"),
      store.countByStatus("retry"),
      store.countByStatus("delivered"),
      store.countByStatus("dead_letter"),
    ]);
    return NextResponse.json({
      data: { configured: true, counts: { pending, running, retry, delivered, dead_letter } },
    });
  } catch (error: unknown) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
