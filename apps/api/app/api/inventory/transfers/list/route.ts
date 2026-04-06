import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const fromLocationId = searchParams.get("fromLocationId");
    const toLocationId = searchParams.get("toLocationId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }
    if (fromLocationId) {
      where.fromLocationId = fromLocationId;
    }
    if (toLocationId) {
      where.toLocationId = toLocationId;
    }

    const [transfers, total] = await Promise.all([
      database.inventoryTransfer.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.inventoryTransfer.count({ where }),
    ]);

    return NextResponse.json({
      transfers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    captureException(error);
    console.error("Error listing inventory transfers:", error);
    return NextResponse.json(
      { error: "Failed to list inventory transfers" },
      { status: 500 }
    );
  }
}
