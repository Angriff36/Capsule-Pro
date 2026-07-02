/**
 * Warehouse Putaway API
 *
 * GET /api/warehouse/putaway — Returns receiving-type inventory transactions
 * that need putaway, along with available storage locations for destination
 * suggestions.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";
    const locationId = searchParams.get("locationId");
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );

    // Fetch purchase-type transactions (recently received items needing putaway)
    const whereClause = {
      tenantId,
      transactionType: "purchase",
      ...(locationId ? { storageLocationId: locationId } : {}),
    };

    const [transactions, locations, completedToday] = await Promise.all([
      database.inventoryTransaction.findMany({
        where: whereClause,
        orderBy: { transactionDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          itemId: true,
          transactionType: true,
          quantity: true,
          unitCost: true,
          reference: true,
          notes: true,
          transactionDate: true,
          storageLocationId: true,
          reason: true,
        },
      }),
      database.storageLocation.findMany({
        where: {
          tenantId: tenantId,
          isActive: true,
          deletedAt: null,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          storageType: true,
        },
      }) as Promise<Array<{ id: string; name: string; storageType: string }>>,
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: "purchase",
          transactionDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          },
        },
      }),
    ]);

    // Enrich transactions with item details
    const itemIds = [...new Set(transactions.map((t) => t.itemId))];
    const items = await database.inventoryItem.findMany({
      where: {
        tenantId,
        id: { in: itemIds },
      },
      select: {
        id: true,
        name: true,
        item_number: true,
        category: true,
        unitOfMeasure: true,
      },
    });

    const itemMap = new Map(items.map((i) => [i.id, i]));

    // Derive putaway status from notes/reason fields
    type PutawayStatus = "pending" | "in_progress" | "completed";
    const derivePutawayStatus = (
      reason: string | null,
      notes: string | null
    ): PutawayStatus => {
      const combined = `${reason ?? ""} ${notes ?? ""}`.toLowerCase();
      if (
        combined.includes("putaway:completed") ||
        combined.includes("putaway:complete")
      ) {
        return "completed";
      }
      if (
        combined.includes("putaway:in_progress") ||
        combined.includes("putaway:started")
      ) {
        return "in_progress";
      }
      return "pending";
    };

    const enriched = transactions.map((t) => {
      const item = itemMap.get(t.itemId);
      const location = locations.find((l) => l.id === t.storageLocationId);
      const putawayStatus = derivePutawayStatus(t.reason, t.notes);

      return {
        id: t.id,
        itemId: t.itemId,
        itemName: item?.name ?? "Unknown Item",
        itemNumber: item?.item_number ?? "",
        category: item?.category ?? "",
        unitOfMeasure: item?.unitOfMeasure ?? "each",
        quantity: Number(t.quantity),
        unitCost: Number(t.unitCost),
        source: t.reference ?? "Receiving Dock",
        destinationLocationId: t.storageLocationId,
        destinationLocationName: location?.name ?? "Unassigned",
        destinationStorageType: location?.storageType ?? "",
        status: putawayStatus,
        transactionDate: t.transactionDate,
        notes: t.notes,
      };
    });

    // Filter by putaway status if requested
    const filtered =
      status === "all" ? enriched : enriched.filter((e) => e.status === status);

    // Compute metrics
    const pendingCount = enriched.filter((e) => e.status === "pending").length;
    const locationsUsed = new Set(
      enriched
        .filter((e) => e.status === "completed")
        .map((e) => e.destinationLocationId)
    ).size;

    return NextResponse.json({
      tasks: filtered,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        storageType: l.storageType,
      })),
      metrics: {
        pendingTasks: pendingCount,
        completedToday,
        locationsUsed,
        avgTimeMinutes: 0,
      },
      pagination: {
        page,
        limit,
        total: filtered.length,
      },
    });
  } catch (error) {
    log.error("[warehouse/putaway] GET failed", error);
    captureException(error, {
      tags: { route: "warehouse/putaway", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch putaway tasks" },
      { status: 500 }
    );
  }
}
