/**
 * Instance Creation Helpers
 *
 * Thin helpers for creating kitchen-ops entity instances through the GOVERNED
 * Manifest command pipeline.
 *
 * WHY runCommand, not createInstance: these helpers dispatch each entity's
 * IR-declared `create` command via `engine.runCommand("create", …)` rather than
 * `engine.createInstance(…)`. `createInstance` writes the row directly, which
 *   (a) skips the entity's guards / constraints / policies and the IR property
 *       defaults, and
 *   (b) lets the caller persist a *computed* property as if it were stored.
 * The InventoryItem helper used to do exactly (b): it stored
 * `quantityAvailable: quantityOnHand`, but the IR declares
 * `computed quantityAvailable = self.quantityOnHand - self.quantityReserved`
 * (inventory-rules.manifest), so a computed value was both persisted AND
 * computed with the wrong formula (it ignored reserved stock). It also wrote
 * phantom fields the entity does not have (`baseUnit` / `costPerUnit` /
 * `reorderPoint`) instead of the real IR properties
 * (`unitOfMeasure` / `unitCost` / `reorder_level`).
 *
 * Routing through the command pipeline makes the runtime own defaults +
 * computed evaluation, and only the IR-declared `create` params are passed.
 * The new id is supplied as `instanceId`; `tenantId` comes from the engine's
 * command context, not a param.
 */

import type { RuntimeEngine } from "@angriff36/manifest";

/**
 * Create a prep task instance via the governed `PrepTask.create` command.
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
  return await engine.runCommand(
    "create",
    {
      // For a `create`, the new id goes in the command BODY — passing it as
      // `instanceId` in the options reports success but never persists the row.
      id: data.id,
      name: data.name,
      eventId: data.eventId,
      // Every create param is `mutate`d by the command; an omitted param
      // becomes `mutate X = undefined`, which silently drops the row persist
      // (the engine still emits the event). So pass all params, well-typed:
      // `quantityUnitId` is an IR `int` (not the helper's loose string).
      prepListId: "",
      taskType: data.taskType ?? "prep",
      priority: data.priority ?? 5,
      quantityTotal: data.quantityTotal ?? 0,
      quantityUnitId:
        data.quantityUnitId == null ? 0 : Number(data.quantityUnitId) || 0,
      servingsTotal: data.servingsTotal ?? 0,
      startByDate: data.startByDate ?? 0,
      dueByDate: data.dueByDate ?? 0,
      notes: "",
    },
    { entityName: "PrepTask" }
  );
}

/**
 * Create a station instance via the governed `Station.create` command.
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
  return await engine.runCommand(
    "create",
    {
      id: data.id,
      locationId: data.locationId,
      name: data.name,
      stationType: data.stationType ?? "prep-station",
      capacitySimultaneousTasks: data.capacitySimultaneousTasks ?? 1,
      // single-string helper input → the IR's `array<string>` create param.
      equipmentList: data.equipmentList ? [data.equipmentList] : [],
      // `notes` is mutated by the command; omit it and the persist drops.
      notes: "",
    },
    { entityName: "Station" }
  );
}

/**
 * Create an inventory item instance via the governed `InventoryItem.create`
 * command. `quantityAvailable` is intentionally NOT passed — it is an IR
 * computed property (`quantityOnHand - quantityReserved`) evaluated by the
 * runtime, never stored.
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
  return await engine.runCommand(
    "create",
    {
      id: data.id,
      item_number: data.id,
      name: data.name,
      category: data.category ?? "",
      description: "",
      unitOfMeasure: data.baseUnit ?? "each",
      unitCost: data.costPerUnit ?? 0,
      quantityOnHand: data.quantityOnHand ?? 0,
      parLevel: data.parLevel ?? 0,
      reorder_level: 0,
      supplierId: "",
      tags: [],
      fsa_status: "unknown",
      fsa_temp_logged: false,
      fsa_allergen_info: false,
      fsa_traceable: false,
    },
    { entityName: "InventoryItem" }
  );
}
