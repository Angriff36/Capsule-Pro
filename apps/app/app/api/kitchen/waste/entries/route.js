Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/waste/entries
 * List waste entries with optional filters
 */
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = new URL(request.url);
  // Optional filters
  const reasonId = searchParams.get("reasonId");
  const locationId = searchParams.get("locationId");
  const eventId = searchParams.get("eventId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
  const entries = await database_1.database.wasteEntry.findMany({
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
  const wasteReasons = await database_1.database.wasteReason.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return server_2.NextResponse.json({
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
async function POST(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const body = await request.json();
  // Validate required fields per spec
  if (!(body.inventoryItemId && body.quantity && body.reasonId)) {
    return server_2.NextResponse.json(
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
  if (isNaN(quantity) || quantity <= 0) {
    return server_2.NextResponse.json(
      { message: "Quantity must be a positive number" },
      { status: 400 }
    );
  }
  // Validate reason exists and is active
  const wasteReason = await database_1.database.wasteReason.findFirst({
    where: {
      AND: [{ id: Number.parseInt(body.reasonId, 10) }, { isActive: true }],
    },
  });
  if (!wasteReason) {
    return server_2.NextResponse.json(
      { message: "Invalid waste reason" },
      { status: 400 }
    );
  }
  // Validate inventory item exists
  const inventoryItem = await database_1.database.inventoryItem.findFirst({
    where: {
      AND: [{ tenantId }, { id: body.inventoryItemId }, { deletedAt: null }],
    },
  });
  if (!inventoryItem) {
    return server_2.NextResponse.json(
      { message: "Inventory item not found" },
      { status: 404 }
    );
  }
  // Get unit cost from inventory item if not provided
  let unitCost = body.unitCost;
  if (!unitCost) {
    // Use cost from inventory item
    unitCost = inventoryItem.unitCost;
  }
  // Calculate total cost
  const totalCost = quantity * Number(unitCost);
  // Create waste entry
  const wasteEntry = await database_1.database.wasteEntry.create({
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
  return server_2.NextResponse.json({ entry: wasteEntry }, { status: 201 });
}
