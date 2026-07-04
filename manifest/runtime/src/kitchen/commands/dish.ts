/**
 * Dish Commands
 *
 * Commands for managing dishes:
 * - updatePricing, updateLeadTime, create
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { DishCommandResult } from "../types";

/**
 * Update dish pricing
 */
export async function updateDishPricing(
  engine: RuntimeEngine,
  dishId: string,
  newPrice: number,
  newCost: number,
  overrideRequests?: OverrideRequest[]
): Promise<DishCommandResult> {
  const result = await engine.runCommand(
    "updatePricing",
    // Dish.updatePricing declares params pricePerPerson/costPerPerson —
    // guards read those names, not this helper's argument names.
    { pricePerPerson: newPrice, costPerPerson: newCost },
    {
      entityName: "Dish",
      instanceId: dishId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Dish", dishId);
  return {
    ...result,
    dishId,
    name: instance?.name as string | undefined,
    pricePerPerson: instance?.pricePerPerson as number | undefined,
    costPerPerson: instance?.costPerPerson as number | undefined,
  };
}

/**
 * Update dish lead time
 */
export async function updateDishLeadTime(
  engine: RuntimeEngine,
  dishId: string,
  minDays: number,
  maxDays: number,
  overrideRequests?: OverrideRequest[]
): Promise<DishCommandResult> {
  const result = await engine.runCommand(
    "updateLeadTime",
    // Dish.updateLeadTime declares params minPrepLeadDays/maxPrepLeadDays.
    { minPrepLeadDays: minDays, maxPrepLeadDays: maxDays },
    {
      entityName: "Dish",
      instanceId: dishId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Dish", dishId);
  return {
    ...result,
    dishId,
    name: instance?.name as string | undefined,
    pricePerPerson: instance?.pricePerPerson as number | undefined,
    costPerPerson: instance?.costPerPerson as number | undefined,
  };
}

/**
 * Create a dish via Manifest runtime with constraint validation and event emission
 */
export async function createDish(
  engine: RuntimeEngine,
  dishId: string,
  name: string,
  recipeId: string,
  description: string,
  category: string,
  serviceStyle: string,
  dietaryTags: string,
  allergens: string,
  pricePerPerson: number,
  costPerPerson: number,
  minPrepLeadDays: number,
  maxPrepLeadDays: number,
  portionSizeDescription: string,
  overrideRequests?: OverrideRequest[]
): Promise<DishCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      name,
      recipeId,
      description,
      category,
      serviceStyle,
      dietaryTags,
      allergens,
      pricePerPerson,
      costPerPerson,
      minPrepLeadDays,
      maxPrepLeadDays,
      portionSizeDescription,
    },
    {
      entityName: "Dish",
      instanceId: dishId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Dish", dishId);
  return {
    ...result,
    dishId,
    name: instance?.name as string | undefined,
    pricePerPerson: instance?.pricePerPerson as number | undefined,
    costPerPerson: instance?.costPerPerson as number | undefined,
  };
}
