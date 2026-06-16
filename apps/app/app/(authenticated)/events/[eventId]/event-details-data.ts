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

import { cache } from "react";
import { countEventGuests, loadEventRecord } from "@/app/lib/convex/domain-loaders";
import {
  countEventStaff,
  eventHasBudget,
  eventHasContract,
  loadEventDishesSummary,
  loadEventPrepLists,
  loadPrepTasksForEvent,
  loadRelatedEvents,
  loadRelatedGuestCounts,
} from "@/app/lib/convex/event-domain-loaders";
import {
  loadInventoryItemsForIngredients,
  loadInventoryStockForItems,
  loadRecipeIngredientsForVersions,
  loadRecipeStepsForVersions,
  loadRecipeVersionsForRecipes,
} from "@/app/lib/convex/event-recipe-loaders";
import { serializeDecimals } from "@/app/lib/decimal";
import type {
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
  const event = await loadEventRecord(tenantId, eventId);
  if (!event) {
    return null;
  }
  return serializeDecimals({
    ...event,
    id: String(event._id),
    tenantId: String(event.tenantId),
    eventDate: new Date(Number(event.eventDate)),
    createdAt: event.createdAt ? new Date(Number(event.createdAt)) : new Date(),
    updatedAt: event.updatedAt ? new Date(Number(event.updatedAt)) : new Date(),
    deletedAt: event.deletedAt ? new Date(Number(event.deletedAt)) : null,
  });
});

export const getRsvpCount = cache(async (tenantId: string, eventId: string) =>
  countEventGuests(tenantId, eventId)
);

/**
 * Counts assigned staff for the event.
 * @tier 1 (Independent)
 */
export const getEventStaffCount = cache(countEventStaff);

export const getEventHasContract = cache(eventHasContract);

export const getEventHasBudget = cache(eventHasBudget);

export const getEventDishes = cache(loadEventDishesSummary);

export const getPrepTasksRaw = cache(loadPrepTasksForEvent);

export const getEventPrepLists = cache(loadEventPrepLists);

export const getRelatedEvents = cache(loadRelatedEvents);

// ============================================================================
// Tier 2: Queries Dependent on Tier 1 Results
// ============================================================================

export const getRecipeVersions = cache(loadRecipeVersionsForRecipes);

export const getRelatedGuestCounts = cache(
  async (tenantId: string, relatedEventIds: string[]) => {
    if (relatedEventIds.length === 0) {
      return [];
    }

    const counts = await loadRelatedGuestCounts(tenantId, relatedEventIds);
    return relatedEventIds.map((eventId) => ({
      eventId,
      _count: { _all: counts.get(eventId) ?? 0 },
    }));
  }
);

// ============================================================================
// Tier 3: Queries Dependent on Tier 2 Results
// ============================================================================

export const getRecipeIngredients = cache(loadRecipeIngredientsForVersions);

export const getRecipeSteps = cache(loadRecipeStepsForVersions);

// ============================================================================
// Tier 4: Queries Dependent on Tier 3 Results
// ============================================================================

export const getInventoryItems = cache(loadInventoryItemsForIngredients);

// ============================================================================
// Tier 5: Queries Dependent on Tier 4 Results
// ============================================================================

export const getInventoryStock = cache(loadInventoryStockForItems);

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
  const [
    event,
    rsvpCount,
    eventDishes,
    rawPrepTasks,
    relatedEvents,
    hasContract,
    staffCount,
    prepLists,
    hasBudget,
  ] = await Promise.all([
    getEvent(tenantId, eventId),
    getRsvpCount(tenantId, eventId),
    getEventDishes(tenantId, eventId),
    getPrepTasksRaw(tenantId, eventId),
    getRelatedEvents(tenantId, eventId),
    getEventHasContract(tenantId, eventId),
    getEventStaffCount(tenantId, eventId),
    getEventPrepLists(tenantId, eventId),
    getEventHasBudget(tenantId, eventId),
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
    hasContract,
    staffCount,
    prepLists,
    hasBudget,
  };
}
