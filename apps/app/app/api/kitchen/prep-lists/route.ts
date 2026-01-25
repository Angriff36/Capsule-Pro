import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/kitchen/prep-lists
 * List all prep lists for the current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const status = searchParams.get("status");
    const station = searchParams.get("station");

    // Build dynamic SQL for filters
    const filters: Prisma.Sql[] = [
      Prisma.sql`pl.tenant_id = ${tenantId}`,
      Prisma.sql`pl.deleted_at IS NULL`,
    ];

    if (eventId) {
      filters.push(Prisma.sql`pl.event_id = ${eventId}`);
    }
    if (status) {
      filters.push(Prisma.sql`pl.status = ${status}`);
    }

    const whereClause = Prisma.join(filters, " AND ");

    const prepLists = await database.$queryRaw<
      Array<{
        id: string;
        name: string;
        eventId: string;
        eventTitle: string;
        eventDate: Date;
        batchMultiplier: number;
        dietaryRestrictions: string[];
        status: string;
        totalItems: number;
        totalEstimatedTime: number;
        generatedAt: Date;
        finalizedAt: Date | null;
        createdAt: Date;
      }>
    >(
      Prisma.sql`
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
        WHERE ${whereClause}
        ORDER BY pl.generated_at DESC
      `
    );

    // If station filter is provided, we need to check if any items match
    let filteredLists = prepLists;
    if (station) {
      const listIds = await database.$queryRaw<Array<{ prep_list_id: string }>>`
        SELECT DISTINCT prep_list_id
        FROM tenant_kitchen.prep_list_items
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND station_id = ${station}
      `;

      const listIdSet = new Set(listIds.map((l) => l.prep_list_id.toString()));
      filteredLists = prepLists.filter((pl) => listIdSet.has(pl.id));
    }

    return NextResponse.json({ prepLists: filteredLists });
  } catch (error) {
    console.error("Error listing prep lists:", error);
    return NextResponse.json(
      { error: "Failed to list prep lists" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/prep-lists
 * Create a new prep list
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    const {
      eventId,
      name,
      batchMultiplier = 1,
      dietaryRestrictions = [],
      items,
    } = body;

    if (!(eventId && name && items && Array.isArray(items))) {
      return NextResponse.json(
        { error: "eventId, name, and items are required" },
        { status: 400 }
      );
    }

    // Create the prep list
    const prepListResult = await database.$queryRaw<
      Array<{ id: string; generated_at: Date }>
    >`
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

    return NextResponse.json({
      id: prepListId,
      message: "Prep list created successfully",
    });
  } catch (error) {
    console.error("Error creating prep list:", error);
    return NextResponse.json(
      { error: "Failed to create prep list" },
      { status: 500 }
    );
  }
}
