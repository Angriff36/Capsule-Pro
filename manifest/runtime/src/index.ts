/**
 * Kitchen Ops Manifest Runtime
 *
 * This module provides a runtime for executing kitchen operations commands
 * using the Manifest language. It handles prep tasks, station management,
 * and inventory operations with proper constraint checking and event emission.
 *
 * ℹ️ Code Generation Workflow (Preferred for New Features)
 * =========================================================
 * For new Manifest features, consider using the code generator:
 *
 * 1. Edit .manifest file in manifest/source/
 * 2. Run: npx tsx packages/manifest/bin/compile.ts <file>.manifest --output ./generated
 * 3. Review and use the generated code
 * 4. See .specify/memory/AGENTS.md for when to use code generation vs manual integration
 *
 * ⚠️ Constraint Handling Pattern
 * ===========================================
 * When using this runtime, you MUST check constraint outcomes:
 *
 * 1. createInstance() returns undefined when constraints fail
 * 2. executeCommand() returns CommandResult with constraint outcomes
 * 3. Use api-response.ts utilities for consistent responses
 * 4. See .specify/memory/AGENTS.md for full pattern documentation
 * 5. Tests at apps/api/__tests__/kitchen/manifest-constraints.test.ts verify this
 *
 * Commands:
 * - PrepTask: claim, start, complete, release, reassign, updateQuantity, cancel
 * - Station: assignTask, removeTask, updateCapacity, deactivate, activate, updateEquipment
 * - InventoryItem: reserve, consume, waste, adjust, restock, releaseReservation
 * - Recipe: update, deactivate, activate
 * - RecipeVersion: create
 * - Dish: updatePricing, updateLeadTime
 * - Menu: update, activate, deactivate
 * - PrepList: update, updateBatchMultiplier, finalize, activate, deactivate, markCompleted, cancel
 * - PrepListItem: updateQuantity, updateStation, updatePrepNotes, markCompleted, markUncompleted
 */

// ============ Type Exports ============

export type {
  KitchenOpsContext,
  WorkflowMetadataOptions,
  PrepTaskCommandResult,
  StationCommandResult,
  InventoryCommandResult,
  RecipeCommandResult,
  DishCommandResult,
  MenuCommandResult,
  MenuDishCommandResult,
  PrepListCommandResult,
  PrepListItemCommandResult,
} from "./kitchen/types";

// ============ Utility Exports ============

export { getWorkflowOptions } from "./kitchen/workflow";
export { createPostgresStoreProvider } from "./kitchen/postgres-store";

// ============ Runtime Factory Exports ============

export {
  createPrepTaskRuntime,
  createStationRuntime,
  createInventoryRuntime,
  createRecipeRuntime,
  createMenuRuntime,
  createPrepListRuntime,
  createKitchenOpsRuntime,
} from "./kitchen/runtime-factories";

// ============ Prep Task Commands ============

export {
  claimPrepTask,
  startPrepTask,
  completePrepTask,
  releasePrepTask,
  reassignPrepTask,
  updatePrepTaskQuantity,
  cancelPrepTask,
  createPrepTask,
} from "./kitchen/commands/prep-task";

// ============ Station Commands ============

export {
  assignTaskToStation,
  removeTaskFromStation,
  updateStationCapacity,
  deactivateStation,
  activateStation,
  updateStationEquipment,
  createStation,
} from "./kitchen/commands/station";

// ============ Inventory Commands ============

export {
  reserveInventory,
  consumeInventory,
  wasteInventory,
  adjustInventory,
  restockInventory,
  releaseInventoryReservation,
  createInventoryItem,
} from "./kitchen/commands/inventory";

// ============ Recipe Commands ============

export {
  updateRecipe,
  deactivateRecipe,
  activateRecipe,
  createIngredient,
  createRecipeVersion,
  createRecipeIngredient,
  createRecipe,
} from "./kitchen/commands/recipe";

// ============ Dish Commands ============

export {
  updateDishPricing,
  updateDishLeadTime,
  createDish,
} from "./kitchen/commands/dish";

// ============ Menu Commands ============

export {
  updateMenu,
  activateMenu,
  deactivateMenu,
  createMenu,
  createMenuDish,
} from "./kitchen/commands/menu";

// ============ Prep List Commands ============

export {
  updatePrepList,
  updatePrepListBatchMultiplier,
  finalizePrepList,
  activatePrepList,
  deactivatePrepList,
  markPrepListCompleted,
  cancelPrepList,
  updatePrepListItemQuantity,
  updatePrepListItemStation,
  updatePrepListItemNotes,
  markPrepListItemCompleted,
  markPrepListItemUncompleted,
  createPrepList,
  createPrepListItem,
} from "./kitchen/commands/prep-list";

// ============ Event Handling ============

export {
  setupKitchenOpsEventListeners,
  getKitchenOpsEventLog,
} from "./kitchen/event-listeners";

// ============ Instance Creation ============

export {
  createPrepTaskInstance,
  createStationInstance,
  createInventoryItemInstance,
} from "./kitchen/instances";

// ============ Constraint Handling ============

export {
  OVERRIDE_REASON_CODES,
  isConstraintActionable,
  hasActionableConstraints,
  getActionableConstraints,
  getBlockingConstraints,
  getWarningConstraints,
  canProceedWithConstraints,
  createOverrideRequest,
  formatConstraintOutcome,
  formatGuardFailure,
  formatPolicyDenial,
} from "./kitchen/constraint-outcomes";

export type {
  OverrideReasonCode,
  ConstraintSeverity,
  CommandResultWithConstraints,
} from "./kitchen/constraint-outcomes";

// ============ Prisma Store Exports ============

export {
  createPrismaStoreProvider,
  PrepTaskPrismaStore,
  StationPrismaStore,
} from "./prisma-store";

// ============ Prep List Auto-Generation Exports ============

export {
  generatePrepListImmediately,
  processPendingPrepListGenerations,
  triggerPrepListAutoGeneration,
} from "./prep-list-autogeneration";

export type {
  PrepListAutoGenerationInput,
  PrepListAutoGenerationResult,
} from "./prep-list-autogeneration";

// ============ Optional Feature Modules ============

export * from "./manifest-telemetry-collector";
export * from "./permission-checker";
export * from "./permission-guard";
export * from "./prep-task-dependency-engine";
