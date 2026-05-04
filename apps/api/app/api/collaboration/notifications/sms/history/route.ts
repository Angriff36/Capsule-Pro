/**
 * GET /api/collaboration/notifications/sms/history
 *
 * Get SMS delivery history with optional filtering
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getSmsLogs } from "@repo/notifications";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";
import { log } from "@repo/observability/log";

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
    // Clamp client-supplied pagination so a hostile or buggy client cannot
    // request the entire SMS log via `?limit=999999`. clampLimit enforces
    // DEFAULT_LIMIT=50 / MAX_LIMIT=200; clampOffset rejects negatives.
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    // Validate status if provided
    const validStatuses = ["pending", "sent", "delivered", "failed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
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
    captureException(error);
    log.error("Failed to fetch SMS logs:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch SMS logs: ${message}` },
      { status: 500 }
    );
  }
}
