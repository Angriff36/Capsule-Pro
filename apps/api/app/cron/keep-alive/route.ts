import { database } from "@repo/database";
import { env } from "@/env";

/**
 * GET /api/cron/keep-alive
 *
 * Simple keep-alive query to keep the database connection pool warm.
 * Requires CRON_SECRET header for authentication.
 *
 * SECURITY: This endpoint has no authentication by default (E2-1).
 * Vercel Cron sends requests with x-vercel-cron header which we can verify,
 * but for additional security, require the CRON_SECRET if configured.
 */
export const GET = async (request: Request) => {
  // Verify cron secret if configured
  const cronSecret = env.CRON_SECRET;
  if (cronSecret) {
    const providedSecret = request.headers.get("x-cron-secret");
    if (providedSecret !== cronSecret) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  // Simple keep-alive query - count tenants to keep database connection active
  await database.tenant.count();

  return new Response("OK", { status: 200 });
};
