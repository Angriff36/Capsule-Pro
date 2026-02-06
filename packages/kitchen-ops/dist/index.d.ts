/**
 * Kitchen Ops Manifest Runtime
 *
 * This module provides a runtime for executing kitchen operations commands
 * using the Manifest language. It handles prep tasks, station management,
 * and inventory operations with proper constraint checking and event emission.
 *
 * Commands:
 * - PrepTask: claim, start, complete, release, reassign, updateQuantity, cancel
 * - Station: assignTask, removeTask, updateCapacity, deactivate, activate, updateEquipment
 * - InventoryItem: reserve, consume, waste, adjust, restock, releaseReservation
 * - Recipe: update, deactivate, activate
 * - RecipeVersion: create
 * - Dish: updatePricing, updateLeadTime
 */
import type { CommandResult, EmittedEvent, RuntimeContext } from "@repo/manifest";
import { RuntimeEngine } from "@repo/manifest";
import type { Store } from "@repo/manifest";
/**
 * Kitchen Ops Runtime Context
 */
export interface KitchenOpsContext extends RuntimeContext {
    tenantId: string;
    userId: string;
    userRole?: string;
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
        onConstraintEvaluated?: (outcome: Readonly<import("@repo/manifest").ConstraintOutcome>, commandName: string, entityName?: string) => void;
        onOverrideApplied?: (constraint: Readonly<import("@repo/manifest").IRConstraint>, overrideReq: Readonly<import("@repo/manifest").OverrideRequest>, outcome: Readonly<import("@repo/manifest").ConstraintOutcome>, commandName: string) => void;
        onCommandExecuted?: (command: Readonly<import("@repo/manifest").IRCommand>, result: Readonly<import("@repo/manifest").CommandResult>, entityName?: string) => void;
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
export declare function createPrepTaskRuntime(context: KitchenOpsContext): Promise<any>;
/**
 * Create a kitchen operations runtime for stations
 */
export declare function createStationRuntime(context: KitchenOpsContext): Promise<any>;
/**
 * Create a kitchen operations runtime for inventory
 */
export declare function createInventoryRuntime(context: KitchenOpsContext): Promise<any>;
/**
 * Create a kitchen operations runtime for recipes
 */
export declare function createRecipeRuntime(context: KitchenOpsContext): Promise<any>;
/**
 * Create a combined kitchen operations runtime
 */
export declare function createKitchenOpsRuntime(context: KitchenOpsContext): Promise<any>;
/**
 * Claim a prep task
 */
export declare function claimPrepTask(engine: RuntimeEngine, taskId: string, userId: string, stationId: string, overrideRequests?: OverrideRequest[]): Promise<PrepTaskCommandResult>;
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
    onConstraintOverridden?: (event: EmittedEvent) => Promise<void>;
    onConstraintSatisfiedAfterOverride?: (event: EmittedEvent) => Promise<void>;
}): any;
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
}): Promise<any>;
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
}): Promise<any>;
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
}): Promise<any>;
import type { ConstraintOutcome, OverrideRequest } from "@repo/manifest";
/**
 * Override reason codes following the spec
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
export { createPrismaStoreProvider, loadPrepTaskFromPrisma, PrepTaskPrismaStore, syncPrepTaskToPrisma, } from "./prisma-store.js";
//# sourceMappingURL=index.d.ts.map