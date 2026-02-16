"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "../../../lib/tenant";

export async function getEventDishes(eventId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const dishes = await database.$queryRaw<
    Array<{
      link_id: string;
      dish_id: string;
      name: string;
      category: string | null;
      recipe_name: string | null;
      course: string | null;
      quantity_servings: number;
      dietary_tags: string[] | null;
    }>
  >(
    Prisma.sql`
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
    `
  );

  return dishes;
}

export async function getAvailableDishes(eventId: string) {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get dishes already linked to this event
  const linkedDishIds = await database.$queryRaw<Array<{ dish_id: string }>>(
    Prisma.sql`
      SELECT dish_id
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
    `
  );

  const linkedIds = new Set(linkedDishIds.map((d) => d.dish_id));

  // If there are linked dishes, filter them out; otherwise return all dishes
  if (linkedIds.size > 0) {
    // Build proper UUID array with correct quoting for PostgreSQL
    const linkedIdArray = Array.from(linkedIds);
    const uuidArraySql = linkedIdArray.map((id) => `'${id}'`).join(",");

    const dishes = await database.$queryRaw<
      Array<{
        id: string;
        name: string;
        category: string | null;
        recipe_name: string | null;
      }>
    >(
      Prisma.sql`
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
          AND d.id NOT IN (SELECT UNNEST(ARRAY[${Prisma.raw(uuidArraySql)}]::uuid[]))
        ORDER BY d.name ASC
      `
    );

    return dishes;
  }

  // No linked dishes, return all
  const dishes = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: string | null;
      recipe_name: string | null;
    }>
  >(
    Prisma.sql`
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
    `
  );

  return dishes;
}

export async function addDishToEvent(
  eventId: string,
  dishId: string,
  course?: string,
  quantityServings?: number
) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    await database.$executeRaw`
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

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Error adding dish to event:", error);
    return { success: false, error: "Failed to add dish" };
  }
}

export async function removeDishFromEvent(eventId: string, linkId: string) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    await database.$executeRaw`
      UPDATE tenant_events.event_dishes
      SET deleted_at = ${new Date()},
          updated_at = ${new Date()}
      WHERE tenant_id = ${tenantId}
        AND id = ${linkId}
        AND event_id = ${eventId}
    `;

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error) {
    console.error("Error removing dish from event:", error);
    return { success: false, error: "Failed to remove dish" };
  }
}

export async function createDishVariantForEvent(
  eventId: string,
  linkId: string,
  newDishName: string
): Promise<{ success: boolean; dishId?: string; error?: string }> {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const trimmedName = newDishName.trim();

  if (!trimmedName) {
    return { success: false, error: "Dish name is required." };
  }

  const [link] = await database.$queryRaw<Array<{ dish_id: string }>>(
    Prisma.sql`
      SELECT dish_id
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}
        AND id = ${linkId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!link?.dish_id) {
    return { success: false, error: "Dish link not found." };
  }

  const sourceDish = await database.dish.findFirst({
    where: {
      tenantId,
      id: link.dish_id,
      deletedAt: null,
    },
    select: {
      recipeId: true,
      description: true,
      category: true,
      serviceStyle: true,
      defaultContainerId: true,
      presentationImageUrl: true,
      minPrepLeadDays: true,
      maxPrepLeadDays: true,
      portionSizeDescription: true,
      dietaryTags: true,
      allergens: true,
      pricePerPerson: true,
      costPerPerson: true,
      isActive: true,
    },
  });

  if (!sourceDish) {
    return { success: false, error: "Source dish not found." };
  }

  const createdDish = await database.dish.create({
    data: {
      tenantId,
      recipeId: sourceDish.recipeId,
      name: trimmedName,
      description: sourceDish.description ?? undefined,
      category: sourceDish.category ?? undefined,
      serviceStyle: sourceDish.serviceStyle ?? undefined,
      defaultContainerId: sourceDish.defaultContainerId ?? undefined,
      presentationImageUrl: sourceDish.presentationImageUrl ?? undefined,
      minPrepLeadDays: sourceDish.minPrepLeadDays ?? 0,
      maxPrepLeadDays: sourceDish.maxPrepLeadDays ?? undefined,
      portionSizeDescription: sourceDish.portionSizeDescription ?? undefined,
      dietaryTags: sourceDish.dietaryTags ?? [],
      allergens: sourceDish.allergens ?? [],
      pricePerPerson: sourceDish.pricePerPerson ?? undefined,
      costPerPerson: sourceDish.costPerPerson ?? undefined,
      isActive: sourceDish.isActive ?? true,
    },
  });

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_events.event_dishes
      SET dish_id = ${createdDish.id},
          updated_at = ${new Date()}
      WHERE tenant_id = ${tenantId}
        AND id = ${linkId}
        AND event_id = ${eventId}
    `
  );

  revalidatePath(`/events/${eventId}`);
  return { success: true, dishId: createdDish.id };
}
