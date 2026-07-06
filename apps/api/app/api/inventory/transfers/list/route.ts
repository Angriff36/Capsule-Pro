import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";

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
    // Clamp client-supplied pagination so a hostile or buggy client cannot
    // request the entire transfers table via `?limit=999999`. clampLimit
    // enforces DEFAULT_LIMIT=50 / MAX_LIMIT=200; clampOffset rejects negatives.
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

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
          lineItems: true,
        },
        orderBy: { requestedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      database.inventoryTransfer.count({ where }),
    ]);

    return NextResponse.json({
      transfers,
      // Alias for the generated manifest client, which reads
      // `json.inventoryTransfers` — without it the list renders empty.
      inventoryTransfers: transfers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    captureException(error);
    log.error("Error listing inventory transfers:", error);
    return NextResponse.json(
      { error: "Failed to list inventory transfers" },
      { status: 500 }
    );
  }
}
