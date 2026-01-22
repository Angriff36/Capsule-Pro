import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ id: string }>;

/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a single waste entry by ID
 */
export async function GET(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const entry = await database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ message: "Waste entry not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;
  const body = await request.json();

  // Validate entry exists and belongs to tenant
  const existingEntry = await database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingEntry) {
    return NextResponse.json({ message: "Waste entry not found" }, { status: 404 });
  }

  // Validate quantity if provided
  if (body.quantity !== undefined) {
    const quantity = Number(body.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { message: "Quantity must be a positive number" },
        { status: 400 }
      );
    }
  }

  // Validate reason if provided
  if (body.reasonId !== undefined) {
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
  }

  // Build update data
  const updateData: any = {};
  if (body.quantity !== undefined) updateData.quantity = Number(body.quantity);
  if (body.unitId !== undefined) updateData.unitId = Number.parseInt(body.unitId, 10);
  if (body.reasonId !== undefined) updateData.reasonId = Number.parseInt(body.reasonId, 10);
  if (body.locationId !== undefined) updateData.locationId = body.locationId;
  if (body.notes !== undefined) updateData.notes = body.notes;

  // Recalculate total cost if quantity or unit cost changed
  if (body.quantity !== undefined || body.unitCost !== undefined) {
    const newQuantity = body.quantity !== undefined ? Number(body.quantity) : Number(existingEntry.quantity);
    const newUnitCost = body.unitCost !== undefined ? Number(body.unitCost) : Number(existingEntry.unitCost || 0);
    updateData.totalCost = newQuantity * newUnitCost;
    if (body.unitCost !== undefined) updateData.unitCost = newUnitCost;
  }

  // Update waste entry
  const updatedEntry = await database.wasteEntry.update({
    where: {
      tenantId_id: {
        tenantId,
        id,
      },
    },
    data: updateData,
  });

  return NextResponse.json({ entry: updatedEntry });
}

/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Soft delete a waste entry
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  // Validate entry exists and belongs to tenant
  const existingEntry = await database.wasteEntry.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingEntry) {
    return NextResponse.json({ message: "Waste entry not found" }, { status: 404 });
  }

  // Soft delete
  await database.wasteEntry.update({
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

  return NextResponse.json({ message: "Waste entry deleted" });
}
