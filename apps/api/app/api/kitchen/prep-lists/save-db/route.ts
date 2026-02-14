import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database.
 *
 * Migrated from raw SQL INSERT to Prisma ORM with transactional consistency.
 * Uses a single transaction to create the prep list and all items atomically.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, prepList, name } = body;

    if (!(eventId && prepList)) {
      return NextResponse.json(
        { error: "eventId and prepList are required" },
        { status: 400 }
      );
    }

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    try {
      // Convert hours to minutes
      const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60);

      const prepListId = await database.$transaction(async (tx) => {
        // Create the prep list
        const created = await tx.prepList.create({
          data: {
            tenantId,
            eventId,
            name: name || `${prepList.eventTitle} - Prep List`,
            batchMultiplier: new Prisma.Decimal(prepList.batchMultiplier ?? 1),
            dietaryRestrictions: prepList.dietaryRestrictions || [],
            status: "draft",
            totalItems: prepList.totalIngredients ?? 0,
            totalEstimatedTime,
          },
        });

        // Create all prep list items in bulk
        let sortOrder = 0;
        for (const station of prepList.stationLists) {
          for (const ingredient of station.ingredients) {
            await tx.prepListItem.create({
              data: {
                tenantId,
                prepListId: created.id,
                stationId: station.stationId,
                stationName: station.stationName,
                ingredientId: ingredient.ingredientId,
                ingredientName: ingredient.ingredientName,
                category: ingredient.category,
                baseQuantity: new Prisma.Decimal(ingredient.baseQuantity ?? 0),
                baseUnit: ingredient.baseUnit,
                scaledQuantity: new Prisma.Decimal(
                  ingredient.scaledQuantity ?? 0
                ),
                scaledUnit: ingredient.scaledUnit,
                isOptional: ingredient.isOptional ?? false,
                preparationNotes: ingredient.preparationNotes,
                allergens: ingredient.allergens ?? [],
                dietarySubstitutions: ingredient.dietarySubstitutions ?? [],
                sortOrder,
              },
            });
            sortOrder++;
          }
        }

        return created.id;
      });

      return NextResponse.json({
        message: "Prep list saved successfully",
        prepListId,
      });
    } catch (error) {
      captureException(error);
      return NextResponse.json(
        { error: "Failed to save prep list to database" },
        { status: 500 }
      );
    }
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to save prep list to database" },
      { status: 500 }
    );
  }
}
