import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database
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
      // Calculate total estimated time
      const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60); // Convert to minutes

      // Create the prep list
      const result = await database.$queryRaw<Array<{ id: string }>>`
        INSERT INTO tenant_kitchen.prep_lists (
          tenant_id,
          event_id,
          name,
          batch_multiplier,
          dietary_restrictions,
          status,
          total_items,
          total_estimated_time
        ) VALUES (
          ${tenantId},
          ${eventId},
          ${name || `${prepList.eventTitle} - Prep List`},
          ${prepList.batchMultiplier},
          ${prepList.dietaryRestrictions || []},
          'draft',
          ${prepList.totalIngredients},
          ${totalEstimatedTime}
        )
        RETURNING id
      `;

      const prepListId = result[0].id;

      // Create all prep list items
      let sortOrder = 0;
      for (const station of prepList.stationLists) {
        for (const ingredient of station.ingredients) {
          await database.$executeRaw`
            INSERT INTO tenant_kitchen.prep_list_items (
              tenant_id,
              prep_list_id,
              station_id,
              station_name,
              ingredient_id,
              ingredient_name,
              category,
              base_quantity,
              base_unit,
              scaled_quantity,
              scaled_unit,
              is_optional,
              preparation_notes,
              allergens,
              dietary_substitutions,
              dish_id,
              dish_name,
              recipe_version_id,
              sort_order
            ) VALUES (
              ${tenantId},
              ${prepListId},
              ${station.stationId},
              ${station.stationName},
              ${ingredient.ingredientId},
              ${ingredient.ingredientName},
              ${ingredient.category},
              ${ingredient.baseQuantity},
              ${ingredient.baseUnit},
              ${ingredient.scaledQuantity},
              ${ingredient.scaledUnit},
              ${ingredient.isOptional},
              ${ingredient.preparationNotes},
              ${ingredient.allergens},
              ${ingredient.dietarySubstitutions},
              NULL,
              NULL,
              NULL,
              ${sortOrder}
            )
          `;
          sortOrder++;
        }
      }

      return NextResponse.json({
        message: "Prep list saved successfully",
        prepListId,
      });
    } catch (error) {
      console.error("Error saving prep list to database:", error);
      return NextResponse.json(
        { error: "Failed to save prep list to database" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error saving prep list to database:", error);
    return NextResponse.json(
      { error: "Failed to save prep list to database" },
      { status: 500 }
    );
  }
}