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
 * - Menu: update, activate, deactivate
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  CommandResult,
  EmittedEvent,
  IR,
  IRDiagnostic,
  RuntimeContext,
} from "@repo/manifest";
import { compileToIR, RuntimeEngine } from "@repo/manifest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANIFESTS_DIR = join(__dirname, "..", "manifests");

// ============ Manifest Sources ============

/**
 * Load prep task manifest source from file
 */
function loadPrepTaskManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "prep-task-rules.manifest"), "utf-8");
}

/**
 * Load station manifest source from file
 */
function loadStationManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "station-rules.manifest"), "utf-8");
}

/**
 * Load inventory manifest source from file
 */
function loadInventoryManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "inventory-rules.manifest"), "utf-8");
}

/**
 * Load recipe manifest source from file
 */
function loadRecipeManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "recipe-rules.manifest"), "utf-8");
}

/**
 * Load menu manifest source from file
 */
function loadMenuManifestSource(): string {
  return readFileSync(join(MANIFESTS_DIR, "menu-rules.manifest"), "utf-8");
}

// Cached compiled IR for each manifest
let cachedPrepTaskIR: IR | null = null;
let cachedStationIR: IR | null = null;
let cachedInventoryIR: IR | null = null;
let cachedRecipeIR: IR | null = null;
let cachedMenuIR: IR | null = null;

/**
 * Compile and cache the PrepTask manifest IR
 */
async function loadPrepTaskManifestIR(): Promise<IR> {
  if (cachedPrepTaskIR) {
    return cachedPrepTaskIR;
  }

  const manifestSource = loadPrepTaskManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile PrepTask manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedPrepTaskIR = ir;
  return ir;
}

/**
 * Compile and cache the Station manifest IR
 */
async function loadStationManifestIR(): Promise<IR> {
  if (cachedStationIR) {
    return cachedStationIR;
  }

  const manifestSource = loadStationManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Station manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedStationIR = ir;
  return ir;
}

/**
 * Compile and cache the Inventory manifest IR
 */
async function loadInventoryManifestIR(): Promise<IR> {
  if (cachedInventoryIR) {
    return cachedInventoryIR;
  }

  const manifestSource = loadInventoryManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Inventory manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedInventoryIR = ir;
  return ir;
}

/**
 * Compile and cache the Recipe manifest IR
 */
async function loadRecipeManifestIR(): Promise<IR> {
  if (cachedRecipeIR) {
    return cachedRecipeIR;
  }

  const manifestSource = loadRecipeManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Recipe manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedRecipeIR = ir;
  return ir;
}

/**
 * Compile and cache the Menu manifest IR
 */
async function loadMenuManifestIR(): Promise<IR> {
  if (cachedMenuIR) {
    return cachedMenuIR;
  }

  const manifestSource = loadMenuManifestSource();
  const { ir, diagnostics } = await compileToIR(manifestSource);

  if (!ir) {
    throw new Error(
      `Failed to compile Menu manifest: ${diagnostics.map((d: IRDiagnostic) => d.message).join(", ")}`
    );
  }

  cachedMenuIR = ir;
  return ir;
}

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
    onConstraintEvaluated?: (
      outcome: Readonly<import("@repo/manifest").ConstraintOutcome>,
      commandName: string,
      entityName?: string
    ) => void;
    onOverrideApplied?: (
      constraint: Readonly<import("@repo/manifest").IRConstraint>,
      overrideReq: Readonly<import("@repo/manifest").OverrideRequest>,
      outcome: Readonly<import("@repo/manifest").ConstraintOutcome>,
      commandName: string
    ) => void;
    onCommandExecuted?: (
      command: Readonly<import("@repo/manifest").IRCommand>,
      result: Readonly<import("@repo/manifest").CommandResult>,
      entityName?: string
    ) => void;
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
export function createPostgresStoreProvider(
  databaseUrl: string,
  tenantId?: string
): (entityName: string) => Store | undefined {
  const tenantSuffix = tenantId ? `_${tenantId.replace(/-/g, "_")}` : "";

  return (entityName: string) => {
    // Map entity names to table names
    const tableNameMap: Record<string, string> = {
      PrepTask: `kitchen_prep_tasks${tenantSuffix}`,
      Station: `kitchen_stations${tenantSuffix}`,
      InventoryItem: `kitchen_inventory_items${tenantSuffix}`,
      Recipe: `kitchen_recipes${tenantSuffix}`,
      RecipeVersion: `kitchen_recipe_versions${tenantSuffix}`,
      Ingredient: `kitchen_ingredients${tenantSuffix}`,
      RecipeIngredient: `kitchen_recipe_ingredients${tenantSuffix}`,
      Dish: `kitchen_dishes${tenantSuffix}`,
      Menu: `kitchen_menus${tenantSuffix}`,
      MenuDish: `kitchen_menu_dishes${tenantSuffix}`,
    };

    const tableName = tableNameMap[entityName];
    if (!tableName) {
      return undefined; // Use default (memory) store for unknown entities
    }

    // Dynamically import PostgresStore only when databaseUrl is provided
    // This avoids requiring the pg package in environments that don't need it
    try {
      const {
        PostgresStore: PGStore,
      } = require("@repo/manifest/src/manifest/stores.node");
      return new PGStore({
        connectionString: databaseUrl,
        tableName,
      }) as Store;
    } catch {
      return undefined; // Fall back to memory store if PostgresStore is unavailable
    }
  };
}

/**
 * Create a kitchen operations runtime for prep tasks
 */
export async function createPrepTaskRuntime(context: KitchenOpsContext) {
  const ir = await loadPrepTaskManifestIR();
  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
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
export async function createStationRuntime(context: KitchenOpsContext) {
  const ir = await loadStationManifestIR();
  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
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
export async function createInventoryRuntime(context: KitchenOpsContext) {
  const ir = await loadInventoryManifestIR();
  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
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
export async function createRecipeRuntime(context: KitchenOpsContext) {
  const ir = await loadRecipeManifestIR();
  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
            }),
          ...(context.telemetry && { telemetry: context.telemetry }),
        }
      : undefined;
  const engine = new RuntimeEngine(ir, context, options);
  return engine;
}

/**
 * Create a kitchen operations runtime for menus
 */
export async function createMenuRuntime(context: KitchenOpsContext) {
  const ir = await loadMenuManifestIR();
  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
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
export async function createKitchenOpsRuntime(context: KitchenOpsContext) {
  const prepTaskIR = await loadPrepTaskManifestIR();
  const stationIR = await loadStationManifestIR();
  const inventoryIR = await loadInventoryManifestIR();
  const recipeIR = await loadRecipeManifestIR();
  const menuIR = await loadMenuManifestIR();

  // Combine IRs - in a real implementation, you'd merge modules
  const combinedIR: IR = {
    version: "1.0",
    provenance: prepTaskIR.provenance,
    modules: [
      ...(prepTaskIR.modules || []),
      ...(stationIR.modules || []),
      ...(inventoryIR.modules || []),
      ...(recipeIR.modules || []),
      ...(menuIR.modules || []),
    ],
    entities: [
      ...prepTaskIR.entities,
      ...stationIR.entities,
      ...inventoryIR.entities,
      ...recipeIR.entities,
      ...menuIR.entities,
    ],
    events: [
      ...prepTaskIR.events,
      ...stationIR.events,
      ...inventoryIR.events,
      ...recipeIR.events,
      ...menuIR.events,
    ],
    commands: [
      ...prepTaskIR.commands,
      ...stationIR.commands,
      ...inventoryIR.commands,
      ...recipeIR.commands,
      ...menuIR.commands,
    ],
    policies: [
      ...prepTaskIR.policies,
      ...stationIR.policies,
      ...inventoryIR.policies,
      ...recipeIR.policies,
      ...menuIR.policies,
    ],
  };

  const options =
    context.storeProvider || context.databaseUrl || context.telemetry
      ? {
          ...(context.storeProvider && {
            storeProvider: context.storeProvider,
          }),
          ...(context.databaseUrl &&
            !context.storeProvider && {
              storeProvider: createPostgresStoreProvider(
                context.databaseUrl,
                context.tenantId
              ),
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
export async function claimPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  userId: string,
  stationId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "claim",
    { userId, stationId },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Start a prep task
 */
export async function startPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "start",
    { userId },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Complete a prep task
 */
export async function completePrepTask(
  engine: RuntimeEngine,
  taskId: string,
  quantityCompleted: number,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "complete",
    { quantityCompleted, userId },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Release a prep task
 */
export async function releasePrepTask(
  engine: RuntimeEngine,
  taskId: string,
  userId: string,
  reason: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "release",
    { userId, reason },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Reassign a prep task
 */
export async function reassignPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  newUserId: string,
  requestedBy: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "reassign",
    { newUserId, requestedBy },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Update prep task quantity
 */
export async function updatePrepTaskQuantity(
  engine: RuntimeEngine,
  taskId: string,
  quantityTotal: number,
  quantityCompleted: number
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "updateQuantity",
    { quantityTotal, quantityCompleted },
    {
      entityName: "PrepTask",
      instanceId: taskId,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

/**
 * Cancel a prep task
 */
export async function cancelPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  reason: string,
  canceledBy: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "cancel",
    { reason, canceledBy },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("PrepTask", taskId);
  return {
    ...result,
    taskId,
    claimedBy: instance?.claimedBy as string | undefined,
    claimedAt: instance?.claimedAt as number | undefined,
    status: instance?.status as string | undefined,
  };
}

// ============ Station Commands ============

/**
 * Assign a task to a station
 */
export async function assignTaskToStation(
  engine: RuntimeEngine,
  stationId: string,
  taskId: string,
  taskName: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "assignTask",
    { taskId, taskName },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  const instance = await engine.getInstance("Station", stationId);
  return {
    ...result,
    stationId,
    currentTaskCount: instance?.currentTaskCount as number | undefined,
    capacity: instance?.capacitySimultaneousTasks as number | undefined,
  };
}

/**
 * Remove a task from a station
 */
export async function removeTaskFromStation(
  engine: RuntimeEngine,
  stationId: string,
  taskId: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "removeTask",
    { taskId },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  const instance = await engine.getInstance("Station", stationId);
  return {
    ...result,
    stationId,
    currentTaskCount: instance?.currentTaskCount as number | undefined,
    capacity: instance?.capacitySimultaneousTasks as number | undefined,
  };
}

/**
 * Update station capacity
 */
export async function updateStationCapacity(
  engine: RuntimeEngine,
  stationId: string,
  newCapacity: number,
  userId: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "updateCapacity",
    { newCapacity, userId },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  const instance = await engine.getInstance("Station", stationId);
  return {
    ...result,
    stationId,
    currentTaskCount: instance?.currentTaskCount as number | undefined,
    capacity: instance?.capacitySimultaneousTasks as number | undefined,
  };
}

/**
 * Deactivate a station
 */
export async function deactivateStation(
  engine: RuntimeEngine,
  stationId: string,
  reason: string,
  userId: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    { reason, userId },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  return {
    ...result,
    stationId,
  };
}

/**
 * Activate a station
 */
export async function activateStation(
  engine: RuntimeEngine,
  stationId: string,
  userId: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "activate",
    { userId },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  return {
    ...result,
    stationId,
  };
}

/**
 * Update station equipment
 */
export async function updateStationEquipment(
  engine: RuntimeEngine,
  stationId: string,
  equipmentList: string,
  userId: string
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "updateEquipment",
    { equipmentList, userId },
    {
      entityName: "Station",
      instanceId: stationId,
    }
  );

  return {
    ...result,
    stationId,
  };
}

// ============ Inventory Commands ============

/**
 * Reserve inventory
 */
export async function reserveInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  eventId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "reserve",
    { quantity, eventId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Consume inventory
 */
export async function consumeInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  lotId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "consume",
    { quantity, lotId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Record inventory waste
 */
export async function wasteInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  reason: string,
  lotId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "waste",
    { quantity, reason, lotId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Adjust inventory
 */
export async function adjustInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  reason: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "adjust",
    { quantity, reason, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Restock inventory
 */
export async function restockInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  costPerUnit: number,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "restock",
    { quantity, costPerUnit, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Release inventory reservation
 */
export async function releaseInventoryReservation(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  eventId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "releaseReservation",
    { quantity, eventId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

// ============ Recipe Commands ============

/**
 * Update a recipe
 */
export async function updateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  newName: string,
  newCategory: string,
  newCuisineType: string,
  newDescription: string,
  newTags: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "update",
    { newName, newCategory, newCuisineType, newDescription, newTags },
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: instance?.isActive as boolean | undefined,
  };
}

/**
 * Deactivate a recipe
 */
export async function deactivateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  reason: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    { reason },
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: false,
  };
}

/**
 * Activate a recipe
 */
export async function activateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "activate",
    {},
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}

/**
 * Create a recipe version
 */
export async function createRecipeVersion(
  engine: RuntimeEngine,
  versionId: string,
  yieldQty: number,
  yieldUnit: number,
  prepTime: number,
  cookTime: number,
  restTime: number,
  difficulty: number,
  instructionsText: string,
  notesText: string
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      yieldQty,
      yieldUnit,
      prepTime,
      cookTime,
      restTime,
      difficulty,
      instructionsText,
      notesText,
    },
    {
      entityName: "RecipeVersion",
      instanceId: versionId,
    }
  );

  return {
    ...result,
    recipeId: versionId,
  };
}

// ============ Dish Commands ============

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
    { newPrice, newCost },
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
    { minDays, maxDays },
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
 * Create a dish
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
  portionSizeDescription: string
): Promise<DishCommandResult> {
  // Create the Dish entity instance
  await engine.createInstance("Dish", {
    id: dishId,
    tenantId: engine.getContext<string>("tenantId"),
    name,
    recipeId,
    description,
    category,
    serviceStyle,
    presentationImageUrl: "",
    dietaryTags,
    allergens,
    pricePerPerson,
    costPerPerson,
    minPrepLeadDays,
    maxPrepLeadDays,
    portionSizeDescription,
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const instance = await engine.getInstance("Dish", dishId);
  return {
    success: true,
    emittedEvents: [],
    dishId,
    name: instance?.name as string | undefined,
    pricePerPerson: instance?.pricePerPerson as number | undefined,
    costPerPerson: instance?.costPerPerson as number | undefined,
  } as DishCommandResult;
}

/**
 * Create a recipe
 */
export async function createRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  name: string,
  category: string,
  cuisineType: string,
  description: string,
  tags: string
): Promise<RecipeCommandResult> {
  // Create the Recipe entity instance
  await engine.createInstance("Recipe", {
    id: recipeId,
    tenantId: engine.getContext<string>("tenantId"),
    name,
    category,
    cuisineType,
    description,
    tags,
    isActive: true,
    hasVersion: true,
    tagCount: tags ? tags.split(",").length : 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    success: true,
    emittedEvents: [],
    recipeId,
    name: instance?.name as string | undefined,
    isActive: true,
  } as RecipeCommandResult;
}

// ============ Menu Commands ============

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
export async function updateMenu(
  engine: RuntimeEngine,
  menuId: string,
  newName: string,
  newDescription: string,
  newCategory: string,
  newBasePrice: number,
  newPricePerPerson: number,
  newMinGuests: number,
  newMaxGuests: number,
  newIsActive: boolean,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "update",
    {
      newName,
      newDescription,
      newCategory,
      newBasePrice,
      newPricePerPerson,
      newMinGuests,
      newMaxGuests,
      newIsActive,
    },
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: instance?.isActive as boolean | undefined,
  };
}

/**
 * Activate a menu
 */
export async function activateMenu(
  engine: RuntimeEngine,
  menuId: string,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "activate",
    {},
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}

/**
 * Deactivate a menu
 */
export async function deactivateMenu(
  engine: RuntimeEngine,
  menuId: string,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    {},
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: false,
  };
}

/**
 * Create a menu
 */
export async function createMenu(
  engine: RuntimeEngine,
  menuId: string,
  name: string,
  description: string,
  category: string,
  basePrice: number,
  pricePerPerson: number,
  minGuests: number,
  maxGuests: number
): Promise<MenuCommandResult> {
  // Create the Menu entity instance
  await engine.createInstance("Menu", {
    id: menuId,
    tenantId: engine.getContext<string>("tenantId"),
    name,
    description,
    category,
    isActive: true,
    basePrice,
    pricePerPerson,
    minGuests,
    maxGuests,
    hasPricePerPerson: pricePerPerson > 0,
    hasGuestConstraints: minGuests > 0 || maxGuests > 0,
    guestRangeValid: maxGuests >= minGuests,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const instance = await engine.getInstance("Menu", menuId);
  return {
    success: true,
    emittedEvents: [],
    menuId,
    name: instance?.name as string | undefined,
    isActive: true,
  } as MenuCommandResult;
}

// ============ Event Handling ============

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
    // Recipe events
    onRecipeCreated?: (event: EmittedEvent) => Promise<void>;
    onRecipeUpdated?: (event: EmittedEvent) => Promise<void>;
    onRecipeDeactivated?: (event: EmittedEvent) => Promise<void>;
    onRecipeActivated?: (event: EmittedEvent) => Promise<void>;
    onRecipeVersionCreated?: (event: EmittedEvent) => Promise<void>;
    onRecipeVersionRestored?: (event: EmittedEvent) => Promise<void>;
    onIngredientAllergensUpdated?: (event: EmittedEvent) => Promise<void>;
    onRecipeIngredientUpdated?: (event: EmittedEvent) => Promise<void>;
    // Dish events
    onDishCreated?: (event: EmittedEvent) => Promise<void>;
    onDishPricingUpdated?: (event: EmittedEvent) => Promise<void>;
    onDishLeadTimeUpdated?: (event: EmittedEvent) => Promise<void>;
    // Menu events
    onMenuCreated?: (event: EmittedEvent) => Promise<void>;
    onMenuUpdated?: (event: EmittedEvent) => Promise<void>;
    onMenuDeactivated?: (event: EmittedEvent) => Promise<void>;
    onMenuActivated?: (event: EmittedEvent) => Promise<void>;
    onMenuDishAdded?: (event: EmittedEvent) => Promise<void>;
    onMenuDishRemoved?: (event: EmittedEvent) => Promise<void>;
    onMenuDishUpdated?: (event: EmittedEvent) => Promise<void>;
    onMenuDishesReordered?: (event: EmittedEvent) => Promise<void>;
    // Override events
    onConstraintOverridden?: (event: EmittedEvent) => Promise<void>;
    onConstraintSatisfiedAfterOverride?: (event: EmittedEvent) => Promise<void>;
  }
) {
  const unsubscribe = engine.onEvent(async (event: EmittedEvent) => {
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
      // Menu events
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
export function getKitchenOpsEventLog(engine: RuntimeEngine): EmittedEvent[] {
  return engine.getEventLog();
}

// ============ Instance Management ============

/**
 * Create a prep task instance
 */
export async function createPrepTaskInstance(
  engine: RuntimeEngine,
  data: {
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
  }
) {
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
export async function createStationInstance(
  engine: RuntimeEngine,
  data: {
    id: string;
    tenantId: string;
    locationId: string;
    name: string;
    stationType?: string;
    capacitySimultaneousTasks?: number;
    equipmentList?: string;
  }
) {
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
export async function createInventoryItemInstance(
  engine: RuntimeEngine,
  data: {
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
  }
) {
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

// ============ Override Types and Utilities ============

import type { ConstraintOutcome, OverrideRequest } from "@repo/manifest";

// Re-export override reason codes from @repo/manifest for single source of truth
export { OVERRIDE_REASON_CODES, type OverrideReasonCode } from "@repo/manifest";

/**
 * Severity level for constraint outcomes
 */
export type ConstraintSeverity = "ok" | "warn" | "block";

/**
 * Check if a constraint outcome requires user attention
 */
export function isConstraintActionable(outcome: ConstraintOutcome): boolean {
  return (
    !outcome.passed &&
    (outcome.severity === "warn" || outcome.severity === "block")
  );
}

/**
 * Check if any constraints in the array require attention
 */
export function hasActionableConstraints(
  outcomes: ConstraintOutcome[] | undefined
): boolean {
  if (!outcomes || outcomes.length === 0) return false;
  return outcomes.some(isConstraintActionable);
}

/**
 * Get only the actionable (failed) constraints
 */
export function getActionableConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) return [];
  return outcomes.filter(isConstraintActionable);
}

/**
 * Get constraints that are blocking (failed with BLOCK severity)
 */
export function getBlockingConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) return [];
  return outcomes.filter((o) => !o.passed && o.severity === "block");
}

/**
 * Get constraints that are warnings (failed with WARN severity)
 */
export function getWarningConstraints(
  outcomes: ConstraintOutcome[] | undefined
): ConstraintOutcome[] {
  if (!outcomes) return [];
  return outcomes.filter((o) => !o.passed && o.severity === "warn");
}

/**
 * Check if command can proceed (no blocking constraints or all blocking constraints are overridden)
 */
export function canProceedWithConstraints(
  outcomes: ConstraintOutcome[] | undefined
): boolean {
  if (!outcomes || outcomes.length === 0) return true;
  const blocking = getBlockingConstraints(outcomes);
  if (blocking.length === 0) return true;
  // Check if all blocking constraints are overridden
  return blocking.every((o) => o.overridden);
}

/**
 * Create an override request for a constraint
 */
export function createOverrideRequest(
  constraintCode: string,
  reason: string,
  authorizedBy: string
): OverrideRequest {
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
export function formatConstraintOutcome(outcome: ConstraintOutcome): {
  title: string;
  description: string;
  severity: "default" | "warning" | "destructive";
  details: Record<string, string>;
} {
  const severityLabels: Record<ConstraintSeverity, string> = {
    ok: "Info",
    warn: "Warning",
    block: "Blocked",
  };

  const severityStyles: Record<
    ConstraintSeverity,
    "default" | "warning" | "destructive"
  > = {
    ok: "default",
    warn: "warning",
    block: "destructive",
  };

  const title =
    outcome.message ||
    `${severityLabels[outcome.severity as ConstraintSeverity]}: ${outcome.constraintName}`;
  const description = outcome.formatted;

  const details: Record<string, string> = {};
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
    severity: severityStyles[outcome.severity as ConstraintSeverity],
    details,
  };
}

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
    resolved?: Array<{ expression: string; value: unknown }>;
  };
  policyDenial?: {
    policyName: string;
    message?: string;
    resolved?: Array<{ expression: string; value: unknown }>;
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
export function formatGuardFailure(
  failure: NonNullable<CommandResultWithConstraints["guardFailure"]>
): {
  title: string;
  description: string;
  values: Array<{ expression: string; value: string }>;
} {
  return {
    title: `Guard Failed (${failure.index})`,
    description: failure.formatted,
    values:
      failure.resolved?.map((r) => ({
        expression: r.expression,
        value: String(r.value),
      })) || [],
  };
}

/**
 * Parse and format policy denial for UI display
 */
export function formatPolicyDenial(
  denial: NonNullable<CommandResultWithConstraints["policyDenial"]>
): {
  title: string;
  description: string;
  values: Array<{ expression: string; value: string }>;
} {
  return {
    title: `Access Denied: ${denial.policyName}`,
    description:
      denial.message || "You don't have permission to perform this action",
    values:
      denial.resolved?.map((r) => ({
        expression: r.expression,
        value: String(r.value),
      })) || [],
  };
}

// ============ Prisma Store Exports ============

export {
  createPrismaStoreProvider,
  loadMenuDishFromPrisma,
  loadMenuFromPrisma,
  loadPrepTaskFromPrisma,
  MenuDishPrismaStore,
  MenuPrismaStore,
  PrepTaskPrismaStore,
  syncMenuDishToPrisma,
  syncMenuToPrisma,
  syncPrepTaskToPrisma,
} from "./prisma-store.js";
