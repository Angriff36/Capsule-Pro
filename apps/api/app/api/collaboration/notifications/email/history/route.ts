/**
 * GET /api/collaboration/notifications/email/history
 *
 * Get email notification delivery history for a tenant
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type EmailStatus, getEmailLogs } from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";

/**
 * GET /api/collaboration/notifications/email/history
 * Get email notification history with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId") ?? undefined;
    const recipientEmail = searchParams.get("recipientEmail") ?? undefined;
    const notificationType = searchParams.get("notificationType") ?? undefined;
    const status = searchParams.get("status") as EmailStatus | null;
    // Clamp client-supplied pagination so a hostile or buggy client cannot
    // request the entire email log via `?limit=999999`. clampLimit enforces
    // DEFAULT_LIMIT=50 / MAX_LIMIT=200; clampOffset rejects negatives.
    // Replaces the previous ad-hoc `Math.min(limit, 100)` so the response
    // pagination block reports the actual clamped value used by the query.
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const logs = await getEmailLogs(database, tenantId, {
      workflowId,
      recipientEmail,
      notificationType,
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to fetch email history:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email history: ${message}` },
      { status: 500 }
    );
  }
}
