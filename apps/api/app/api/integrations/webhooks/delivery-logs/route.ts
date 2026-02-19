/**
 * Webhook Delivery Logs API
 *
 * GET /api/integrations/webhooks/delivery-logs - List delivery logs
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Valid statuses
const VALID_STATUSES = ["pending", "success", "failed", "retrying"] as const;
type DeliveryStatus = (typeof VALID_STATUSES)[number];

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("webhookId");
    const status = searchParams.get("status");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build filter conditions
    const where: Prisma.WebhookDeliveryLogWhereInput = {
      tenantId,
    };

    if (webhookId) {
      where.webhookId = webhookId;
    }

    if (status && VALID_STATUSES.includes(status as DeliveryStatus)) {
      where.status = status as DeliveryStatus;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    const [logs, total] = await Promise.all([
      database.webhookDeliveryLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.webhookDeliveryLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching delivery logs:", error);
    return NextResponse.json({ error: "Failed to fetch delivery logs" }, { status: 500 });
  }
}

export const runtime = "nodejs";
