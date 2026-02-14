import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * PATCH /api/kitchen/prep-lists/items/[id]
 * Update a prep list item (quantities, completion, etc.)
 *
 * Migrated from $queryRawUnsafe (SQL injection risk) to Prisma ORM.
 * For command-level operations with constraint/guard validation,
 * use the /commands/* endpoints instead.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json();
    const { scaledQuantity, isCompleted, preparationNotes, isOptional } = body;

    // Build type-safe update data
    const data: Prisma.PrepListItemUpdateInput = {};

    if (scaledQuantity !== undefined) {
      data.scaledQuantity = new Prisma.Decimal(scaledQuantity);
    }
    if (isCompleted !== undefined) {
      data.isCompleted = isCompleted;
      if (isCompleted) {
        data.completedAt = new Date();
        data.completedBy = userId;
      } else {
        data.completedAt = null;
        data.completedBy = null;
      }
    }
    if (preparationNotes !== undefined) {
      data.preparationNotes = preparationNotes;
    }
    if (isOptional !== undefined) {
      data.isOptional = isOptional;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Verify the item exists and belongs to this tenant
    const existing = await database.prepListItem.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Prep list item not found" },
        { status: 404 }
      );
    }

    await database.prepListItem.update({
      where: { tenantId_id: { tenantId, id } },
      data,
    });

    return NextResponse.json({
      message: "Prep list item updated successfully",
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to update prep list item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kitchen/prep-lists/items/[id]
 * Soft-delete a prep list item.
 *
 * Migrated from raw $executeRaw to Prisma ORM.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    await database.prepListItem.updateMany({
      where: { tenantId, id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Prep list item deleted successfully",
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to delete prep list item" },
      { status: 500 }
    );
  }
}
