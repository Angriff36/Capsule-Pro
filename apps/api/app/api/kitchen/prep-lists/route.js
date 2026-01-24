Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/prep-lists
 * List all prep lists for the current tenant
 */
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const station = searchParams.get("station");
    // Build dynamic SQL for filters
    const filters = [];
    const values = [tenantId];
    if (eventId) {
      filters.push(`AND pl.event_id = $${values.length + 1}`);
      values.push(eventId);
    }
    if (status) {
      filters.push(`AND pl.status = $${values.length + 1}`);
      values.push(status);
    }
    const filterClause = filters.join(" ");
    const sql = `
      SELECT
        pl.id,
        pl.name,
        pl.event_id,
        e.title AS event_title,
        e.event_date,
        pl.batch_multiplier,
        pl.dietary_restrictions,
        pl.status,
        pl.total_items,
        pl.total_estimated_time,
        pl.generated_at,
        pl.finalized_at,
        pl.created_at
      FROM tenant_kitchen.prep_lists pl
      JOIN tenant_events.events e
        ON e.tenant_id = pl.tenant_id
        AND e.id = pl.event_id
        AND e.deleted_at IS NULL
      WHERE pl.tenant_id = $1
        AND pl.deleted_at IS NULL
        ${filterClause}
      ORDER BY pl.generated_at DESC
    `;
    const prepLists = await database_1.database.$queryRaw(
      database_1.database.$queryRawUnsafe(sql, values)
    );
    // If station filter is provided, we need to check if any items match
    let filteredLists = prepLists;
    if (station) {
      const listIds = await database_1.database.$queryRaw`
        SELECT DISTINCT prep_list_id
        FROM tenant_kitchen.prep_list_items
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND station_id = ${station}
      `;
      const listIdSet = new Set(listIds.map((l) => l.prep_list_id.toString()));
      filteredLists = prepLists.filter((pl) => listIdSet.has(pl.id));
    }
    return server_2.NextResponse.json({ prepLists: filteredLists });
  } catch (error) {
    console.error("Error listing prep lists:", error);
    return server_2.NextResponse.json(
      { error: "Failed to list prep lists" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/kitchen/prep-lists
 * Create a new prep list
 */
async function POST(request) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    const {
      eventId,
      name,
      batchMultiplier = 1,
      dietaryRestrictions = [],
      items,
    } = body;
    if (!(eventId && name && items && Array.isArray(items))) {
      return server_2.NextResponse.json(
        { error: "eventId, name, and items are required" },
        { status: 400 }
      );
    }
    // Create the prep list
    const prepListResult = await database_1.database.$queryRaw`
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
        ${name},
        ${batchMultiplier},
        ${dietaryRestrictions},
        'draft',
        ${items.length},
        0
      )
      RETURNING id, generated_at
    `;
    const prepListId = prepListResult[0].id;
    // Create prep list items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
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
          ${item.stationId},
          ${item.stationName},
          ${item.ingredientId},
          ${item.ingredientName},
          ${item.category || null},
          ${item.baseQuantity},
          ${item.baseUnit},
          ${item.scaledQuantity},
          ${item.scaledUnit},
          ${item.isOptional},
          ${item.preparationNotes || null},
          ${item.allergens || []},
          ${item.dietarySubstitutions || []},
          ${item.dishId || null},
          ${item.dishName || null},
          ${item.recipeVersionId || null},
          ${i}
        )
      `;
    }
    return server_2.NextResponse.json({
      id: prepListId,
      message: "Prep list created successfully",
    });
  } catch (error) {
    console.error("Error creating prep list:", error);
    return server_2.NextResponse.json(
      { error: "Failed to create prep list" },
      { status: 500 }
    );
  }
}
