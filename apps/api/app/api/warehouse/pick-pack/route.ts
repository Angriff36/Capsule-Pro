/**
 * Warehouse Pick & Pack API
 *
 * GET /api/warehouse/pick-pack — Returns pickable stock and pending order
 * information for the pick/pack workflow.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type PickPriority = "high" | "medium" | "low";
type PickStatus = "pending" | "in_progress" | "picked" | "packed" | "shipped";

interface PickQueueItem {
  id: string;
  orderRef: string;
  itemName: string;
  itemNumber: string;
  quantity: number;
  locationName: string;
  storageType: string;
  priority: PickPriority;
  status: PickStatus;
  strategy: "FIFO" | "FEFO";
  transactionDate: Date;
}

export async function GET(request: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section") ?? "all"; // "pick" | "pack" | "all"
    const status = searchParams.get("status") ?? "all";
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
      100
    );

    // Fetch usage/transfer-type transactions as pick orders
    const [transactions, stockLevels, locations] = await Promise.all([
      database.inventoryTransaction.findMany({
        where: {
          tenantId,
          transactionType: { in: ["usage", "transfer"] },
        },
        orderBy: { transaction_date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          itemId: true,
          transactionType: true,
          quantity: true,
          unit_cost: true,
          reference: true,
          notes: true,
          transaction_date: true,
          storage_location_id: true,
          reason: true,
        },
      }),
      database.inventoryStock.findMany({
        where: { tenantId },
        select: {
          id: true,
          itemId: true,
          storageLocationId: true,
          quantity_on_hand: true,
          last_counted_at: true,
        },
      }),
      database.storage_locations.findMany({
        where: {
          tenant_id: tenantId,
          is_active: true,
          deleted_at: null,
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          storage_type: true,
        },
      }) as Promise<Array<{ id: string; name: string; storage_type: string }>>,
    ]);

    // Enrich with item details
    const itemIds = [
      ...new Set([
        ...transactions.map((t) => t.itemId),
        ...stockLevels.map((s) => s.itemId),
      ]),
    ];
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
    const locationMap = new Map(locations.map((l) => [l.id, l]));

    // Derive pick status from notes/reason
    const derivePickStatus = (
      reason: string | null,
      notes: string | null
    ): PickStatus => {
      const combined = `${reason ?? ""} ${notes ?? ""}`.toLowerCase();
      if (combined.includes("pick:shipped") || combined.includes("pack:shipped")) {
        return "shipped";
      }
      if (combined.includes("pack:complete") || combined.includes("pack:packed")) {
        return "packed";
      }
      if (combined.includes("pick:complete") || combined.includes("pick:picked")) {
        return "picked";
      }
      if (combined.includes("pick:started") || combined.includes("pick:in_progress")) {
        return "in_progress";
      }
      return "pending";
    };

    const derivePriority = (transactionDate: Date): PickPriority => {
      const hoursSinceTransaction =
        (Date.now() - new Date(transactionDate).getTime()) / (1000 * 60 * 60);
      if (hoursSinceTransaction > 24) return "high";
      if (hoursSinceTransaction > 8) return "medium";
      return "low";
    };

    // Determine FIFO vs FEFO based on category (perishable items use FEFO)
    const deriveStrategy = (category: string): "FIFO" | "FEFO" => {
      const fefoCategories = [
        "produce",
        "dairy",
        "protein",
        "seafood",
        "bakery",
        "prepared",
      ];
      return fefoCategories.includes(category.toLowerCase()) ? "FEFO" : "FIFO";
    };

    // Build pick queue from transactions
    const pickQueue: PickQueueItem[] = transactions.map((t) => {
      const item = itemMap.get(t.itemId);
      const location = locationMap.get(t.storage_location_id);

      return {
        id: t.id,
        orderRef: t.reference ?? `ORD-${t.id.slice(0, 8).toUpperCase()}`,
        itemName: item?.name ?? "Unknown Item",
        itemNumber: item?.item_number ?? "",
        quantity: Number(t.quantity),
        locationName: location?.name ?? "Unassigned",
        storageType: location?.storage_type ?? "",
        priority: derivePriority(t.transaction_date),
        status: derivePickStatus(t.reason, t.notes),
        strategy: deriveStrategy(item?.category ?? ""),
        transactionDate: t.transaction_date,
      };
    });

    // Filter by status
    const filteredQueue =
      status === "all"
        ? pickQueue
        : pickQueue.filter((q) => q.status === status);

    // Build packing station items (items that are picked and awaiting packing)
    const packingItems = filteredQueue.filter(
      (q) => q.status === "picked" || q.status === "in_progress"
    );

    // Compute metrics
    const openPicks = pickQueue.filter(
      (q) => q.status === "pending" || q.status === "in_progress"
    ).length;
    const picksToday = pickQueue.filter((q) => {
      const today = new Date();
      return (
        new Date(q.transactionDate).toDateString() === today.toDateString()
      );
    }).length;
    const packComplete = pickQueue.filter(
      (q) => q.status === "packed" || q.status === "shipped"
    ).length;

    // Stock availability summary
    const stockSummary = stockLevels.map((s) => {
      const item = itemMap.get(s.itemId);
      const location = locationMap.get(s.storageLocationId);
      return {
        itemId: s.itemId,
        itemName: item?.name ?? "Unknown",
        locationId: s.storageLocationId,
        locationName: location?.name ?? "Unknown",
        quantityOnHand: Number(s.quantity_on_hand),
        lastCountedAt: s.last_counted_at,
      };
    });

    return NextResponse.json({
      pickQueue:
        section === "pack" ? [] : filteredQueue,
      packingItems:
        section === "pick" ? [] : packingItems,
      stockSummary,
      locations: locations.map((l) => ({
        id: l.id,
        name: l.name,
        storageType: l.storage_type,
      })),
      metrics: {
        openPicks,
        picksToday,
        packComplete,
        avgPickTimeMinutes: 0,
      },
      pagination: {
        page,
        limit,
        total: filteredQueue.length,
      },
    });
  } catch (error) {
    log.error("[warehouse/pick-pack] GET failed", error);
    captureException(error, {
      tags: { route: "warehouse/pick-pack", method: "GET" },
    });
    return NextResponse.json(
      { error: "Failed to fetch pick/pack data" },
      { status: 500 }
    );
  }
}
