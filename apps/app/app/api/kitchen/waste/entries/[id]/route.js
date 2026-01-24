Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a single waste entry by ID
 */
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  const entry = await database_1.database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          item_number: true,
        },
      },
    },
  });
  if (!entry) {
    return server_2.NextResponse.json(
      { message: "Waste entry not found" },
      { status: 404 }
    );
  }
  return server_2.NextResponse.json({ entry });
}
/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
async function PUT(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  const body = await request.json();
  // Validate entry exists and belongs to tenant
  const existingEntry = await database_1.database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  if (!existingEntry) {
    return server_2.NextResponse.json(
      { message: "Waste entry not found" },
      { status: 404 }
    );
  }
  // Validate quantity if provided
  if (body.quantity !== undefined) {
    const quantity = Number(body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return server_2.NextResponse.json(
        { message: "Quantity must be a positive number" },
        { status: 400 }
      );
    }
  }
  // Validate reason if provided
  if (body.reasonId !== undefined) {
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
  }
  // Build update data
  const updateData = {};
  if (body.quantity !== undefined) updateData.quantity = Number(body.quantity);
  if (body.unitId !== undefined)
    updateData.unitId = Number.parseInt(body.unitId, 10);
  if (body.reasonId !== undefined)
    updateData.reasonId = Number.parseInt(body.reasonId, 10);
  if (body.locationId !== undefined) updateData.locationId = body.locationId;
  if (body.notes !== undefined) updateData.notes = body.notes;
  // Recalculate total cost if quantity or unit cost changed
  if (body.quantity !== undefined || body.unitCost !== undefined) {
    const newQuantity =
      body.quantity !== undefined
        ? Number(body.quantity)
        : Number(existingEntry.quantity);
    const newUnitCost =
      body.unitCost !== undefined
        ? Number(body.unitCost)
        : Number(existingEntry.unitCost || 0);
    updateData.totalCost = newQuantity * newUnitCost;
    if (body.unitCost !== undefined) updateData.unitCost = newUnitCost;
  }
  // Update waste entry
  const updatedEntry = await database_1.database.wasteEntry.update({
    where: {
      tenantId_id: {
        tenantId,
        id,
      },
    },
    data: updateData,
  });
  return server_2.NextResponse.json({ entry: updatedEntry });
}
/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Soft delete a waste entry
 */
async function DELETE(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await params;
  // Validate entry exists and belongs to tenant
  const existingEntry = await database_1.database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });
  if (!existingEntry) {
    return server_2.NextResponse.json(
      { message: "Waste entry not found" },
      { status: 404 }
    );
  }
  // Soft delete
  await database_1.database.wasteEntry.update({
    where: {
      tenantId_id: {
        tenantId,
        id,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });
  return server_2.NextResponse.json({ message: "Waste entry deleted" });
}
