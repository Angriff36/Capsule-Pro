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
 * 1. Edit .manifest file in packages/manifest-adapters/manifests/
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
import type { CommandResult, EmittedEvent, RuntimeContext, RuntimeEngine } from "@manifest/runtime";
import type { OverrideRequest } from "@manifest/runtime/ir";
import { ManifestRuntimeEngine } from "./runtime-engine.js";
import type { Store } from "@manifest/runtime";
/**
 * Kitchen Ops Runtime Context
 */
export interface KitchenOpsContext extends RuntimeContext {
    tenantId: string;
    userId: string;
    userRole?: string;
    /**
     * Optional workflow metadata for event correlation and tracing.
     * @example
     * ```typescript
     * {
     *   correlationId: 'evt-123', // Groups all operations in this event workflow
     *   causationId: 'schedule-evt-123' // Links to triggering event
     * }
     * ```
     */
    correlationId?: string;
    causationId?: string;
    /**
     * Optional evaluation limits to protect against runaway expressions.
     * @default { maxExpressionDepth: 64, maxEvaluationSteps: 10_000 }
     */
    evaluationLimits?: {
        maxExpressionDepth?: number;
        maxEvaluationSteps?: number;
    };
    /**
     * Optional deterministic mode to block adapter side effects (for testing/replay).
     * When true, persist/publish/effect actions throw ManifestEffectBoundaryError.
     * @default false
     */
    deterministicMode?: boolean;
    /**
     * Optional store provider for entity persistence.
     * If provided, entities will be persisted using this store.
     * Use `createPrismaStoreProvider(prisma, tenantId)` for Prisma-backed storage.
     * Defaults to undefined (in-memory storage).
     */
    storeProvider?: (entityName: string) => Store | undefined;
    /**
     * Optional connection string for PostgresStore.
     * If provided, entities will be persisted in PostgreSQL.
     * Defaults to undefined (in-memory storage).
     *
     * @deprecated Use `storeProvider` with `createPrismaStoreProvider` for better
     * integration with existing Prisma schema.
     */
    databaseUrl?: string;
    /**
     * Optional telemetry callbacks for observability.
     * Use this to integrate with Sentry, Logtail, or other telemetry services.
     *
     * @example
     * ```typescript
     * import * as Sentry from '@sentry/nextjs';
     *
     * const runtime = await createPrepTaskRuntime({
     *   ...context,
     *   telemetry: {
     *     onConstraintEvaluated: (outcome, commandName, entityName) => {
     *       if (outcome.severity !== 'ok') {
     *         Sentry.metrics.increment('manifest.constraint.evaluated', 1, {
     *           tags: {
     *             severity: outcome.severity,
     *             passed: String(outcome.passed),
     *             overridden: String(outcome.overridden),
     *             entity: entityName || 'unknown',
     *             command: commandName
     *           }
     *         });
     *       }
     *     },
     *     onOverrideApplied: (constraint, overrideReq, outcome, commandName) => {
     *       Sentry.metrics.increment('manifest.override.applied', 1, {
     *         tags: {
     *           constraintCode: constraint.code,
     *           severity: outcome.severity,
     *           command: commandName
     *         }
     *       });
     *     },
     *     onCommandExecuted: (command, result, entityName) => {
     *       if (!result.success) {
     *         Sentry.metrics.increment('manifest.command.failed', 1, {
     *           tags: { entity: entityName || 'unknown', command: command.name }
     *         });
     *       }
     *       const blockedCount = result.constraintOutcomes?.filter(
     *         o => !o.passed && !o.overridden && o.severity === 'block'
     *       ).length ?? 0;
     *       const warnCount = result.constraintOutcomes?.filter(
     *         o => !o.passed && o.severity === 'warn'
     *       ).length ?? 0;
     *       if (blockedCount > 0 || warnCount > 0) {
     *         Sentry.metrics.increment('manifest.constraint.blocked', blockedCount, {
     *           tags: { entity: entityName || 'unknown' }
     *         });
     *         Sentry.metrics.increment('manifest.constraint.warn', warnCount, {
     *           tags: { entity: entityName || 'unknown' }
     *         });
     *       }
     *     }
     *   }
     * });
     * ```
     */
    telemetry?: {
        onConstraintEvaluated?: (outcome: Readonly<import("@manifest/runtime/ir").ConstraintOutcome>, commandName: string, entityName?: string) => void;
        onOverrideApplied?: (constraint: Readonly<import("@manifest/runtime/ir").IRConstraint>, overrideReq: Readonly<import("@manifest/runtime/ir").OverrideRequest>, outcome: Readonly<import("@manifest/runtime/ir").ConstraintOutcome>, commandName: string) => void;
        onCommandExecuted?: (command: Readonly<import("@manifest/runtime/ir").IRCommand>, result: Readonly<import("@manifest/runtime").CommandResult>, entityName?: string) => void;
    };
}
/**
 * Result of a prep task command
 */
export interface PrepTaskCommandResult extends CommandResult {
    taskId: string;
    claimedBy?: string;
    claimedAt?: number;
    status?: string;
}
/**
 * Result of a station command
 */
export interface StationCommandResult extends CommandResult {
    stationId: string;
    currentTaskCount?: number;
    capacity?: number;
}
/**
 * Result of an inventory command
 */
export interface InventoryCommandResult extends CommandResult {
    itemId: string;
    quantityOnHand?: number;
    quantityReserved?: number;
    quantityAvailable?: number;
}
/**
 * Result of a recipe command
 */
export interface RecipeCommandResult extends CommandResult {
    recipeId: string;
    name?: string;
    isActive?: boolean;
}
/**
 * Result of a dish command
 */
export interface DishCommandResult extends CommandResult {
    dishId: string;
    name?: string;
    pricePerPerson?: number;
    costPerPerson?: number;
}
/**
 * Workflow metadata options for runCommand calls.
 * These are passed through to enable event correlation and tracing.
 */
export interface WorkflowMetadataOptions {
    correlationId?: string;
    causationId?: string;
    idempotencyKey?: string;
}
/**
 * Helper to extract workflow metadata from context for runCommand options.
 * @example
 * ```typescript
 * const runtime = await createPrepTaskRuntime({
 *   tenantId,
 *   userId,
 *   correlationId: 'evt-123',
 *   causationId: 'schedule-evt-123'
 * });
 *
 * const options = getWorkflowOptions(runtime);
 * await engine.runCommand("claim", {...}, {...options});
 * ```
 */
export declare function getWorkflowOptions(context: KitchenOpsContext): WorkflowMetadataOptions;
/**
 * Create a PostgresStore provider for persistent entity storage.
 *
 * @param databaseUrl - PostgreSQL connection string
 * @param tenantId - Tenant ID for table namespacing (optional)
 * @returns A store provider function for RuntimeEngine
 */
export declare function createPostgresStoreProvider(databaseUrl: string, tenantId?: string): (entityName: string) => Store | undefined;
/**
 * Create a kitchen operations runtime for prep tasks
 */
export declare function createPrepTaskRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a kitchen operations runtime for stations
 */
export declare function createStationRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a kitchen operations runtime for inventory
 */
export declare function createInventoryRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a kitchen operations runtime for recipes
 */
export declare function createRecipeRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a kitchen operations runtime for menus
 */
export declare function createMenuRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a kitchen operations runtime for prep lists
 */
export declare function createPrepListRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Create a combined kitchen operations runtime
 */
export declare function createKitchenOpsRuntime(context: KitchenOpsContext): Promise<ManifestRuntimeEngine>;
/**
 * Claim a prep task
 */
export declare function claimPrepTask(engine: RuntimeEngine, taskId: string, userId: string, stationId: string, overrideRequests?: OverrideRequest[], correlationId?: string, causationId?: string, idempotencyKey?: string): Promise<PrepTaskCommandResult>;
/**
 * Start a prep task
 */
export declare function startPrepTask(engine: RuntimeEngine, taskId: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
/**
 * Complete a prep task
 */
export declare function completePrepTask(engine: RuntimeEngine, taskId: string, quantityCompleted: number, userId: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
/**
 * Release a prep task
 */
export declare function releasePrepTask(engine: RuntimeEngine, taskId: string, userId: string, reason: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
/**
 * Reassign a prep task
 */
export declare function reassignPrepTask(engine: RuntimeEngine, taskId: string, newUserId: string, requestedBy: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
/**
 * Update prep task quantity
 */
export declare function updatePrepTaskQuantity(engine: RuntimeEngine, taskId: string, quantityTotal: number, quantityCompleted: number): Promise<PrepTaskCommandResult>;
/**
 * Cancel a prep task
 */
export declare function cancelPrepTask(engine: RuntimeEngine, taskId: string, reason: string, canceledBy: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
/**
 * Assign a task to a station
 */
export declare function assignTaskToStation(engine: RuntimeEngine, stationId: string, taskId: string, taskName: string): Promise<StationCommandResult>;
/**
 * Remove a task from a station
 */
export declare function removeTaskFromStation(engine: RuntimeEngine, stationId: string, taskId: string): Promise<StationCommandResult>;
/**
 * Update station capacity
 */
export declare function updateStationCapacity(engine: RuntimeEngine, stationId: string, newCapacity: number, userId: string): Promise<StationCommandResult>;
/**
 * Deactivate a station
 */
export declare function deactivateStation(engine: RuntimeEngine, stationId: string, reason: string, userId: string): Promise<StationCommandResult>;
/**
 * Activate a station
 */
export declare function activateStation(engine: RuntimeEngine, stationId: string, userId: string): Promise<StationCommandResult>;
/**
 * Update station equipment
 */
export declare function updateStationEquipment(engine: RuntimeEngine, stationId: string, equipmentList: string, userId: string): Promise<StationCommandResult>;
/**
 * Reserve inventory
 */
export declare function reserveInventory(engine: RuntimeEngine, itemId: string, quantity: number, eventId: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Consume inventory
 */
export declare function consumeInventory(engine: RuntimeEngine, itemId: string, quantity: number, lotId: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Record inventory waste
 */
export declare function wasteInventory(engine: RuntimeEngine, itemId: string, quantity: number, reason: string, lotId: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Adjust inventory
 */
export declare function adjustInventory(engine: RuntimeEngine, itemId: string, quantity: number, reason: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Restock inventory
 */
export declare function restockInventory(engine: RuntimeEngine, itemId: string, quantity: number, costPerUnit: number, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Release inventory reservation
 */
export declare function releaseInventoryReservation(engine: RuntimeEngine, itemId: string, quantity: number, eventId: string, userId: string, overrideRequests?: OverrideRequest[]): Promise<InventoryCommandResult>;
/**
 * Update a recipe
 */
export declare function updateRecipe(engine: RuntimeEngine, recipeId: string, newName: string, newCategory: string, newCuisineType: string, newDescription: string, newTags: string, overrideRequests?: OverrideRequest[]): Promise<RecipeCommandResult>;
/**
 * Deactivate a recipe
 */
export declare function deactivateRecipe(engine: RuntimeEngine, recipeId: string, reason: string, overrideRequests?: OverrideRequest[]): Promise<RecipeCommandResult>;
/**
 * Activate a recipe
 */
export declare function activateRecipe(engine: RuntimeEngine, recipeId: string, overrideRequests?: OverrideRequest[]): Promise<RecipeCommandResult>;
/**
 * Create a recipe version
 */
export declare function createRecipeVersion(engine: RuntimeEngine, versionId: string, yieldQty: number, yieldUnit: number, prepTime: number, cookTime: number, restTime: number, difficulty: number, instructionsText: string, notesText: string): Promise<RecipeCommandResult>;
/**
 * Update dish pricing
 */
export declare function updateDishPricing(engine: RuntimeEngine, dishId: string, newPrice: number, newCost: number, overrideRequests?: OverrideRequest[]): Promise<DishCommandResult>;
/**
 * Update dish lead time
 */
export declare function updateDishLeadTime(engine: RuntimeEngine, dishId: string, minDays: number, maxDays: number, overrideRequests?: OverrideRequest[]): Promise<DishCommandResult>;
/**
 * Create a dish
 */
export declare function createDish(engine: RuntimeEngine, dishId: string, name: string, recipeId: string, description: string, category: string, serviceStyle: string, dietaryTags: string, allergens: string, pricePerPerson: number, costPerPerson: number, minPrepLeadDays: number, maxPrepLeadDays: number, portionSizeDescription: string): Promise<DishCommandResult>;
/**
 * Create a recipe
 */
export declare function createRecipe(engine: RuntimeEngine, recipeId: string, name: string, category: string, cuisineType: string, description: string, tags: string): Promise<RecipeCommandResult>;
/**
 * Result of a menu command
 */
export interface MenuCommandResult extends CommandResult {
    menuId: string;
    name?: string;
    isActive?: boolean;
}
/**
 * Update a menu
 */
export declare function updateMenu(engine: RuntimeEngine, menuId: string, newName: string, newDescription: string, newCategory: string, newBasePrice: number, newPricePerPerson: number, newMinGuests: number, newMaxGuests: number, newIsActive: boolean, overrideRequests?: OverrideRequest[]): Promise<MenuCommandResult>;
/**
 * Activate a menu
 */
export declare function activateMenu(engine: RuntimeEngine, menuId: string, overrideRequests?: OverrideRequest[]): Promise<MenuCommandResult>;
/**
 * Deactivate a menu
 */
export declare function deactivateMenu(engine: RuntimeEngine, menuId: string, overrideRequests?: OverrideRequest[]): Promise<MenuCommandResult>;
/**
 * Create a menu
 */
export declare function createMenu(engine: RuntimeEngine, menuId: string, name: string, description: string, category: string, basePrice: number, pricePerPerson: number, minGuests: number, maxGuests: number): Promise<MenuCommandResult>;
/**
 * Result of a prep list command
 */
export interface PrepListCommandResult extends CommandResult {
    prepListId: string;
    name?: string;
    status?: string;
    totalItems?: number;
    totalEstimatedTime?: number;
}
/**
 * Result of a prep list item command
 */
export interface PrepListItemCommandResult extends CommandResult {
    itemId: string;
    prepListId: string;
    ingredientName?: string;
    isCompleted?: boolean;
}
/**
 * Update a prep list
 */
export declare function updatePrepList(engine: RuntimeEngine, prepListId: string, newName: string, newDietaryRestrictions: string, newNotes: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Update prep list batch multiplier
 */
export declare function updatePrepListBatchMultiplier(engine: RuntimeEngine, prepListId: string, newMultiplier: number, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Finalize a prep list
 */
export declare function finalizePrepList(engine: RuntimeEngine, prepListId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Activate a prep list
 */
export declare function activatePrepList(engine: RuntimeEngine, prepListId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Deactivate a prep list
 */
export declare function deactivatePrepList(engine: RuntimeEngine, prepListId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Mark prep list as completed
 */
export declare function markPrepListCompleted(engine: RuntimeEngine, prepListId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Cancel a prep list
 */
export declare function cancelPrepList(engine: RuntimeEngine, prepListId: string, reason: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Update prep list item quantity
 */
export declare function updatePrepListItemQuantity(engine: RuntimeEngine, itemId: string, newBaseQuantity: number, newScaledQuantity: number, newBaseUnit: string, newScaledUnit: string, overrideRequests?: OverrideRequest[]): Promise<PrepListItemCommandResult>;
/**
 * Update prep list item station
 */
export declare function updatePrepListItemStation(engine: RuntimeEngine, itemId: string, newStationId: string, newStationName: string, overrideRequests?: OverrideRequest[]): Promise<PrepListItemCommandResult>;
/**
 * Update prep list item notes
 */
export declare function updatePrepListItemNotes(engine: RuntimeEngine, itemId: string, newNotes: string, newDietarySubstitutions: string, overrideRequests?: OverrideRequest[]): Promise<PrepListItemCommandResult>;
/**
 * Mark prep list item as completed
 */
export declare function markPrepListItemCompleted(engine: RuntimeEngine, itemId: string, completedByUserId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListItemCommandResult>;
/**
 * Mark prep list item as uncompleted
 */
export declare function markPrepListItemUncompleted(engine: RuntimeEngine, itemId: string, overrideRequests?: OverrideRequest[]): Promise<PrepListItemCommandResult>;
/**
 * Create a prep list
 */
export declare function createPrepList(engine: RuntimeEngine, prepListId: string, eventId: string, name: string, batchMultiplier: number, dietaryRestrictions: string, totalItems: number, totalEstimatedTime: number, notes: string, overrideRequests?: OverrideRequest[]): Promise<PrepListCommandResult>;
/**
 * Setup event listeners for kitchen operations
 */
export declare function setupKitchenOpsEventListeners(engine: RuntimeEngine, handlers: {
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
}): () => void;
/**
 * Get all emitted events from the runtime
 */
export declare function getKitchenOpsEventLog(engine: RuntimeEngine): EmittedEvent[];
/**
 * Create a prep task instance
 */
export declare function createPrepTaskInstance(engine: RuntimeEngine, data: {
    id: string;
    tenantId: string;
    eventId: string;
    name: string;
    taskType?: string;
    quantityTotal?: number;
    quantityUnitId?: string;
    servingsTotal?: number;
    startByDate?: number;
    dueByDate?: number;
    priority?: number;
    stationId?: string;
}): Promise<import("@manifest/runtime").EntityInstance | undefined>;
/**
 * Create a station instance
 */
export declare function createStationInstance(engine: RuntimeEngine, data: {
    id: string;
    tenantId: string;
    locationId: string;
    name: string;
    stationType?: string;
    capacitySimultaneousTasks?: number;
    equipmentList?: string;
}): Promise<import("@manifest/runtime").EntityInstance | undefined>;
/**
 * Create an inventory item instance
 */
export declare function createInventoryItemInstance(engine: RuntimeEngine, data: {
    id: string;
    tenantId: string;
    name: string;
    itemType?: string;
    category?: string;
    baseUnit?: string;
    quantityOnHand?: number;
    parLevel?: number;
    costPerUnit?: number;
    locationId?: string;
}): Promise<import("@manifest/runtime").EntityInstance | undefined>;
import type { ConstraintOutcome } from "@manifest/runtime/ir";
/**
 * Override reason codes for constraint overrides
 * These are application-specific reasons for authorizing constraint overrides
 */
export declare const OVERRIDE_REASON_CODES: {
    readonly customer_request: "Customer Request";
    readonly equipment_failure: "Equipment Failure";
    readonly time_crunch: "Time Crunch";
    readonly substitution: "Substitution Available";
    readonly staffing_gap: "Staffing Gap";
    readonly other: "Other";
};
export type OverrideReasonCode = keyof typeof OVERRIDE_REASON_CODES;
/**
 * Severity level for constraint outcomes
 */
export type ConstraintSeverity = "ok" | "warn" | "block";
/**
 * Check if a constraint outcome requires user attention
 */
export declare function isConstraintActionable(outcome: ConstraintOutcome): boolean;
/**
 * Check if any constraints in the array require attention
 */
export declare function hasActionableConstraints(outcomes: ConstraintOutcome[] | undefined): boolean;
/**
 * Get only the actionable (failed) constraints
 */
export declare function getActionableConstraints(outcomes: ConstraintOutcome[] | undefined): ConstraintOutcome[];
/**
 * Get constraints that are blocking (failed with BLOCK severity)
 */
export declare function getBlockingConstraints(outcomes: ConstraintOutcome[] | undefined): ConstraintOutcome[];
/**
 * Get constraints that are warnings (failed with WARN severity)
 */
export declare function getWarningConstraints(outcomes: ConstraintOutcome[] | undefined): ConstraintOutcome[];
/**
 * Check if command can proceed (no blocking constraints or all blocking constraints are overridden)
 */
export declare function canProceedWithConstraints(outcomes: ConstraintOutcome[] | undefined): boolean;
/**
 * Create an override request for a constraint
 */
export declare function createOverrideRequest(constraintCode: string, reason: string, authorizedBy: string): OverrideRequest;
/**
 * Format constraint outcome for display
 */
export declare function formatConstraintOutcome(outcome: ConstraintOutcome): {
    title: string;
    description: string;
    severity: "default" | "warning" | "destructive";
    details: Record<string, string>;
};
/**
 * Extended command result with constraint outcome helpers
 */
export interface CommandResultWithConstraints<T = unknown> {
    success: boolean;
    result?: T;
    error?: string;
    deniedBy?: string;
    guardFailure?: {
        index: number;
        expression: string;
        formatted: string;
        resolved?: Array<{
            expression: string;
            value: unknown;
        }>;
    };
    policyDenial?: {
        policyName: string;
        message?: string;
        resolved?: Array<{
            expression: string;
            value: unknown;
        }>;
    };
    constraintOutcomes?: ConstraintOutcome[];
    overrideRequests?: OverrideRequest[];
    concurrencyConflict?: {
        entityType: string;
        entityId: string;
        expectedVersion: number;
        actualVersion: number;
        conflictCode: string;
    };
    emittedEvents: Array<{
        name: string;
        channel: string;
        payload: unknown;
        timestamp: number;
    }>;
}
/**
 * Parse and format guard failure for UI display
 */
export declare function formatGuardFailure(failure: NonNullable<CommandResultWithConstraints["guardFailure"]>): {
    title: string;
    description: string;
    values: Array<{
        expression: string;
        value: string;
    }>;
};
/**
 * Parse and format policy denial for UI display
 */
export declare function formatPolicyDenial(denial: NonNullable<CommandResultWithConstraints["policyDenial"]>): {
    title: string;
    description: string;
    values: Array<{
        expression: string;
        value: string;
    }>;
};
export { createPrismaStoreProvider, DishPrismaStore, IngredientPrismaStore, InventoryItemPrismaStore, loadDishFromPrisma, loadIngredientFromPrisma, loadInventoryItemFromPrisma, loadMenuDishFromPrisma, loadMenuFromPrisma, loadPrepListFromPrisma, loadPrepListItemFromPrisma, loadPrepTaskFromPrisma, loadRecipeFromPrisma, loadRecipeIngredientFromPrisma, loadRecipeVersionFromPrisma, loadStationFromPrisma, MenuDishPrismaStore, MenuPrismaStore, PrepListItemPrismaStore, PrepListPrismaStore, PrepTaskPrismaStore, RecipeIngredientPrismaStore, RecipePrismaStore, RecipeVersionPrismaStore, StationPrismaStore, syncDishToPrisma, syncIngredientToPrisma, syncInventoryItemToPrisma, syncMenuDishToPrisma, syncMenuToPrisma, syncPrepListItemToPrisma, syncPrepListToPrisma, syncPrepTaskToPrisma, syncRecipeIngredientToPrisma, syncRecipeToPrisma, syncRecipeVersionToPrisma, syncStationToPrisma, } from "./prisma-store.js";
export { generatePrepListImmediately, type PrepListAutoGenerationInput, type PrepListAutoGenerationResult, processPendingPrepListGenerations, triggerPrepListAutoGeneration, } from "./prep-list-autogeneration.js";
//# sourceMappingURL=index.d.ts.map