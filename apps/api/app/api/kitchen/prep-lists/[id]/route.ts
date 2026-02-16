import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export interface StationGroup {
  stationId: string;
  stationName: string;
  items: Array<{
    id: string;
    stationId: string | null;
    stationName: string;
    ingredientId: string;
    ingredientName: string;
    category: string | null;
    baseQuantity: number;
    baseUnit: string;
    scaledQuantity: number;
    scaledUnit: string;
    isOptional: boolean;
    preparationNotes: string | null;
    allergens: string[];
    dietarySubstitutions: string[];
    dishId: string | null;
    dishName: string | null;
    recipeVersionId: string | null;
    sortOrder: number;
    isCompleted: boolean;
    completedAt: Date | null;
    completedBy: string | null;
  }>;
}

/**
 * GET /api/kitchen/prep-lists/[id]
 * Get a prep list by ID with all items, grouped by station.
 *
 * Migrated from raw SQL to Prisma ORM for type safety and SQL injection prevention.
 */
export async function GET(
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

    const prepList = await database.prepList.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        tenant: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!prepList) {
      return NextResponse.json(
        { error: "Prep list not found" },
        { status: 404 }
      );
    }

    // Fetch the associated event for title and date
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: prepList.eventId,
        deletedAt: null,
      },
      select: {
        title: true,
        eventDate: true,
      },
    });

    // Get all prep list items ordered by station and sort order
    const items = await database.prepListItem.findMany({
      where: {
        tenantId,
        prepListId: id,
        deletedAt: null,
      },
      orderBy: [{ stationName: "asc" }, { sortOrder: "asc" }],
    });

    // Group items by station
    const stationsMap = new Map<string, StationGroup>();
    for (const item of items) {
      const stationKey = item.stationId ?? item.stationName;
      if (!stationsMap.has(stationKey)) {
        stationsMap.set(stationKey, {
          stationId: stationKey,
          stationName: item.stationName,
          items: [],
        });
      }
      stationsMap.get(stationKey)?.items.push({
        id: item.id,
        stationId: item.stationId,
        stationName: item.stationName,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredientName,
        category: item.category,
        baseQuantity: Number(item.baseQuantity),
        baseUnit: item.baseUnit,
        scaledQuantity: Number(item.scaledQuantity),
        scaledUnit: item.scaledUnit,
        isOptional: item.isOptional,
        preparationNotes: item.preparationNotes,
        allergens: item.allergens,
        dietarySubstitutions: item.dietarySubstitutions,
        dishId: item.dishId,
        dishName: item.dishName,
        recipeVersionId: item.recipeVersionId,
        sortOrder: item.sortOrder,
        isCompleted: item.isCompleted,
        completedAt: item.completedAt,
        completedBy: item.completedBy,
      });
    }

    const stations = Array.from(stationsMap.values());

    return NextResponse.json({
      id: prepList.id,
      name: prepList.name,
      eventId: prepList.eventId,
      eventTitle: event?.title ?? null,
      eventDate: event?.eventDate ?? null,
      batchMultiplier: Number(prepList.batchMultiplier),
      dietaryRestrictions: prepList.dietaryRestrictions,
      status: prepList.status,
      totalItems: prepList.totalItems,
      totalEstimatedTime: prepList.totalEstimatedTime,
      notes: prepList.notes,
      generatedAt: prepList.generatedAt,
      finalizedAt: prepList.finalizedAt,
      createdAt: prepList.createdAt,
      updatedAt: prepList.updatedAt,
      stations,
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to get prep list" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/kitchen/prep-lists/[id]
 * Update a prep list via manifest command.
 *
 * Delegates to PrepList.update manifest command which enforces guards,
 * constraints, policies, and emits domain events.
 *
 * Supports updating: name, status, notes, batchMultiplier, dietaryRestrictions.
 * For batch multiplier-only updates, consider using the dedicated
 * PrepList.updateBatchMultiplier command.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log("[PrepList/PATCH] Delegating to manifest update command", {
    prepListId: id,
  });

  return executeManifestCommand(request, {
    entityName: "PrepList",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body, id }),
  });
}

/**
 * DELETE /api/kitchen/prep-lists/[id]
 * Cancel a prep list via manifest command.
 *
 * Delegates to PrepList.cancel manifest command which enforces guards,
 * constraints, policies, and emits domain events. The manifest command
 * handles soft-deletion of the prep list and its items.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log("[PrepList/DELETE] Delegating to manifest cancel command", {
    prepListId: id,
  });

  return executeManifestCommand(request, {
    entityName: "PrepList",
    commandName: "cancel",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      reason: "Deleted via API",
      canceledBy: ctx.userId,
    }),
  });
}
