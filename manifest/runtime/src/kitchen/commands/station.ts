/**
 * Station Commands
 *
 * Commands for managing stations:
 * - assignTask, removeTask, updateCapacity, deactivate, activate, updateEquipment, create
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { StationCommandResult } from "../types";

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

/**
 * Create a new station via Manifest command pipeline
 */
export async function createStation(
  engine: RuntimeEngine,
  stationId: string,
  locationId: string,
  name: string,
  stationType: string,
  capacitySimultaneousTasks: number,
  equipmentList: string,
  notes: string,
  overrideRequests?: OverrideRequest[]
): Promise<StationCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      locationId,
      name,
      stationType,
      capacitySimultaneousTasks,
      equipmentList,
      notes,
    },
    {
      entityName: "Station",
      instanceId: stationId,
      overrideRequests,
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
