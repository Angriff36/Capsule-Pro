/**
 * Event Details Data Fetching Module
 *
 * This module encapsulates all server-side data fetching for the event details page.
 * Queries are organized by dependency tier and use parallel execution via Promise.all()
 * to minimize TTFB (Time To First Byte).
 *
 * Query Tiers:
 * - Tier 1: Independent queries (event, RSVPs, dishes, prep tasks, related events)
 * - Tier 2: Queries dependent on Tier 1 results (recipes, guest counts)
 * - Tier 3: Queries dependent on Tier 2 results (ingredients, steps)
 * - Tier 4: Queries dependent on Tier 3 results (inventory)
 * - Tier 5: Queries dependent on Tier 4 results (stock levels)
 *
 * All functions are wrapped with React.cache() for automatic deduplication.
 */

import { database, Prisma } from "@repo/database";
import { cache } from "react";
import type {
  EventDishSummary,
  InventoryCoverageItem,
  RecipeDetailSummary,
  RelatedEventSummary,
} from "./event-details-types";

// ============================================================================
// Tier 1: Independent Queries (can all run in parallel)
// ============================================================================

/**
 * Fetches the base event record by ID.
 * @tier 1 (Independent)
 */
export const getEvent = cache(async (tenantId: string, eventId: string) => {
  return database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
  });
});

/**
 * Counts total RSVPs for the event.
 * @tier 1 (Independent)
 */
export const getRsvpCount = cache(async (tenantId: string, eventId: string) => {
  return database.eventGuest.count({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
  });
});

interface EventDishRow {
  linkId: string;
  dishId: string;
  name: string;
  category: string | null;
  recipeId: string | null;
  recipeName: string | null;
  course: string | null;
  quantityServings: number;
  dietaryTags: string[] | null;
  presentationImageUrl: string | null;
  pricePerPerson: Prisma.Decimal | null;
  costPerPerson: Prisma.Decimal | null;
}

/**
 * Fetches all dishes associated with the event.
 * @tier 1 (Independent)
 */
export const getEventDishes = cache(
  async (tenantId: string, eventId: string): Promise<EventDishSummary[]> => {
    const rawEventDishes = await database.$queryRaw<EventDishRow[]>(
      Prisma.sql`
        SELECT
          ed.id AS "linkId",
          d.id AS "dishId",
          d.name,
          d.category,
          d.recipe_id AS "recipeId",
          r.name AS "recipeName",
          ed.course,
          ed.quantity_servings AS "quantityServings",
          d.dietary_tags AS "dietaryTags",
          d.presentation_image_url AS "presentationImageUrl",
          d.price_per_person AS "pricePerPerson",
          d.cost_per_person AS "costPerPerson"
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

    return rawEventDishes.map((row) => ({
      linkId: row.linkId,
      dishId: row.dishId,
      name: row.name,
      category: row.category,
      recipeId: row.recipeId,
      recipeName: row.recipeName,
      course: row.course,
      quantityServings: row.quantityServings,
      dietaryTags: row.dietaryTags ?? [],
      presentationImageUrl: row.presentationImageUrl,
      pricePerPerson: row.pricePerPerson ? Number(row.pricePerPerson) : null,
      costPerPerson: row.costPerPerson ? Number(row.costPerPerson) : null,
    }));
  }
);

interface PrepTaskRow {
  id: string;
  name: string;
  status: string;
  quantityTotal: unknown;
  servingsTotal: unknown;
  dueByDate: unknown;
  isEventFinish: unknown;
}

/**
 * Fetches all prep tasks for the event.
 * @tier 1 (Independent)
 */
export const getPrepTasksRaw = cache(
  async (tenantId: string, eventId: string): Promise<PrepTaskRow[]> => {
    return database.$queryRaw<PrepTaskRow[]>(
      Prisma.sql`
        SELECT id,
               name,
               status,
               quantity_total AS "quantityTotal",
               servings_total AS "servingsTotal",
               due_by_date AS "dueByDate",
               is_event_finish AS "isEventFinish"
        FROM tenant_kitchen.prep_tasks
        WHERE tenant_id = ${tenantId}
          AND event_id = ${eventId}
          AND deleted_at IS NULL
        ORDER BY due_by_date ASC, created_at ASC
      `
    );
  }
);

/**
 * Fetches related events (excluding current event).
 * @tier 1 (Independent)
 */
export const getRelatedEvents = cache(
  async (tenantId: string, eventId: string) => {
    return database.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        NOT: { id: eventId },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
    });
  }
);

// ============================================================================
// Tier 2: Queries Dependent on Tier 1 Results
// ============================================================================

interface RecipeVersionRow {
  recipeId: string;
  recipeName: string;
  versionId: string;
  yieldQuantity: Prisma.Decimal;
  yieldUnitCode: string | null;
  instructions: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
}

/**
 * Fetches recipe versions for given recipe IDs.
 * @tier 2 (Depends on: eventDishes)
 */
export const getRecipeVersions = cache(
  async (tenantId: string, recipeIds: string[]) => {
    if (recipeIds.length === 0) {
      return [];
    }

    return database.$queryRaw<RecipeVersionRow[]>(
      Prisma.sql`
        SELECT DISTINCT ON (rv.recipe_id)
          rv.recipe_id AS "recipeId",
          r.name AS "recipeName",
          rv.id AS "versionId",
          rv.yield_quantity AS "yieldQuantity",
          u.code AS "yieldUnitCode",
          rv.instructions AS "instructions",
          rv.prep_time_minutes AS "prepTimeMinutes",
          rv.cook_time_minutes AS "cookTimeMinutes",
          rv.rest_time_minutes AS "restTimeMinutes"
        FROM tenant_kitchen.recipe_versions rv
        JOIN tenant_kitchen.recipes r
          ON r.tenant_id = rv.tenant_id
          AND r.id = rv.recipe_id
          AND r.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = rv.yield_unit_id
        WHERE rv.tenant_id = ${tenantId}
          AND rv.recipe_id IN (${Prisma.join(recipeIds)})
          AND rv.deleted_at IS NULL
        ORDER BY rv.recipe_id, rv.version_number DESC
      `
    );
  }
);

/**
 * Fetches guest counts for related events.
 * @tier 2 (Depends on: relatedEvents)
 */
export const getRelatedGuestCounts = cache(
  async (tenantId: string, relatedEventIds: string[]) => {
    if (relatedEventIds.length === 0) {
      return [];
    }

    return database.eventGuest.groupBy({
      by: ["eventId"],
      where: {
        tenantId,
        deletedAt: null,
        eventId: { in: relatedEventIds },
      },
      _count: { _all: true },
    });
  }
);

// ============================================================================
// Tier 3: Queries Dependent on Tier 2 Results
// ============================================================================

interface RecipeIngredientRow {
  recipeVersionId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: Prisma.Decimal;
  unitCode: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
}

/**
 * Fetches ingredients for recipe versions.
 * @tier 3 (Depends on: recipeVersions)
 */
export const getRecipeIngredients = cache(
  async (tenantId: string, recipeVersionIds: string[]) => {
    if (recipeVersionIds.length === 0) {
      return [];
    }

    return database.$queryRaw<RecipeIngredientRow[]>(
      Prisma.sql`
        SELECT
          ri.recipe_version_id AS "recipeVersionId",
          i.id AS "ingredientId",
          i.name AS "ingredientName",
          ri.quantity AS "quantity",
          u.code AS "unitCode",
          ri.preparation_notes AS "preparationNotes",
          ri.is_optional AS "isOptional"
        FROM tenant_kitchen.recipe_ingredients ri
        JOIN tenant_kitchen.ingredients i
          ON i.tenant_id = ri.tenant_id
          AND i.id = ri.ingredient_id
          AND i.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = ri.unit_id
        WHERE ri.tenant_id = ${tenantId}
          AND ri.recipe_version_id IN (${Prisma.join(recipeVersionIds)})
          AND ri.deleted_at IS NULL
        ORDER BY ri.sort_order ASC, i.name ASC
      `
    );
  }
);

interface RecipeStepRow {
  recipeVersionId: string;
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: Prisma.Decimal | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[];
  tips: string | null;
}

/**
 * Fetches steps for recipe versions.
 * @tier 3 (Depends on: recipeVersions)
 */
export const getRecipeSteps = cache(
  async (tenantId: string, recipeVersionIds: string[]) => {
    if (recipeVersionIds.length === 0) {
      return [];
    }

    return database.$queryRaw<RecipeStepRow[]>(
      Prisma.sql`
        SELECT
          rs.recipe_version_id AS "recipeVersionId",
          rs.step_number AS "stepNumber",
          rs.instruction AS "instruction",
          rs.duration_minutes AS "durationMinutes",
          rs.temperature_value AS "temperatureValue",
          rs.temperature_unit AS "temperatureUnit",
          rs.equipment_needed AS "equipmentNeeded",
          rs.tips AS "tips"
        FROM tenant_kitchen.recipe_steps rs
        WHERE rs.tenant_id = ${tenantId}
          AND rs.recipe_version_id IN (${Prisma.join(recipeVersionIds)})
          AND rs.deleted_at IS NULL
        ORDER BY rs.step_number ASC
      `
    );
  }
);

// ============================================================================
// Tier 4: Queries Dependent on Tier 3 Results
// ============================================================================

interface InventoryItemRow {
  inventoryItemId: string;
  ingredientId: string;
  itemName: string;
  parLevel: Prisma.Decimal | null;
}

/**
 * Fetches inventory items for given ingredients.
 * @tier 4 (Depends on: recipeIngredients)
 */
export const getInventoryItems = cache(
  async (tenantId: string, ingredientIds: string[]) => {
    if (ingredientIds.length === 0) {
      return [];
    }

    return database.$queryRaw<InventoryItemRow[]>(
      Prisma.sql`
        SELECT
          ii.id AS "inventoryItemId",
          i.id AS "ingredientId",
          ii.name AS "itemName",
          ii.reorder_level AS "parLevel"
        FROM tenant_inventory.inventory_items ii
        JOIN tenant_kitchen.ingredients i
          ON i.tenant_id = ii.tenant_id
          AND i.name = ii.name
          AND i.deleted_at IS NULL
        WHERE ii.tenant_id = ${tenantId}
          AND i.id IN (${Prisma.join(ingredientIds)})
          AND ii.deleted_at IS NULL
      `
    );
  }
);

// ============================================================================
// Tier 5: Queries Dependent on Tier 4 Results
// ============================================================================

interface InventoryStockRow {
  itemId: string;
  onHand: Prisma.Decimal;
  unitCode: string | null;
}

/**
 * Fetches stock levels for inventory items.
 * @tier 5 (Depends on: inventoryItems)
 */
export const getInventoryStock = cache(
  async (tenantId: string, inventoryItemIds: string[]) => {
    if (inventoryItemIds.length === 0) {
      return [];
    }

    return database.$queryRaw<InventoryStockRow[]>(
      Prisma.sql`
        SELECT
          s.item_id AS "itemId",
          SUM(s.quantity_on_hand) AS "onHand",
          u.code AS "unitCode"
        FROM tenant_inventory.inventory_stock s
        LEFT JOIN core.units u ON u.id = s.unit_id
        WHERE s.tenant_id = ${tenantId}
          AND s.item_id IN (${Prisma.join(inventoryItemIds)})
        GROUP BY s.item_id, u.code
      `
    );
  }
);

// ============================================================================
// Orchestration Function - Main Entry Point
// ============================================================================

/**
 * Main orchestration function that fetches all event details data
 * using parallel queries where possible.
 *
 * This function demonstrates the optimal query strategy:
 * 1. Tier 1 queries run in parallel (5 independent queries)
 * 2. Tier 2 queries run in parallel (2 queries, dependent on Tier 1)
 * 3. Tier 3 queries run in parallel (2 queries, dependent on Tier 2)
 * 4. Tier 4 query runs (1 query, dependent on Tier 3)
 * 5. Tier 5 query runs (1 query, dependent on Tier 4)
 *
 * Expected TTFB reduction: ~30% compared to sequential execution.
 */
export async function fetchAllEventDetailsData(
  tenantId: string,
  eventId: string
) {
  // ==============================================================================
  // Tier 1: Execute all independent queries in parallel
  // ==============================================================================
  const [event, rsvpCount, eventDishes, rawPrepTasks, relatedEvents] =
    await Promise.all([
      getEvent(tenantId, eventId),
      getRsvpCount(tenantId, eventId),
      getEventDishes(tenantId, eventId),
      getPrepTasksRaw(tenantId, eventId),
      getRelatedEvents(tenantId, eventId),
    ]);

  if (!event) {
    return { event: null };
  }

  // ==============================================================================
  // Tier 2: Execute queries dependent on Tier 1 results in parallel
  // ==============================================================================
  const recipeIds = Array.from(
    new Set(eventDishes.map((dish) => dish.recipeId).filter(Boolean))
  ) as string[];

  const relatedEventIds = relatedEvents.map((related) => related.id);

  const [recipeVersions, relatedGuestCounts] = await Promise.all([
    recipeIds.length > 0 ? getRecipeVersions(tenantId, recipeIds) : [],
    relatedEventIds.length > 0
      ? getRelatedGuestCounts(tenantId, relatedEventIds)
      : [],
  ]);

  // ==============================================================================
  // Tier 3: Execute queries dependent on Tier 2 results in parallel
  // ==============================================================================
  const recipeVersionIds = recipeVersions.map((row) => row.versionId);

  const [recipeIngredients, recipeSteps] = await Promise.all([
    recipeVersionIds.length > 0
      ? getRecipeIngredients(tenantId, recipeVersionIds)
      : [],
    recipeVersionIds.length > 0
      ? getRecipeSteps(tenantId, recipeVersionIds)
      : [],
  ]);

  // ==============================================================================
  // Build recipe details map from fetched data
  // ==============================================================================
  const recipeByVersionId = new Map<string, RecipeDetailSummary>();
  const recipeById = new Map<string, RecipeDetailSummary>();

  for (const row of recipeVersions) {
    const detail: RecipeDetailSummary = {
      recipeId: row.recipeId,
      recipeName: row.recipeName,
      versionId: row.versionId,
      yieldQuantity: Number(row.yieldQuantity),
      yieldUnitCode: row.yieldUnitCode,
      instructions: row.instructions,
      prepTimeMinutes: row.prepTimeMinutes,
      cookTimeMinutes: row.cookTimeMinutes,
      restTimeMinutes: row.restTimeMinutes,
      ingredients: [],
      steps: [],
    };
    recipeByVersionId.set(row.versionId, detail);
    recipeById.set(row.recipeId, detail);
  }

  for (const ingredient of recipeIngredients) {
    const recipe = recipeByVersionId.get(ingredient.recipeVersionId);
    if (!recipe) {
      continue;
    }
    recipe.ingredients.push({
      ingredientId: ingredient.ingredientId,
      ingredientName: ingredient.ingredientName,
      quantity: Number(ingredient.quantity),
      unitCode: ingredient.unitCode,
      preparationNotes: ingredient.preparationNotes,
      isOptional: ingredient.isOptional,
    });
  }

  for (const step of recipeSteps) {
    const recipe = recipeByVersionId.get(step.recipeVersionId);
    if (!recipe) {
      continue;
    }
    recipe.steps.push({
      stepNumber: step.stepNumber,
      instruction: step.instruction,
      durationMinutes: step.durationMinutes,
      temperatureValue:
        step.temperatureValue === null ? null : Number(step.temperatureValue),
      temperatureUnit: step.temperatureUnit,
      equipmentNeeded: step.equipmentNeeded,
      tips: step.tips,
    });
  }

  const recipeDetails = Array.from(recipeById.values());

  // ==============================================================================
  // Tier 4: Fetch inventory items dependent on recipe ingredients
  // ==============================================================================
  const ingredientIds = Array.from(
    new Set(recipeIngredients.map((ingredient) => ingredient.ingredientId))
  );

  const inventoryItems =
    ingredientIds.length > 0
      ? await getInventoryItems(tenantId, ingredientIds)
      : [];

  // ==============================================================================
  // Tier 5: Fetch inventory stock levels dependent on inventory items
  // ==============================================================================
  const inventoryItemIds = inventoryItems.map((item) => item.inventoryItemId);

  const inventoryStock =
    inventoryItemIds.length > 0
      ? await getInventoryStock(tenantId, inventoryItemIds)
      : [];

  const stockByItem = new Map<
    string,
    { onHand: number; unitCode: string | null }
  >();

  for (const stock of inventoryStock) {
    const existing = stockByItem.get(stock.itemId);
    const onHandValue = Number(stock.onHand);
    if (existing) {
      existing.onHand += onHandValue;
      continue;
    }
    stockByItem.set(stock.itemId, {
      onHand: onHandValue,
      unitCode: stock.unitCode,
    });
  }

  const inventoryCoverage: InventoryCoverageItem[] = inventoryItems.map(
    (item) => {
      const stock = stockByItem.get(item.inventoryItemId);
      return {
        ingredientId: item.ingredientId,
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        onHand: stock ? stock.onHand : null,
        onHandUnitCode: stock ? stock.unitCode : null,
        parLevel: item.parLevel ? Number(item.parLevel) : null,
      };
    }
  );

  // ==============================================================================
  // Build related events summary
  // ==============================================================================
  const relatedGuestCountMap = new Map<string, number>(
    relatedGuestCounts.map(
      (row) => [row.eventId, row._count._all] as [string, number]
    )
  );

  const relatedEventsForClient: RelatedEventSummary[] = relatedEvents.map(
    (related) => ({
      id: related.id,
      title: related.title,
      eventType: related.eventType,
      eventDate: related.eventDate.toISOString(),
      guestCount: related.guestCount,
      status: related.status,
      venueName: related.venueName,
      venueAddress: related.venueAddress,
      ticketPrice:
        related.ticketPrice === null ? null : Number(related.ticketPrice),
      ticketTier: related.ticketTier,
      eventFormat: related.eventFormat,
      accessibilityOptions: related.accessibilityOptions ?? [],
      featuredMediaUrl: related.featuredMediaUrl,
      tags: related.tags ?? [],
    })
  );

  return {
    event,
    rsvpCount,
    eventDishes,
    rawPrepTasks,
    relatedEvents: relatedEventsForClient,
    relatedGuestCounts: Object.fromEntries(relatedGuestCountMap.entries()),
    recipeDetails,
    inventoryCoverage,
  };
}
