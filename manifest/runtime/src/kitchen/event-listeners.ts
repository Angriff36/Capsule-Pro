/**
 * Event Listeners and Logging
 *
 * Setup event listeners for kitchen operations
 * and retrieve emitted event logs
 */

import type { EmittedEvent, RuntimeEngine } from "@angriff36/manifest";

/**
 * Setup event listeners for kitchen operations
 */
export function setupKitchenOpsEventListeners(
  engine: RuntimeEngine,
  handlers: {
    onPrepTaskClaimed?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskStarted?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskCompleted?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskReleased?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskReassigned?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskQuantityUpdated?: (event: EmittedEvent) => Promise<void>;
    onPrepTaskCanceled?: (event: EmittedEvent) => Promise<void>;
    onStationTaskAssigned?: (event: EmittedEvent) => Promise<void>;
    onStationTaskRemoved?: (event: EmittedEvent) => Promise<void>;
    onStationCapacityUpdated?: (event: EmittedEvent) => Promise<void>;
    onStationDeactivated?: (event: EmittedEvent) => Promise<void>;
    onStationActivated?: (event: EmittedEvent) => Promise<void>;
    onInventoryReserved?: (event: EmittedEvent) => Promise<void>;
    onInventoryConsumed?: (event: EmittedEvent) => Promise<void>;
    onInventoryWasted?: (event: EmittedEvent) => Promise<void>;
    onInventoryAdjusted?: (event: EmittedEvent) => Promise<void>;
    onInventoryRestocked?: (event: EmittedEvent) => Promise<void>;
    onInventoryReservationReleased?: (event: EmittedEvent) => Promise<void>;
    onRecipeCreated?: (event: EmittedEvent) => Promise<void>;
    onRecipeUpdated?: (event: EmittedEvent) => Promise<void>;
    onRecipeDeactivated?: (event: EmittedEvent) => Promise<void>;
    onRecipeActivated?: (event: EmittedEvent) => Promise<void>;
    onRecipeVersionCreated?: (event: EmittedEvent) => Promise<void>;
    onRecipeVersionRestored?: (event: EmittedEvent) => Promise<void>;
    onIngredientAllergensUpdated?: (event: EmittedEvent) => Promise<void>;
    onRecipeIngredientUpdated?: (event: EmittedEvent) => Promise<void>;
    onDishCreated?: (event: EmittedEvent) => Promise<void>;
    onDishPricingUpdated?: (event: EmittedEvent) => Promise<void>;
    onDishLeadTimeUpdated?: (event: EmittedEvent) => Promise<void>;
    onMenuCreated?: (event: EmittedEvent) => Promise<void>;
    onMenuUpdated?: (event: EmittedEvent) => Promise<void>;
    onMenuDeactivated?: (event: EmittedEvent) => Promise<void>;
    onMenuActivated?: (event: EmittedEvent) => Promise<void>;
    onMenuDishAdded?: (event: EmittedEvent) => Promise<void>;
    onMenuDishRemoved?: (event: EmittedEvent) => Promise<void>;
    onMenuDishUpdated?: (event: EmittedEvent) => Promise<void>;
    onMenuDishesReordered?: (event: EmittedEvent) => Promise<void>;
    onPrepListCreated?: (event: EmittedEvent) => Promise<void>;
    onPrepListUpdated?: (event: EmittedEvent) => Promise<void>;
    onPrepListBatchMultiplierUpdated?: (event: EmittedEvent) => Promise<void>;
    onPrepListFinalized?: (event: EmittedEvent) => Promise<void>;
    onPrepListActivated?: (event: EmittedEvent) => Promise<void>;
    onPrepListDeactivated?: (event: EmittedEvent) => Promise<void>;
    onPrepListCompleted?: (event: EmittedEvent) => Promise<void>;
    onPrepListCancelled?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemCreated?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemUpdated?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemStationChanged?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemNotesUpdated?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemCompleted?: (event: EmittedEvent) => Promise<void>;
    onPrepListItemUncompleted?: (event: EmittedEvent) => Promise<void>;
    onConstraintOverridden?: (event: EmittedEvent) => Promise<void>;
    onConstraintSatisfiedAfterOverride?: (event: EmittedEvent) => Promise<void>;
  }
) {
  const unsubscribe = engine.onEvent(async (event: EmittedEvent) => {
    switch (event.name) {
      case "PrepTaskClaimed":
        await handlers.onPrepTaskClaimed?.(event);
        break;
      case "PrepTaskStarted":
        await handlers.onPrepTaskStarted?.(event);
        break;
      case "PrepTaskCompleted":
        await handlers.onPrepTaskCompleted?.(event);
        break;
      case "PrepTaskReleased":
        await handlers.onPrepTaskReleased?.(event);
        break;
      case "PrepTaskReassigned":
        await handlers.onPrepTaskReassigned?.(event);
        break;
      case "PrepTaskQuantityUpdated":
        await handlers.onPrepTaskQuantityUpdated?.(event);
        break;
      case "PrepTaskCanceled":
        await handlers.onPrepTaskCanceled?.(event);
        break;
      case "StationTaskAssigned":
        await handlers.onStationTaskAssigned?.(event);
        break;
      case "StationTaskRemoved":
        await handlers.onStationTaskRemoved?.(event);
        break;
      case "StationCapacityUpdated":
        await handlers.onStationCapacityUpdated?.(event);
        break;
      case "StationDeactivated":
        await handlers.onStationDeactivated?.(event);
        break;
      case "StationActivated":
        await handlers.onStationActivated?.(event);
        break;
      case "InventoryReserved":
        await handlers.onInventoryReserved?.(event);
        break;
      case "InventoryConsumed":
        await handlers.onInventoryConsumed?.(event);
        break;
      case "InventoryWasted":
        await handlers.onInventoryWasted?.(event);
        break;
      case "InventoryAdjusted":
        await handlers.onInventoryAdjusted?.(event);
        break;
      case "InventoryRestocked":
        await handlers.onInventoryRestocked?.(event);
        break;
      case "InventoryReservationReleased":
        await handlers.onInventoryReservationReleased?.(event);
        break;
      case "RecipeCreated":
        await handlers.onRecipeCreated?.(event);
        break;
      case "RecipeUpdated":
        await handlers.onRecipeUpdated?.(event);
        break;
      case "RecipeDeactivated":
        await handlers.onRecipeDeactivated?.(event);
        break;
      case "RecipeActivated":
        await handlers.onRecipeActivated?.(event);
        break;
      case "RecipeVersionCreated":
        await handlers.onRecipeVersionCreated?.(event);
        break;
      case "RecipeVersionRestored":
        await handlers.onRecipeVersionRestored?.(event);
        break;
      case "IngredientAllergensUpdated":
        await handlers.onIngredientAllergensUpdated?.(event);
        break;
      case "RecipeIngredientUpdated":
        await handlers.onRecipeIngredientUpdated?.(event);
        break;
      case "DishCreated":
        await handlers.onDishCreated?.(event);
        break;
      case "DishPricingUpdated":
        await handlers.onDishPricingUpdated?.(event);
        break;
      case "DishLeadTimeUpdated":
        await handlers.onDishLeadTimeUpdated?.(event);
        break;
      case "MenuCreated":
        await handlers.onMenuCreated?.(event);
        break;
      case "MenuUpdated":
        await handlers.onMenuUpdated?.(event);
        break;
      case "MenuDeactivated":
        await handlers.onMenuDeactivated?.(event);
        break;
      case "MenuActivated":
        await handlers.onMenuActivated?.(event);
        break;
      case "MenuDishAdded":
        await handlers.onMenuDishAdded?.(event);
        break;
      case "MenuDishRemoved":
        await handlers.onMenuDishRemoved?.(event);
        break;
      case "MenuDishUpdated":
        await handlers.onMenuDishUpdated?.(event);
        break;
      case "MenuDishesReordered":
        await handlers.onMenuDishesReordered?.(event);
        break;
      case "PrepListCreated":
        await handlers.onPrepListCreated?.(event);
        break;
      case "PrepListUpdated":
        await handlers.onPrepListUpdated?.(event);
        break;
      case "PrepListBatchMultiplierUpdated":
        await handlers.onPrepListBatchMultiplierUpdated?.(event);
        break;
      case "PrepListFinalized":
        await handlers.onPrepListFinalized?.(event);
        break;
      case "PrepListActivated":
        await handlers.onPrepListActivated?.(event);
        break;
      case "PrepListDeactivated":
        await handlers.onPrepListDeactivated?.(event);
        break;
      case "PrepListCompleted":
        await handlers.onPrepListCompleted?.(event);
        break;
      case "PrepListCancelled":
        await handlers.onPrepListCancelled?.(event);
        break;
      case "PrepListItemCreated":
        await handlers.onPrepListItemCreated?.(event);
        break;
      case "PrepListItemUpdated":
        await handlers.onPrepListItemUpdated?.(event);
        break;
      case "PrepListItemStationChanged":
        await handlers.onPrepListItemStationChanged?.(event);
        break;
      case "PrepListItemNotesUpdated":
        await handlers.onPrepListItemNotesUpdated?.(event);
        break;
      case "PrepListItemCompleted":
        await handlers.onPrepListItemCompleted?.(event);
        break;
      case "PrepListItemUncompleted":
        await handlers.onPrepListItemUncompleted?.(event);
        break;
      case "ConstraintOverridden":
        await handlers.onConstraintOverridden?.(event);
        break;
      case "ConstraintSatisfiedAfterOverride":
        await handlers.onConstraintSatisfiedAfterOverride?.(event);
        break;
      default:
        break;
    }
  });

  return unsubscribe;
}

/**
 * Get all emitted events from the runtime
 */
export function getKitchenOpsEventLog(engine: RuntimeEngine): EmittedEvent[] {
  return engine.getEventLog();
}
