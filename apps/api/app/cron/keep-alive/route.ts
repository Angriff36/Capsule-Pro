import { database } from "@repo/database";
import { env } from "@/env";

/**
 * GET /api/cron/keep-alive
 *
 * Simple keep-alive query to keep the database connection pool warm.
 * Requires CRON_SECRET header for authentication.
 *
 * SECURITY: Fail-closed. A missing CRON_SECRET is a misconfiguration, not a
 * permission grant — letting unauthenticated callers through would expose
 * an unbounded `database.tenant.count()` query to the public internet, which
 * is both a tenant-enumeration signal and a cheap DB-load amplification
 * vector. The endpoint must reject the request and surface the
 * misconfiguration via the error log.
 */
export const GET = async (request: Request) => {
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[cron/keep-alive] CRON_SECRET is not configured — rejecting request (fail-closed)"
    );
    return new Response("Cron endpoint not configured", { status: 503 });
  }

  const providedSecret = request.headers.get("x-cron-secret");
  if (providedSecret !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Simple keep-alive query - count tenants to keep database connection active
  await database.tenant.count();

  return new Response("OK", { status: 200 });
};
