"use server";
import {
  getDish,
  getRecipe,
  listDishes,
  listEventDishes,
  listRecipes,
} from "@/app/lib/manifest-client.generated";

import { revalidatePath } from "next/cache";
import { loadEventDishesSummary } from "@/app/lib/convex/event-domain-loaders";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "../../../lib/tenant";

// Recipe options for inline dish creation
export interface RecipeForDishCreation {
  category: string | null;
  id: string;
  name: string;
}

export async function getRecipesForDishCreation(): Promise<
  RecipeForDishCreation[]
> {
  const user = await requireCurrentUser();
  return (await listRecipes()).data
    .filter((recipe) => recipe.tenantId === user.tenantId && !recipe.deletedAt)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name ?? "",
      category: recipe.category ?? null,
    }));
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
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  if (!name?.trim()) {
    return { success: false, error: "Dish name is required" };
  }

  if (!recipeId?.trim()) {
    return { success: false, error: "Recipe is required" };
  }

  const recipe = await getRecipe(recipeId);

  if (!recipe || recipe.tenantId !== tenantId || recipe.deletedAt) {
    return { success: false, error: "Recipe not found" };
  }

  try {
    // Governed write: Dish.create runs through the Manifest runtime
    // (constitution §9) — no direct SQL INSERT. The user context is
    // supplied via requireCurrentUser for policy + audit.
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
  const user = await requireCurrentUser();
  const dishes = await loadEventDishesSummary(user.tenantId, eventId);
  return dishes.map((dish) => ({
    link_id: dish.linkId,
    dish_id: dish.dishId,
    name: dish.name,
    category: dish.category,
    recipe_name: dish.recipeName,
    course: dish.course,
    quantity_servings: dish.quantityServings,
    dietary_tags: dish.dietaryTags,
  }));
}

export async function getAvailableDishes(eventId: string) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const [dishes, recipes, links] = await Promise.all([
    listDishes(),
    listRecipes(),
    listEventDishes(),
  ]);

  const linkedIds = new Set(
    links.data
      .filter(
        (link) =>
          link.tenantId === tenantId &&
          link.eventId === eventId &&
          !link.deletedAt
      )
      .map((link) => link.dishId)
  );
  const recipeById = new Map(
    recipes.data
      .filter((recipe) => recipe.tenantId === tenantId && !recipe.deletedAt)
      .map((recipe) => [recipe.id, recipe.name ?? null])
  );

  return dishes.data
    .filter(
      (dish) =>
        dish.tenantId === tenantId &&
        !dish.deletedAt &&
        !linkedIds.has(dish.id)
    )
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((dish) => ({
      id: dish.id,
      name: dish.name ?? "",
      category: dish.category ?? null,
      recipe_name: dish.recipeId ? recipeById.get(dish.recipeId) ?? null : null,
    }));
}

export async function addDishToEvent(
  eventId: string,
  dishId: string,
  course?: string,
  quantityServings?: number
) {
  await requireCurrentUser();

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
  await requireCurrentUser();

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
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const trimmedName = newDishName.trim();

  if (!trimmedName) {
    return { success: false, error: "Dish name is required." };
  }

  const link = (await listEventDishes()).data.find(
    (item) =>
      item.tenantId === tenantId &&
      item.id === linkId &&
      item.eventId === eventId &&
      !item.deletedAt
  );

  if (!link?.dishId) {
    return { success: false, error: "Dish link not found." };
  }

  const sourceDish = await getDish(link.dishId);

  if (!sourceDish) {
    return { success: false, error: "Source dish not found." };
  }

  // Governed write: Dish.create runs through the Manifest runtime
  // (constitution §9) — no direct database.dish.create. Source dish
  // fields are forwarded so the variant inherits recipe, pricing, etc.
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

  const createLinkResult = await runManifestCommand({
    entity: "EventDish",
    command: "create",
    body: {
      eventId,
      dishId: createdDishId,
      quantityServings: link.quantityServings ?? 1,
      specialInstructions: link.specialInstructions ?? "",
      course: link.course ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!createLinkResult.ok) {
    return {
      success: false,
      error: createLinkResult.message || "Failed to create replacement link",
    };
  }

  const removeOldResult = await runManifestCommand({
    entity: "EventDish",
    command: "remove",
    instanceId: linkId,
    body: { reason: "variant-replaced", userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!removeOldResult.ok) {
    return {
      success: false,
      error: removeOldResult.message || "Failed to remove original link",
    };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true, dishId: createdDishId };
}
