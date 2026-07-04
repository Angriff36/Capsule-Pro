/**
 * Prep Task Commands
 *
 * Commands for managing prep task lifecycle:
 * - claim, start, complete, release, reassign, updateQuantity, cancel, create
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { PrepTaskCommandResult } from "../types";

/**
 * Claim a prep task
 */
export async function claimPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  userId: string,
  stationId: string,
  overrideRequests?: OverrideRequest[],
  correlationId?: string,
  causationId?: string,
  idempotencyKey?: string
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "claim",
    { userId, stationId },
    {
      entityName: "PrepTask",
      instanceId: taskId,
      overrideRequests,
      ...(correlationId !== undefined && { correlationId }),
      ...(causationId !== undefined && { causationId }),
      ...(idempotencyKey !== undefined && { idempotencyKey }),
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
    // completedAt is a declared param the mutate copies onto the instance —
    // omitting it leaves the completion timestamp unset.
    { quantityCompleted, userId, completedAt: Date.now() },
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

/**
 * Create a new prep task via Manifest command pipeline
 */
export async function createPrepTask(
  engine: RuntimeEngine,
  taskId: string,
  name: string,
  eventId: string,
  prepListId: string,
  taskType: string,
  priority: number,
  quantityTotal: number,
  quantityUnitId: string,
  servingsTotal: number,
  startByDate: number,
  dueByDate: number,
  notes: string,
  ingredients: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const result = await engine.runCommand(
    "create",
    // prepListId is a declared PrepTask.create param — omitting it leaves the
    // task unlinked from its prep list.
    {
      name,
      eventId,
      prepListId,
      taskType,
      priority,
      quantityTotal,
      quantityUnitId,
      servingsTotal,
      startByDate,
      dueByDate,
      notes,
      ingredients,
    },
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
