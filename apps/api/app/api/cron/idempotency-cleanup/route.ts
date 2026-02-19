/**
 * Cron endpoint for cleaning up expired idempotency entries.
 *
 * This should be called by a scheduled job (Vercel Cron, external scheduler, etc.)
 * Protected by CRON_SECRET header to prevent unauthorized access.
 *
 * GET /api/cron/idempotency-cleanup
 *
 * Authentication: Authorization: Bearer <CRON_SECRET>
 * - If CRON_SECRET env var is not set, returns 503 (not configured)
 * - If header doesn't match, returns 401 (unauthorized)
 *
 * Response: { deleted: number, timestamp: string }
 */

import { database } from "@repo/database";
import { cleanupExpiredIdempotencyEntries } from "@repo/manifest-adapters/prisma-idempotency-store";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is not configured, the endpoint is not available
  if (!cronSecret) {
    console.error(
      "[idempotency-cleanup] CRON_SECRET environment variable is not configured"
    );
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 }
    );
  }

  // Validate the Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error(
      "[idempotency-cleanup] Unauthorized request — invalid or missing Authorization header"
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await cleanupExpiredIdempotencyEntries(database);

    console.log(
      `[idempotency-cleanup] Cleaned up ${deleted} expired idempotency entries`
    );

    return NextResponse.json({
      deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error(
      "[idempotency-cleanup] Failed to clean up expired idempotency entries:",
      error
    );
    captureException(error);

    return NextResponse.json(
      {
        error: "Cleanup failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
