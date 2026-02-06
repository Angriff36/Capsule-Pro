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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileToIR, RuntimeEngine } from "@repo/manifest";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANIFESTS_DIR = join(__dirname, "..", "manifests");
// ============ Manifest Sources ============
/**
 * Load prep task manifest source from file
 */
function loadPrepTaskManifestSource() {
    return readFileSync(join(MANIFESTS_DIR, "prep-task-rules.manifest"), "utf-8");
}
/**
 * Load station manifest source from file
 */
function loadStationManifestSource() {
    return readFileSync(join(MANIFESTS_DIR, "station-rules.manifest"), "utf-8");
}
/**
 * Load inventory manifest source from file
 */
function loadInventoryManifestSource() {
    return readFileSync(join(MANIFESTS_DIR, "inventory-rules.manifest"), "utf-8");
}
/**
 * Load recipe manifest source from file
 */
function loadRecipeManifestSource() {
    return readFileSync(join(MANIFESTS_DIR, "recipe-rules.manifest"), "utf-8");
}
// Cached compiled IR for each manifest
let cachedPrepTaskIR = null;
let cachedStationIR = null;
let cachedInventoryIR = null;
let cachedRecipeIR = null;
/**
 * Compile and cache the PrepTask manifest IR
 */
async function loadPrepTaskManifestIR() {
    if (cachedPrepTaskIR) {
        return cachedPrepTaskIR;
    }
    const manifestSource = loadPrepTaskManifestSource();
    const { ir, diagnostics } = await compileToIR(manifestSource);
    if (!ir) {
        throw new Error(`Failed to compile PrepTask manifest: ${diagnostics.map((d) => d.message).join(", ")}`);
    }
    cachedPrepTaskIR = ir;
    return ir;
}
/**
 * Compile and cache the Station manifest IR
 */
async function loadStationManifestIR() {
    if (cachedStationIR) {
        return cachedStationIR;
    }
    const manifestSource = loadStationManifestSource();
    const { ir, diagnostics } = await compileToIR(manifestSource);
    if (!ir) {
        throw new Error(`Failed to compile Station manifest: ${diagnostics.map((d) => d.message).join(", ")}`);
    }
    cachedStationIR = ir;
    return ir;
}
/**
 * Compile and cache the Inventory manifest IR
 */
async function loadInventoryManifestIR() {
    if (cachedInventoryIR) {
        return cachedInventoryIR;
    }
    const manifestSource = loadInventoryManifestSource();
    const { ir, diagnostics } = await compileToIR(manifestSource);
    if (!ir) {
        throw new Error(`Failed to compile Inventory manifest: ${diagnostics.map((d) => d.message).join(", ")}`);
    }
    cachedInventoryIR = ir;
    return ir;
}
/**
 * Compile and cache the Recipe manifest IR
 */
async function loadRecipeManifestIR() {
    if (cachedRecipeIR) {
        return cachedRecipeIR;
    }
    const manifestSource = loadRecipeManifestSource();
    const { ir, diagnostics } = await compileToIR(manifestSource);
    if (!ir) {
        throw new Error(`Failed to compile Recipe manifest: ${diagnostics.map((d) => d.message).join(", ")}`);
    }
    cachedRecipeIR = ir;
    return ir;
}
/**
 * Create a PostgresStore provider for persistent entity storage.
 *
 * @param databaseUrl - PostgreSQL connection string
 * @param tenantId - Tenant ID for table namespacing (optional)
 * @returns A store provider function for RuntimeEngine
 */
export function createPostgresStoreProvider(databaseUrl, tenantId) {
    const tenantSuffix = tenantId ? `_${tenantId.replace(/-/g, "_")}` : "";
    return (entityName) => {
        // Map entity names to table names
        const tableNameMap = {
            PrepTask: `kitchen_prep_tasks${tenantSuffix}`,
            Station: `kitchen_stations${tenantSuffix}`,
            InventoryItem: `kitchen_inventory_items${tenantSuffix}`,
            Recipe: `kitchen_recipes${tenantSuffix}`,
            RecipeVersion: `kitchen_recipe_versions${tenantSuffix}`,
            Ingredient: `kitchen_ingredients${tenantSuffix}`,
            RecipeIngredient: `kitchen_recipe_ingredients${tenantSuffix}`,
            Dish: `kitchen_dishes${tenantSuffix}`,
        };
        const tableName = tableNameMap[entityName];
        if (!tableName) {
            return undefined; // Use default (memory) store for unknown entities
        }
        // Dynamically import PostgresStore only when databaseUrl is provided
        // This avoids requiring the pg package in environments that don't need it
        try {
            const { PostgresStore: PGStore, } = require("@repo/manifest/src/manifest/stores.node");
            return new PGStore({
                connectionString: databaseUrl,
                tableName,
            });
        }
        catch {
            return undefined; // Fall back to memory store if PostgresStore is unavailable
        }
    };
}
/**
 * Create a kitchen operations runtime for prep tasks
 */
export async function createPrepTaskRuntime(context) {
    const ir = await loadPrepTaskManifestIR();
    const options = context.storeProvider || context.databaseUrl || context.telemetry
        ? {
            ...(context.storeProvider && {
                storeProvider: context.storeProvider,
            }),
            ...(context.databaseUrl &&
                !context.storeProvider && {
                storeProvider: createPostgresStoreProvider(context.databaseUrl, context.tenantId),
            }),
            ...(context.telemetry && { telemetry: context.telemetry }),
        }
        : undefined;
    const engine = new RuntimeEngine(ir, context, options);
    return engine;
}
/**
 * Create a kitchen operations runtime for stations
 */
export async function createStationRuntime(context) {
    const ir = await loadStationManifestIR();
    const options = context.storeProvider || context.databaseUrl || context.telemetry
        ? {
            ...(context.storeProvider && {
                storeProvider: context.storeProvider,
            }),
            ...(context.databaseUrl &&
                !context.storeProvider && {
                storeProvider: createPostgresStoreProvider(context.databaseUrl, context.tenantId),
            }),
            ...(context.telemetry && { telemetry: context.telemetry }),
        }
        : undefined;
    const engine = new RuntimeEngine(ir, context, options);
    return engine;
}
/**
 * Create a kitchen operations runtime for inventory
 */
export async function createInventoryRuntime(context) {
    const ir = await loadInventoryManifestIR();
    const options = context.storeProvider || context.databaseUrl || context.telemetry
        ? {
            ...(context.storeProvider && {
                storeProvider: context.storeProvider,
            }),
            ...(context.databaseUrl &&
                !context.storeProvider && {
                storeProvider: createPostgresStoreProvider(context.databaseUrl, context.tenantId),
            }),
            ...(context.telemetry && { telemetry: context.telemetry }),
        }
        : undefined;
    const engine = new RuntimeEngine(ir, context, options);
    return engine;
}
/**
 * Create a kitchen operations runtime for recipes
 */
export async function createRecipeRuntime(context) {
    const ir = await loadRecipeManifestIR();
    const options = context.storeProvider || context.databaseUrl || context.telemetry
        ? {
            ...(context.storeProvider && {
                storeProvider: context.storeProvider,
            }),
            ...(context.databaseUrl &&
                !context.storeProvider && {
                storeProvider: createPostgresStoreProvider(context.databaseUrl, context.tenantId),
            }),
            ...(context.telemetry && { telemetry: context.telemetry }),
        }
        : undefined;
    const engine = new RuntimeEngine(ir, context, options);
    return engine;
}
/**
 * Create a combined kitchen operations runtime
 */
export async function createKitchenOpsRuntime(context) {
    const prepTaskIR = await loadPrepTaskManifestIR();
    const stationIR = await loadStationManifestIR();
    const inventoryIR = await loadInventoryManifestIR();
    const recipeIR = await loadRecipeManifestIR();
    // Combine IRs - in a real implementation, you'd merge modules
    const combinedIR = {
        version: "1.0",
        provenance: prepTaskIR.provenance,
        modules: [
            ...(prepTaskIR.modules || []),
            ...(stationIR.modules || []),
            ...(inventoryIR.modules || []),
            ...(recipeIR.modules || []),
        ],
        entities: [
            ...prepTaskIR.entities,
            ...stationIR.entities,
            ...inventoryIR.entities,
            ...recipeIR.entities,
        ],
        events: [
            ...prepTaskIR.events,
            ...stationIR.events,
            ...inventoryIR.events,
            ...recipeIR.events,
        ],
        commands: [
            ...prepTaskIR.commands,
            ...stationIR.commands,
            ...inventoryIR.commands,
            ...recipeIR.commands,
        ],
        policies: [
            ...prepTaskIR.policies,
            ...stationIR.policies,
            ...inventoryIR.policies,
            ...recipeIR.policies,
        ],
    };
    const options = context.storeProvider || context.databaseUrl || context.telemetry
        ? {
            ...(context.storeProvider && {
                storeProvider: context.storeProvider,
            }),
            ...(context.databaseUrl &&
                !context.storeProvider && {
                storeProvider: createPostgresStoreProvider(context.databaseUrl, context.tenantId),
            }),
            ...(context.telemetry && { telemetry: context.telemetry }),
        }
        : undefined;
    const engine = new RuntimeEngine(combinedIR, context, options);
    return engine;
}
// ============ Prep Task Commands ============
/**
 * Claim a prep task
 */
export async function claimPrepTask(engine, taskId, userId, stationId, overrideRequests) {
    const result = await engine.runCommand("claim", { userId, stationId }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Start a prep task
 */
export async function startPrepTask(engine, taskId, userId, overrideRequests) {
    const result = await engine.runCommand("start", { userId }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Complete a prep task
 */
export async function completePrepTask(engine, taskId, quantityCompleted, userId, overrideRequests) {
    const result = await engine.runCommand("complete", { quantityCompleted, userId }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Release a prep task
 */
export async function releasePrepTask(engine, taskId, userId, reason, overrideRequests) {
    const result = await engine.runCommand("release", { userId, reason }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Reassign a prep task
 */
export async function reassignPrepTask(engine, taskId, newUserId, requestedBy, overrideRequests) {
    const result = await engine.runCommand("reassign", { newUserId, requestedBy }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Update prep task quantity
 */
export async function updatePrepTaskQuantity(engine, taskId, quantityTotal, quantityCompleted) {
    const result = await engine.runCommand("updateQuantity", { quantityTotal, quantityCompleted }, {
        entityName: "PrepTask",
        instanceId: taskId,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
/**
 * Cancel a prep task
 */
export async function cancelPrepTask(engine, taskId, reason, canceledBy, overrideRequests) {
    const result = await engine.runCommand("cancel", { reason, canceledBy }, {
        entityName: "PrepTask",
        instanceId: taskId,
        overrideRequests,
    });
    const instance = await engine.getInstance("PrepTask", taskId);
    return {
        ...result,
        taskId,
        claimedBy: instance?.claimedBy,
        claimedAt: instance?.claimedAt,
        status: instance?.status,
    };
}
// ============ Station Commands ============
/**
 * Assign a task to a station
 */
export async function assignTaskToStation(engine, stationId, taskId, taskName) {
    const result = await engine.runCommand("assignTask", { taskId, taskName }, {
        entityName: "Station",
        instanceId: stationId,
    });
    const instance = await engine.getInstance("Station", stationId);
    return {
        ...result,
        stationId,
        currentTaskCount: instance?.currentTaskCount,
        capacity: instance?.capacitySimultaneousTasks,
    };
}
/**
 * Remove a task from a station
 */
export async function removeTaskFromStation(engine, stationId, taskId) {
    const result = await engine.runCommand("removeTask", { taskId }, {
        entityName: "Station",
        instanceId: stationId,
    });
    const instance = await engine.getInstance("Station", stationId);
    return {
        ...result,
        stationId,
        currentTaskCount: instance?.currentTaskCount,
        capacity: instance?.capacitySimultaneousTasks,
    };
}
/**
 * Update station capacity
 */
export async function updateStationCapacity(engine, stationId, newCapacity, userId) {
    const result = await engine.runCommand("updateCapacity", { newCapacity, userId }, {
        entityName: "Station",
        instanceId: stationId,
    });
    const instance = await engine.getInstance("Station", stationId);
    return {
        ...result,
        stationId,
        currentTaskCount: instance?.currentTaskCount,
        capacity: instance?.capacitySimultaneousTasks,
    };
}
/**
 * Deactivate a station
 */
export async function deactivateStation(engine, stationId, reason, userId) {
    const result = await engine.runCommand("deactivate", { reason, userId }, {
        entityName: "Station",
        instanceId: stationId,
    });
    return {
        ...result,
        stationId,
    };
}
/**
 * Activate a station
 */
export async function activateStation(engine, stationId, userId) {
    const result = await engine.runCommand("activate", { userId }, {
        entityName: "Station",
        instanceId: stationId,
    });
    return {
        ...result,
        stationId,
    };
}
/**
 * Update station equipment
 */
export async function updateStationEquipment(engine, stationId, equipmentList, userId) {
    const result = await engine.runCommand("updateEquipment", { equipmentList, userId }, {
        entityName: "Station",
        instanceId: stationId,
    });
    return {
        ...result,
        stationId,
    };
}
// ============ Inventory Commands ============
/**
 * Reserve inventory
 */
export async function reserveInventory(engine, itemId, quantity, eventId, userId, overrideRequests) {
    const result = await engine.runCommand("reserve", { quantity, eventId, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
/**
 * Consume inventory
 */
export async function consumeInventory(engine, itemId, quantity, lotId, userId, overrideRequests) {
    const result = await engine.runCommand("consume", { quantity, lotId, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
/**
 * Record inventory waste
 */
export async function wasteInventory(engine, itemId, quantity, reason, lotId, userId, overrideRequests) {
    const result = await engine.runCommand("waste", { quantity, reason, lotId, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
/**
 * Adjust inventory
 */
export async function adjustInventory(engine, itemId, quantity, reason, userId, overrideRequests) {
    const result = await engine.runCommand("adjust", { quantity, reason, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
/**
 * Restock inventory
 */
export async function restockInventory(engine, itemId, quantity, costPerUnit, userId, overrideRequests) {
    const result = await engine.runCommand("restock", { quantity, costPerUnit, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
/**
 * Release inventory reservation
 */
export async function releaseInventoryReservation(engine, itemId, quantity, eventId, userId, overrideRequests) {
    const result = await engine.runCommand("releaseReservation", { quantity, eventId, userId }, {
        entityName: "InventoryItem",
        instanceId: itemId,
        overrideRequests,
    });
    const instance = await engine.getInstance("InventoryItem", itemId);
    return {
        ...result,
        itemId,
        quantityOnHand: instance?.quantityOnHand,
        quantityReserved: instance?.quantityReserved,
        quantityAvailable: instance?.quantityAvailable,
    };
}
// ============ Recipe Commands ============
/**
 * Update a recipe
 */
export async function updateRecipe(engine, recipeId, newName, newCategory, newCuisineType, newDescription, newTags, overrideRequests) {
    const result = await engine.runCommand("update", { newName, newCategory, newCuisineType, newDescription, newTags }, {
        entityName: "Recipe",
        instanceId: recipeId,
        overrideRequests,
    });
    const instance = await engine.getInstance("Recipe", recipeId);
    return {
        ...result,
        recipeId,
        name: instance?.name,
        isActive: instance?.isActive,
    };
}
/**
 * Deactivate a recipe
 */
export async function deactivateRecipe(engine, recipeId, reason, overrideRequests) {
    const result = await engine.runCommand("deactivate", { reason }, {
        entityName: "Recipe",
        instanceId: recipeId,
        overrideRequests,
    });
    const instance = await engine.getInstance("Recipe", recipeId);
    return {
        ...result,
        recipeId,
        name: instance?.name,
        isActive: false,
    };
}
/**
 * Activate a recipe
 */
export async function activateRecipe(engine, recipeId, overrideRequests) {
    const result = await engine.runCommand("activate", {}, {
        entityName: "Recipe",
        instanceId: recipeId,
        overrideRequests,
    });
    const instance = await engine.getInstance("Recipe", recipeId);
    return {
        ...result,
        recipeId,
        name: instance?.name,
        isActive: true,
    };
}
/**
 * Create a recipe version
 */
export async function createRecipeVersion(engine, versionId, yieldQty, yieldUnit, prepTime, cookTime, restTime, difficulty, instructionsText, notesText) {
    const result = await engine.runCommand("create", {
        yieldQty,
        yieldUnit,
        prepTime,
        cookTime,
        restTime,
        difficulty,
        instructionsText,
        notesText,
    }, {
        entityName: "RecipeVersion",
        instanceId: versionId,
    });
    return {
        ...result,
        recipeId: versionId,
    };
}
// ============ Dish Commands ============
/**
 * Update dish pricing
 */
export async function updateDishPricing(engine, dishId, newPrice, newCost, overrideRequests) {
    const result = await engine.runCommand("updatePricing", { newPrice, newCost }, {
        entityName: "Dish",
        instanceId: dishId,
        overrideRequests,
    });
    const instance = await engine.getInstance("Dish", dishId);
    return {
        ...result,
        dishId,
        name: instance?.name,
        pricePerPerson: instance?.pricePerPerson,
        costPerPerson: instance?.costPerPerson,
    };
}
/**
 * Update dish lead time
 */
export async function updateDishLeadTime(engine, dishId, minDays, maxDays, overrideRequests) {
    const result = await engine.runCommand("updateLeadTime", { minDays, maxDays }, {
        entityName: "Dish",
        instanceId: dishId,
        overrideRequests,
    });
    const instance = await engine.getInstance("Dish", dishId);
    return {
        ...result,
        dishId,
        name: instance?.name,
        pricePerPerson: instance?.pricePerPerson,
        costPerPerson: instance?.costPerPerson,
    };
}
// ============ Event Handling ============
/**
 * Setup event listeners for kitchen operations
 */
export function setupKitchenOpsEventListeners(engine, handlers) {
    const unsubscribe = engine.onEvent(async (event) => {
        switch (event.name) {
            // PrepTask events
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
            // Station events
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
            // Inventory events
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
            // Recipe events
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
            // Dish events
            case "DishCreated":
                await handlers.onDishCreated?.(event);
                break;
            case "DishPricingUpdated":
                await handlers.onDishPricingUpdated?.(event);
                break;
            case "DishLeadTimeUpdated":
                await handlers.onDishLeadTimeUpdated?.(event);
                break;
            // Override events
            case "ConstraintOverridden":
                await handlers.onConstraintOverridden?.(event);
                break;
            case "ConstraintSatisfiedAfterOverride":
                await handlers.onConstraintSatisfiedAfterOverride?.(event);
                break;
            // Default case for unhandled events
            default:
                break;
        }
    });
    return unsubscribe;
}
/**
 * Get all emitted events from the runtime
 */
export function getKitchenOpsEventLog(engine) {
    return engine.getEventLog();
}
// ============ Instance Management ============
/**
 * Create a prep task instance
 */
export async function createPrepTaskInstance(engine, data) {
    return await engine.createInstance("PrepTask", {
        id: data.id,
        tenantId: data.tenantId,
        eventId: data.eventId,
        name: data.name,
        taskType: data.taskType || "prep",
        status: "open",
        quantityTotal: data.quantityTotal || 0,
        quantityCompleted: 0,
        quantityUnitId: data.quantityUnitId || "",
        servingsTotal: data.servingsTotal || 0,
        startByDate: data.startByDate || 0,
        dueByDate: data.dueByDate || 0,
        priority: data.priority || 5,
        stationId: data.stationId || "",
        claimedBy: "",
        claimedAt: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
}
/**
 * Create a station instance
 */
export async function createStationInstance(engine, data) {
    return await engine.createInstance("Station", {
        id: data.id,
        tenantId: data.tenantId,
        locationId: data.locationId,
        name: data.name,
        stationType: data.stationType || "prep-station",
        capacitySimultaneousTasks: data.capacitySimultaneousTasks || 1,
        equipmentList: data.equipmentList || "",
        isActive: true,
        currentTaskCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
}
/**
 * Create an inventory item instance
 */
export async function createInventoryItemInstance(engine, data) {
    const qtyOnHand = data.quantityOnHand || 0;
    return await engine.createInstance("InventoryItem", {
        id: data.id,
        tenantId: data.tenantId,
        name: data.name,
        itemType: data.itemType || "ingredient",
        category: data.category || "",
        baseUnit: data.baseUnit || "each",
        quantityOnHand: qtyOnHand,
        quantityReserved: 0,
        quantityAvailable: qtyOnHand,
        parLevel: data.parLevel || 0,
        reorderPoint: 0,
        reorderQuantity: 0,
        costPerUnit: data.costPerUnit || 0,
        locationId: data.locationId || "",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
}
/**
 * Override reason codes following the spec
 */
export const OVERRIDE_REASON_CODES = {
    customer_request: "Customer Request",
    equipment_failure: "Equipment Failure",
    time_crunch: "Time Crunch",
    substitution: "Substitution Available",
    staffing_gap: "Staffing Gap",
    other: "Other",
};
/**
 * Check if a constraint outcome requires user attention
 */
export function isConstraintActionable(outcome) {
    return (!outcome.passed &&
        (outcome.severity === "warn" || outcome.severity === "block"));
}
/**
 * Check if any constraints in the array require attention
 */
export function hasActionableConstraints(outcomes) {
    if (!outcomes || outcomes.length === 0)
        return false;
    return outcomes.some(isConstraintActionable);
}
/**
 * Get only the actionable (failed) constraints
 */
export function getActionableConstraints(outcomes) {
    if (!outcomes)
        return [];
    return outcomes.filter(isConstraintActionable);
}
/**
 * Get constraints that are blocking (failed with BLOCK severity)
 */
export function getBlockingConstraints(outcomes) {
    if (!outcomes)
        return [];
    return outcomes.filter((o) => !o.passed && o.severity === "block");
}
/**
 * Get constraints that are warnings (failed with WARN severity)
 */
export function getWarningConstraints(outcomes) {
    if (!outcomes)
        return [];
    return outcomes.filter((o) => !o.passed && o.severity === "warn");
}
/**
 * Check if command can proceed (no blocking constraints or all blocking constraints are overridden)
 */
export function canProceedWithConstraints(outcomes) {
    if (!outcomes || outcomes.length === 0)
        return true;
    const blocking = getBlockingConstraints(outcomes);
    if (blocking.length === 0)
        return true;
    // Check if all blocking constraints are overridden
    return blocking.every((o) => o.overridden);
}
/**
 * Create an override request for a constraint
 */
export function createOverrideRequest(constraintCode, reason, authorizedBy) {
    return {
        constraintCode,
        reason,
        authorizedBy,
        timestamp: Date.now(),
    };
}
/**
 * Format constraint outcome for display
 */
export function formatConstraintOutcome(outcome) {
    const severityLabels = {
        ok: "Info",
        warn: "Warning",
        block: "Blocked",
    };
    const severityStyles = {
        ok: "default",
        warn: "warning",
        block: "destructive",
    };
    const title = outcome.message ||
        `${severityLabels[outcome.severity]}: ${outcome.constraintName}`;
    const description = outcome.formatted;
    const details = {};
    if (outcome.details) {
        for (const [key, value] of Object.entries(outcome.details)) {
            details[key] = String(value);
        }
    }
    if (outcome.resolved) {
        for (const r of outcome.resolved) {
            details[r.expression] = String(r.value);
        }
    }
    return {
        title,
        description,
        severity: severityStyles[outcome.severity],
        details,
    };
}
/**
 * Parse and format guard failure for UI display
 */
export function formatGuardFailure(failure) {
    return {
        title: `Guard Failed (${failure.index})`,
        description: failure.formatted,
        values: failure.resolved?.map((r) => ({
            expression: r.expression,
            value: String(r.value),
        })) || [],
    };
}
/**
 * Parse and format policy denial for UI display
 */
export function formatPolicyDenial(denial) {
    return {
        title: `Access Denied: ${denial.policyName}`,
        description: denial.message || "You don't have permission to perform this action",
        values: denial.resolved?.map((r) => ({
            expression: r.expression,
            value: String(r.value),
        })) || [],
    };
}
// ============ Prisma Store Exports ============
export { createPrismaStoreProvider, loadPrepTaskFromPrisma, PrepTaskPrismaStore, syncPrepTaskToPrisma, } from "./prisma-store.js";
