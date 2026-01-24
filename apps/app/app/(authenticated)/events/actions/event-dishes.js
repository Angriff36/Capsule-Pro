"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventDishes = getEventDishes;
exports.getAvailableDishes = getAvailableDishes;
exports.addDishToEvent = addDishToEvent;
exports.removeDishFromEvent = removeDishFromEvent;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const cache_1 = require("next/cache");
const tenant_1 = require("../../../lib/tenant");
async function getEventDishes(eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const dishes = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        ed.id AS link_id,
        d.id AS dish_id,
        d.name,
        d.category,
        r.name AS recipe_name,
        ed.course,
        ed.quantity_servings,
        d.dietary_tags
      FROM tenant_events.event_dishes ed
      JOIN tenant_kitchen.dishes d
        ON d.tenant_id = ed.tenant_id
        AND d.id = ed.dish_id
        AND d.deleted_at IS NULL
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = d.tenant_id
        AND r.id = d.recipe_id
        AND r.deleted_at IS NULL
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.course ASC, d.name ASC
    `);
  return dishes;
}
async function getAvailableDishes(eventId) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Get dishes already linked to this event
  const linkedDishIds = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT dish_id
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
    `);
  const linkedIds = new Set(linkedDishIds.map((d) => d.dish_id));
  // If there are linked dishes, filter them out; otherwise return all dishes
  if (linkedIds.size > 0) {
    // Build proper UUID array with correct quoting for PostgreSQL
    const linkedIdArray = Array.from(linkedIds);
    const uuidArraySql = linkedIdArray.map((id) => `'${id}'`).join(",");
    const dishes = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT
          d.id,
          d.name,
          d.category,
          r.name AS recipe_name
        FROM tenant_kitchen.dishes d
        LEFT JOIN tenant_kitchen.recipes r
          ON r.tenant_id = d.tenant_id
          AND r.id = d.recipe_id
          AND r.deleted_at IS NULL
        WHERE d.tenant_id = ${tenantId}
          AND d.deleted_at IS NULL
          AND d.id NOT IN (SELECT UNNEST(ARRAY[${database_1.Prisma.raw(uuidArraySql)}]::uuid[]))
        ORDER BY d.name ASC
      `);
    return dishes;
  }
  // No linked dishes, return all
  const dishes = await database_1.database.$queryRaw(database_1.Prisma.sql`
      SELECT
        d.id,
        d.name,
        d.category,
        r.name AS recipe_name
      FROM tenant_kitchen.dishes d
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = d.tenant_id
        AND r.id = d.recipe_id
        AND r.deleted_at IS NULL
      WHERE d.tenant_id = ${tenantId}
        AND d.deleted_at IS NULL
      ORDER BY d.name ASC
    `);
  return dishes;
}
async function addDishToEvent(eventId, dishId, course, quantityServings) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    await database_1.database.$executeRaw`
      INSERT INTO tenant_events.event_dishes (
        tenant_id,
        id,
        event_id,
        dish_id,
        course,
        quantity_servings,
        created_at,
        updated_at
      ) VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${eventId},
        ${dishId},
        ${course ?? null},
        ${quantityServings ?? 1},
        ${new Date()},
        ${new Date()}
      )
    `;
    (0, cache_1.revalidatePath)(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding dish to event:", error);
    return { success: false, error: "Failed to add dish" };
  }
}
async function removeDishFromEvent(eventId, linkId) {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    await database_1.database.$executeRaw`
      UPDATE tenant_events.event_dishes
      SET deleted_at = ${new Date()},
          updated_at = ${new Date()}
      WHERE tenant_id = ${tenantId}
        AND id = ${linkId}
        AND event_id = ${eventId}
    `;
    (0, cache_1.revalidatePath)(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing dish from event:", error);
    return { success: false, error: "Failed to remove dish" };
  }
}
