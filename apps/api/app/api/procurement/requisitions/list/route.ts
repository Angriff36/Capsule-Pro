// Auto-generated Next.js query handler for PurchaseRequisition
// Generated from Manifest IR - DO NOT EDIT
// Reads may bypass the runtime

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return Response.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const department = searchParams.get("department");
    const priority = searchParams.get("priority");
    const limit = Number.parseInt(searchParams.get("limit") ?? "50");
    const offset = Number.parseInt(searchParams.get("offset") ?? "0");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (department) {
      where.department = department;
    }
    if (priority) {
      where.priority = priority;
    }

    const [requisitions, total] = await Promise.all([
      database.purchaseOrder.findMany({
        where,
        take: Math.min(limit, 200),
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
        },
      }),
      database.purchaseOrder.count({ where }),
    ]);

    return Response.json({
      requisitions,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[purchase-requisition/list] Error:", error);
    captureException(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
