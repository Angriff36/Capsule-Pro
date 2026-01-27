import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/kitchen/waste/entries
 * List waste entries with optional filters
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Optional filters
  const reasonId = searchParams.get("reasonId");
  const locationId = searchParams.get("locationId");
  const eventId = searchParams.get("eventId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

  const entries = await database.wasteEntry.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        ...(reasonId ? [{ reasonId: Number.parseInt(reasonId, 10) }] : []),
        ...(locationId ? [{ locationId }] : []),
        ...(eventId ? [{ eventId }] : []),
        ...(startDate ? [{ loggedAt: { gte: new Date(startDate) } }] : []),
        ...(endDate ? [{ loggedAt: { lte: new Date(endDate) } }] : []),
      ],
    },
    include: {
      // Include related data
      inventoryItem: {
        select: {
          id: true,
          name: true,
          item_number: true,
        },
      },
    },
    orderBy: { loggedAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Get waste reasons for UI
  const wasteReasons = await database.wasteReason.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    entries,
    wasteReasons,
    pagination: {
      limit,
      offset,
      total: entries.length,
    },
  });
}

/**
 * POST /api/kitchen/waste/entries
 * Create a new waste entry
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  // Validate required fields per spec
  if (!(body.inventoryItemId && body.quantity && body.reasonId)) {
    return NextResponse.json(
      {
        message: "Missing required fields",
        errors: {
          ...(body.inventoryItemId
            ? {}
            : { inventoryItemId: "Item is required" }),
          ...(body.quantity ? {} : { quantity: "Quantity is required" }),
          ...(body.reasonId ? {} : { reasonId: "Reason is required" }),
        },
      },
      { status: 400 }
    );
  }

  // Validate quantity > 0
  const quantity = Number(body.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    return NextResponse.json(
      { message: "Quantity must be a positive number" },
      { status: 400 }
    );
  }

  // Validate reason exists and is active
  const wasteReason = await database.wasteReason.findFirst({
    where: {
      AND: [{ id: Number.parseInt(body.reasonId, 10) }, { isActive: true }],
    },
  });

  if (!wasteReason) {
    return NextResponse.json(
      { message: "Invalid waste reason" },
      { status: 400 }
    );
  }

  // Validate inventory item exists and get unit cost
  const inventoryItem = await database.inventoryItem.findFirst({
    where: {
      AND: [{ tenantId }, { id: body.inventoryItemId }, { deletedAt: null }],
    },
    select: {
      id: true,
      unitCost: true,
    },
  });

  if (!inventoryItem) {
    return NextResponse.json(
      { message: "Inventory item not found" },
      { status: 404 }
    );
  }

  // Get unit cost from inventory item if not provided
  let unitCost = body.unitCost;
  if (!unitCost) {
    // Use the inventory item's unit cost
    unitCost = inventoryItem.unitCost;
  }

  // Calculate total cost
  const totalCost = quantity * Number(unitCost);

  // Create waste entry
  const wasteEntry = await database.wasteEntry.create({
    data: {
      tenantId,
      inventoryItemId: body.inventoryItemId,
      reasonId: Number.parseInt(body.reasonId, 10),
      quantity,
      unitId: body.unitId ? Number.parseInt(body.unitId, 10) : null,
      locationId: body.locationId,
      eventId: body.eventId,
      loggedBy: body.loggedBy, // Employee ID from auth context
      unitCost: Number(unitCost),
      totalCost,
      notes: body.notes,
    },
  });

  return NextResponse.json({ entry: wasteEntry }, { status: 201 });
}
