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

// Cached compiled IR for each manifest
let cachedPrepTaskIR: IR | null = null;
let cachedStationIR: IR | null = null;
let cachedInventoryIR: IR | null = null;

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
 * Kitchen Ops Runtime Context
 */
export interface KitchenOpsContext extends RuntimeContext {
  tenantId: string;
  userId: string;
  userRole?: string;
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
 * Create a kitchen operations runtime for prep tasks
 */
export async function createPrepTaskRuntime(context: KitchenOpsContext) {
  const ir = await loadPrepTaskManifestIR();
  const engine = new RuntimeEngine(ir, context);
  return engine;
}

/**
 * Create a kitchen operations runtime for stations
 */
export async function createStationRuntime(context: KitchenOpsContext) {
  const ir = await loadStationManifestIR();
  const engine = new RuntimeEngine(ir, context);
  return engine;
}

/**
 * Create a kitchen operations runtime for inventory
 */
export async function createInventoryRuntime(context: KitchenOpsContext) {
  const ir = await loadInventoryManifestIR();
  const engine = new RuntimeEngine(ir, context);
  return engine;
}

/**
 * Create a combined kitchen operations runtime
 */
export async function createKitchenOpsRuntime(context: KitchenOpsContext) {
  const prepTaskIR = await loadPrepTaskManifestIR();
  const stationIR = await loadStationManifestIR();
  const inventoryIR = await loadInventoryManifestIR();

  // Combine IRs - in a real implementation, you'd merge modules
  const combinedIR: IR = {
    version: "1.0",
    provenance: prepTaskIR.provenance,
    modules: [
      ...(prepTaskIR.modules || []),
      ...(stationIR.modules || []),
      ...(inventoryIR.modules || []),
    ],
    entities: [
      ...prepTaskIR.entities,
      ...stationIR.entities,
      ...inventoryIR.entities,
    ],
    stores: [...prepTaskIR.stores, ...stationIR.stores, ...inventoryIR.stores],
    events: [...prepTaskIR.events, ...stationIR.events, ...inventoryIR.events],
    commands: [
      ...prepTaskIR.commands,
      ...stationIR.commands,
      ...inventoryIR.commands,
    ],
    policies: [
      ...prepTaskIR.policies,
      ...stationIR.policies,
      ...inventoryIR.policies,
    ],
  };

  const engine = new RuntimeEngine(combinedIR, context);
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
} as const;

export type OverrideReasonCode = keyof typeof OVERRIDE_REASON_CODES;

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
