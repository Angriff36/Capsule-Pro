"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { runManifestCommand } from "@/lib/manifest-command";
import { getTenantIdForOrg, requireCurrentUser } from "../../../../lib/tenant";

// Recipe options for inline dish creation
export interface RecipeForDishCreation {
  category: string | null;
  id: string;
  name: string;
}

export async function getRecipesForDishCreation(): Promise<
  RecipeForDishCreation[]
> {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const recipes = await database.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        category
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `
  );

  return recipes;
}

export interface InlineDishResult {
  category: string | null;
  id: string;
  name: string;
  recipe_name: string | null;
}

export async function createDishAndAddToEvent(
  eventId: string,
  name: string,
  recipeId: string,
  category?: string,
  course?: string
): Promise<{ success: boolean; dish?: InlineDishResult; error?: string }> {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return { success: false, error: "Unauthorized" };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!name?.trim()) {
    return { success: false, error: "Dish name is required" };
  }

  if (!recipeId?.trim()) {
    return { success: false, error: "Recipe is required" };
  }

  // Verify recipe exists
  const [recipe] = await database.$queryRaw<{ id: string; name: string }[]>(
    Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!recipe) {
    return { success: false, error: "Recipe not found" };
  }

  try {
    // Governed write: Dish.create runs through the Manifest runtime
    // (constitution §9) — no direct SQL INSERT. The user context is
    // supplied via requireCurrentUser for policy + audit.
    const user = await requireCurrentUser();
    const result = await runManifestCommand({
      entity: "Dish",
      command: "create",
      body: {
        recipeId,
        name: name.trim(),
        description: "",
        category: category?.trim() || "",
        serviceStyle: "",
        defaultContainerId: "",
        presentationImageUrl: "",
        minPrepLeadDays: 0,
        maxPrepLeadDays: 0,
        portionSizeDescription: "",
        dietaryTags: [],
        allergens: [],
        pricePerPerson: 0,
        costPerPerson: 0,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      return {
        success: false,
        error: result.message || "Failed to create dish",
      };
    }

    const createdId = (result.result as { id?: string } | null)?.id;
    if (!createdId) {
      return { success: false, error: "Dish.create did not return an id" };
    }

    // Governed write: EventDish.create via Manifest runtime (constitution §9)
    const eventDishResult = await runManifestCommand({
      entity: "EventDish",
      command: "create",
      body: {
        eventId,
        dishId: createdId,
        quantityServings: 1,
        specialInstructions: "",
        course: course ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!eventDishResult.ok) {
      return {
        success: false,
        error: eventDishResult.message || "Failed to add dish to event",
      };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/kitchen/recipes");

    return {
      success: true,
      dish: {
        id: createdId,
        name: name.trim(),
        category: category?.trim() || null,
        recipe_name: recipe.name,
      },
    };
  } catch (error) {
    console.error("Error creating dish and adding to event:", error);
    return { success: false, error: "Failed to create dish" };
  }
}

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
      -- Existing commitment read: a referenced dish must stay readable after
      -- catalog soft-delete, so NO d.deleted_at filter here. (getAvailableDishes
      -- and other catalog/picker queries keep it — soft-deleted dishes must not
      -- be selectable for NEW events.)
      JOIN tenant_kitchen.dishes d
        ON d.tenant_id = ed.tenant_id
        AND d.id = ed.dish_id
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
    // Parameterize the UUID list — each id binds as its own SQL parameter so
    // raw string interpolation cannot leak into the query.
    const linkedIdArray = Array.from(linkedIds);
    const idParams = Prisma.join(
      linkedIdArray.map((id) => Prisma.sql`${id}::uuid`),
      ", "
    );

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
          AND d.id NOT IN (${idParams})
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

  await getTenantIdForOrg(orgId);

  try {
    // Governed write: EventDish.create via Manifest runtime (constitution §9)
    const user = await requireCurrentUser();
    const result = await runManifestCommand({
      entity: "EventDish",
      command: "create",
      body: {
        eventId,
        dishId,
        quantityServings: quantityServings ?? 1,
        specialInstructions: "",
        course: course ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      return { success: false, error: result.message || "Failed to add dish" };
    }

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

  await getTenantIdForOrg(orgId);

  try {
    // Governed write: EventDish.remove via Manifest runtime (constitution §9)
    const user = await requireCurrentUser();
    const result = await runManifestCommand({
      entity: "EventDish",
      command: "remove",
      instanceId: linkId,
      body: {
        reason: "",
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      return {
        success: false,
        error: result.message || "Failed to remove dish",
      };
    }

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

  // Governed write: Dish.create runs through the Manifest runtime
  // (constitution §9) — no direct database.dish.create. Source dish
  // fields are forwarded so the variant inherits recipe, pricing, etc.
  const user = await requireCurrentUser();
  const dishResult = await runManifestCommand({
    entity: "Dish",
    command: "create",
    body: {
      recipeId: sourceDish.recipeId,
      name: trimmedName,
      description: sourceDish.description ?? "",
      category: sourceDish.category ?? "",
      serviceStyle: sourceDish.serviceStyle ?? "",
      defaultContainerId: sourceDish.defaultContainerId ?? "",
      presentationImageUrl: sourceDish.presentationImageUrl ?? "",
      minPrepLeadDays: sourceDish.minPrepLeadDays ?? 0,
      maxPrepLeadDays: sourceDish.maxPrepLeadDays ?? 0,
      portionSizeDescription: sourceDish.portionSizeDescription ?? "",
      dietaryTags: sourceDish.dietaryTags ?? [],
      allergens: sourceDish.allergens ?? [],
      pricePerPerson: sourceDish.pricePerPerson
        ? Number(sourceDish.pricePerPerson)
        : 0,
      costPerPerson: sourceDish.costPerPerson
        ? Number(sourceDish.costPerPerson)
        : 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!dishResult.ok) {
    return {
      success: false,
      error: dishResult.message || "Failed to create dish variant",
    };
  }

  const createdDishId = (dishResult.result as { id?: string } | null)?.id;
  if (!createdDishId) {
    return { success: false, error: "Dish.create did not return an id" };
  }

  await database.eventDish.updateMany({
    where: {
      tenantId,
      id: linkId,
      eventId,
    },
    data: {
      dishId: createdDishId,
    },
  });

  revalidatePath(`/events/${eventId}`);
  return { success: true, dishId: createdDishId };
}
