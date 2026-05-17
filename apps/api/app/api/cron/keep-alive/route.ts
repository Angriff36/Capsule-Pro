import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";

/**
 * GET /api/cron/keep-alive
 *
 * Simple keep-alive query to keep the database connection pool warm.
 * Protected by standard cron auth (x-vercel-cron or Bearer token).
 *
 * SECURITY: Fail-closed. A missing CRON_SECRET is a misconfiguration, not a
 * permission grant — letting unauthenticated callers through would expose
 * an unbounded `database.tenant.count()` query to the public internet, which
 * is both a tenant-enumeration signal and a cheap DB-load amplification
 * vector.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error(
      "[keep-alive] CRON_SECRET environment variable is not configured"
    );
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 }
    );
  }

  const vercelCron = request.headers.get("x-vercel-cron");
  const authHeader = request.headers.get("authorization");
  const isVercelCron = vercelCron === "1" && cronSecret;
  const isBearerValid = authHeader === `Bearer ${cronSecret}`;

  if (!(isVercelCron || isBearerValid)) {
    log.error(
      "[keep-alive] Unauthorized request — invalid or missing authentication"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await database.tenant.count();

    return NextResponse.json({
      status: "OK",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    log.error("[keep-alive] Failed to execute keep-alive query", { error });
    return NextResponse.json(
      { error: "Keep-alive query failed" },
      { status: 500 }
    );
  }
}
