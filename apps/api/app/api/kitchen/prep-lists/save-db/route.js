Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database
 */
async function POST(request) {
  try {
    const body = await request.json();
    const { eventId, prepList, name } = body;
    if (!(eventId && prepList)) {
      return server_2.NextResponse.json(
        { error: "eventId and prepList are required" },
        { status: 400 }
      );
    }
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    try {
      // Calculate total estimated time
      const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60); // Convert to minutes
      // Create the prep list
      const result = await database_1.database.$queryRaw`
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
          await database_1.database.$executeRaw`
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
      return server_2.NextResponse.json({
        message: "Prep list saved successfully",
        prepListId,
      });
    } catch (error) {
      console.error("Error saving prep list to database:", error);
      return server_2.NextResponse.json(
        { error: "Failed to save prep list to database" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error saving prep list to database:", error);
    return server_2.NextResponse.json(
      { error: "Failed to save prep list to database" },
      { status: 500 }
    );
  }
}
