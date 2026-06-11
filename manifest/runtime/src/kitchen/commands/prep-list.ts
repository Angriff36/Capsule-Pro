import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type {
  PrepListCommandResult,
  PrepListItemCommandResult,
} from "../types";

/**
 * Update a prep list
 */
export async function updatePrepList(
  engine: RuntimeEngine,
  prepListId: string,
  newName: string,
  newDietaryRestrictions: string,
  newNotes: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "update",
    { newName, newDietaryRestrictions, newNotes },
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Update prep list batch multiplier
 */
export async function updatePrepListBatchMultiplier(
  engine: RuntimeEngine,
  prepListId: string,
  newMultiplier: number,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "updateBatchMultiplier",
    { newMultiplier },
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    totalItems: instance?.totalItems as number | undefined,
  };
}

/**
 * Finalize a prep list
 */
export async function finalizePrepList(
  engine: RuntimeEngine,
  prepListId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "finalize",
    {},
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
    totalItems: instance?.totalItems as number | undefined,
  };
}

/**
 * Activate a prep list
 */
export async function activatePrepList(
  engine: RuntimeEngine,
  prepListId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "activate",
    {},
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Deactivate a prep list
 */
export async function deactivatePrepList(
  engine: RuntimeEngine,
  prepListId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    {},
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Mark prep list as completed
 */
export async function markPrepListCompleted(
  engine: RuntimeEngine,
  prepListId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "markCompleted",
    {},
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Cancel a prep list
 */
export async function cancelPrepList(
  engine: RuntimeEngine,
  prepListId: string,
  reason: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "cancel",
    { reason },
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Update prep list item quantity
 */
export async function updatePrepListItemQuantity(
  engine: RuntimeEngine,
  itemId: string,
  newBaseQuantity: number,
  newScaledQuantity: number,
  newBaseUnit: string,
  newScaledUnit: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "updateQuantity",
    { newBaseQuantity, newScaledQuantity, newBaseUnit, newScaledUnit },
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string | undefined) ?? "",
    ingredientName: instance?.ingredientName as string | undefined,
  };
}

/**
 * Update prep list item station
 */
export async function updatePrepListItemStation(
  engine: RuntimeEngine,
  itemId: string,
  newStationId: string,
  newStationName: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "updateStation",
    { newStationId, newStationName },
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string | undefined) ?? "",
    ingredientName: instance?.ingredientName as string | undefined,
  };
}

/**
 * Update prep list item notes
 */
export async function updatePrepListItemNotes(
  engine: RuntimeEngine,
  itemId: string,
  newNotes: string,
  newDietarySubstitutions: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "updatePrepNotes",
    { newNotes, newDietarySubstitutions },
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string | undefined) ?? "",
    ingredientName: instance?.ingredientName as string | undefined,
  };
}

/**
 * Mark prep list item as completed
 */
export async function markPrepListItemCompleted(
  engine: RuntimeEngine,
  itemId: string,
  completedByUserId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "markCompleted",
    { completedByUserId },
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string | undefined) ?? "",
    ingredientName: instance?.ingredientName as string | undefined,
    isCompleted: true,
  };
}

/**
 * Mark prep list item as uncompleted
 */
export async function markPrepListItemUncompleted(
  engine: RuntimeEngine,
  itemId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "markUncompleted",
    {},
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string | undefined) ?? "",
    ingredientName: instance?.ingredientName as string | undefined,
    isCompleted: false,
  };
}

/**
 * Create a prep list via Manifest runtime with constraint validation and event emission
 */
export async function createPrepList(
  engine: RuntimeEngine,
  prepListId: string,
  eventId: string,
  name: string,
  batchMultiplier: number,
  dietaryRestrictions: string,
  totalItems: number,
  totalEstimatedTime: number,
  notes: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      eventId,
      name,
      batchMultiplier,
      dietaryRestrictions,
      totalItems,
      totalEstimatedTime,
      notes,
    },
    {
      entityName: "PrepList",
      instanceId: prepListId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepList", prepListId);
  return {
    ...result,
    prepListId,
    name: instance?.name as string | undefined,
    status: instance?.status as string | undefined,
    totalItems: instance?.totalItems as number | undefined,
    totalEstimatedTime: instance?.totalEstimatedTime as number | undefined,
  };
}

/**
 * Create a new prep list item via Manifest command pipeline
 */
export async function createPrepListItem(
  engine: RuntimeEngine,
  itemId: string,
  prepListId: string,
  stationId: string,
  stationName: string,
  ingredientId: string,
  ingredientName: string,
  category: string,
  baseQuantity: number,
  baseUnit: string,
  scaledQuantity: number,
  scaledUnit: string,
  isOptional: boolean,
  preparationNotes: string,
  allergens: string,
  dietarySubstitutions: string,
  dishId: string,
  dishName: string,
  recipeVersionId: string,
  sortOrder: number,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListItemCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      prepListId,
      stationId,
      stationName,
      ingredientId,
      ingredientName,
      category,
      baseQuantity,
      baseUnit,
      scaledQuantity,
      scaledUnit,
      isOptional,
      preparationNotes,
      allergens,
      dietarySubstitutions,
      dishId,
      dishName,
      recipeVersionId,
      sortOrder,
    },
    {
      entityName: "PrepListItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepListItem", itemId);
  return {
    ...result,
    itemId,
    prepListId: (instance?.prepListId as string) ?? prepListId,
    ingredientName: instance?.ingredientName as string | undefined,
    isCompleted: instance?.isCompleted as boolean | undefined,
  };
}
