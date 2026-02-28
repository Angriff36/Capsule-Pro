/**
 * GET /api/collaboration/notifications/email/history
 *
 * Get email notification delivery history for a tenant
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type EmailStatus, getEmailLogs } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit") as string, 10)
      : 50;
    const offset = searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset") as string, 10)
      : 0;

    const logs = await getEmailLogs(database, tenantId, {
      workflowId,
      recipientEmail,
      notificationType,
      status: status ?? undefined,
      limit: Math.min(limit, 100),
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
    console.error("Failed to fetch email history:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email history: ${message}` },
      { status: 500 }
    );
  }
}
