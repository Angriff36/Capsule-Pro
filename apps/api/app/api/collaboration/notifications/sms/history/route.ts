/**
 * GET /api/collaboration/notifications/sms/history
 *
 * Get SMS delivery history with optional filtering
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getSmsLogs } from "@repo/notifications";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/collaboration/notifications/sms/history
 * Get SMS delivery history
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
    const employeeId = searchParams.get("employeeId") ?? undefined;
    const notificationType = searchParams.get("notificationType") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const limit = searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit") as string, 10)
      : 50;
    const offset = searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset") as string, 10)
      : 0;

    // Validate status if provided
    const validStatuses = ["pending", "sent", "delivered", "failed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const logs = await getSmsLogs(database, tenantId, {
      employeeId,
      notificationType,
      status: status as "pending" | "sent" | "delivered" | "failed" | undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch SMS logs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch SMS logs: ${message}` },
      { status: 500 }
    );
  }
}
