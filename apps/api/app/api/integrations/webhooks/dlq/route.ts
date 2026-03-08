/**
 * Webhook Dead Letter Queue (DLQ) API
 *
 * GET /api/integrations/webhooks/dlq - List DLQ entries
 *
 * Lists failed webhook deliveries that have been moved to the dead letter queue
 * for manual review and potential reprocessing.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface DLQListQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  unresolved?: boolean;
}

/**
 * List DLQ entries
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "50", 10),
      200
    );
    const entityType = searchParams.get("entityType") || undefined;
    const unresolved = searchParams.get("unresolved") === "true";

    const where = {
      tenantId,
      ...(entityType && { entityType }),
      ...(unresolved && { resolvedAt: null }),
    };

    const [entries, total] = await Promise.all([
      database.webhookDeadLetterQueue.findMany({
        where,
        orderBy: { movedToDlqAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      database.webhookDeadLetterQueue.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing DLQ entries:", error);
    return NextResponse.json(
      { error: "Failed to list DLQ entries" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
