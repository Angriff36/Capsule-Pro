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
  DishCommandResult,
  InventoryCommandResult,
  KitchenOpsContext,
  MenuCommandResult,
  MenuDishCommandResult,
  PrepListCommandResult,
  PrepListItemCommandResult,
  PrepTaskCommandResult,
  RecipeCommandResult,
  StationCommandResult,
  WorkflowMetadataOptions,
} from "./kitchen/types";

// ============ Utility Exports ============

export { createPostgresStoreProvider } from "./kitchen/postgres-store";
export { getWorkflowOptions } from "./kitchen/workflow";

// ============ Runtime Factory Exports ============

export {
  createInventoryRuntime,
  createKitchenOpsRuntime,
  createMenuRuntime,
  createPrepListRuntime,
  createPrepTaskRuntime,
  createRecipeRuntime,
  createStationRuntime,
} from "./kitchen/runtime-factories";

// ============ Prep Task Commands ============

export {
  cancelPrepTask,
  claimPrepTask,
  completePrepTask,
  createPrepTask,
  reassignPrepTask,
  releasePrepTask,
  startPrepTask,
  updatePrepTaskQuantity,
} from "./kitchen/commands/prep-task";

// ============ Station Commands ============

export {
  activateStation,
  assignTaskToStation,
  createStation,
  deactivateStation,
  removeTaskFromStation,
  updateStationCapacity,
  updateStationEquipment,
} from "./kitchen/commands/station";

// ============ Inventory Commands ============

export {
  adjustInventory,
  consumeInventory,
  createInventoryItem,
  releaseInventoryReservation,
  reserveInventory,
  restockInventory,
  wasteInventory,
} from "./kitchen/commands/inventory";

// ============ Recipe Commands ============

export {
  activateRecipe,
  createIngredient,
  createRecipe,
  createRecipeIngredient,
  createRecipeVersion,
  deactivateRecipe,
  updateRecipe,
} from "./kitchen/commands/recipe";

// ============ Dish Commands ============

export {
  createDish,
  updateDishLeadTime,
  updateDishPricing,
} from "./kitchen/commands/dish";

// ============ Menu Commands ============

export {
  activateMenu,
  createMenu,
  createMenuDish,
  deactivateMenu,
  updateMenu,
} from "./kitchen/commands/menu";

// ============ Prep List Commands ============

export {
  activatePrepList,
  cancelPrepList,
  createPrepList,
  createPrepListItem,
  deactivatePrepList,
  finalizePrepList,
  markPrepListCompleted,
  markPrepListItemCompleted,
  markPrepListItemUncompleted,
  updatePrepList,
  updatePrepListBatchMultiplier,
  updatePrepListItemNotes,
  updatePrepListItemQuantity,
  updatePrepListItemStation,
} from "./kitchen/commands/prep-list";

// ============ Event Handling ============

export {
  getKitchenOpsEventLog,
  setupKitchenOpsEventListeners,
} from "./kitchen/event-listeners";

// ============ Instance Creation ============

export {
  createInventoryItemInstance,
  createPrepTaskInstance,
  createStationInstance,
} from "./kitchen/instances";

// ============ Constraint Handling ============

export type {
  CommandResultWithConstraints,
  ConstraintSeverity,
  OverrideReasonCode,
} from "./kitchen/constraint-outcomes";
export {
  canProceedWithConstraints,
  createOverrideRequest,
  formatConstraintOutcome,
  formatGuardFailure,
  formatPolicyDenial,
  getActionableConstraints,
  getBlockingConstraints,
  getWarningConstraints,
  hasActionableConstraints,
  isConstraintActionable,
  OVERRIDE_REASON_CODES,
} from "./kitchen/constraint-outcomes";

// ============ Prisma Store Exports ============

export {
  createPrismaStoreProvider,
  PrepTaskPrismaStore,
  StationPrismaStore,
} from "./prisma-store";

// ============ Prep List Auto-Generation Exports ============

export type {
  PrepListAutoGenerationInput,
  PrepListAutoGenerationResult,
} from "./prep-list-autogeneration";
export {
  generatePrepListImmediately,
  processPendingPrepListGenerations,
  triggerPrepListAutoGeneration,
} from "./prep-list-autogeneration";

// ============ Optional Feature Modules ============

export * from "./manifest-telemetry-collector";
export * from "./permission-checker";
export * from "./permission-guard";
export * from "./prep-task-dependency-engine";
