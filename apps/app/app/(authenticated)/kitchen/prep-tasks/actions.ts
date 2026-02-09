"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  cancelPrepTask,
  claimPrepTask,
  completePrepTask,
  createKitchenOpsRuntime,
  createPrepTaskInstance,
  type PrepTaskCommandResult,
  reassignPrepTask,
  releasePrepTask,
  startPrepTask,
} from "@repo/kitchen-ops";
import type { OverrideReasonCode, OverrideRequest } from "@repo/manifest";
import { revalidatePath } from "next/cache";
import { getTenantIdForOrg } from "../../../lib/tenant";

// ============================================================================
// Helper Functions
// ============================================================================

async function createRuntimeAndContext() {
  const { orgId, userId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get current user from database to get role
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: userId ?? "" }],
    },
  });

  const runtime = await createKitchenOpsRuntime({
    tenantId,
    userId,
    user: {
      id: userId,
      role: currentUser?.role || "kitchen_staff",
    },
  });

  return { runtime, tenantId, userId };
}

// ============================================================================
// Prep Task Commands (Manifest-backed)
// ============================================================================

/**
 * Create a new prep task using Manifest runtime
 */
export async function createPrepTask(data: {
  id: string;
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
}): Promise<PrepTaskCommandResult> {
  const { runtime, tenantId, userId } = await createRuntimeAndContext();

  await createPrepTaskInstance(runtime, {
    ...data,
    tenantId,
  });

  revalidatePath("/kitchen/prep-tasks");

  return {
    success: true,
    taskId: data.id,
    deniedBy: undefined,
    emittedEvents: [],
  };
}

/**
 * Claim a prep task using Manifest runtime
 */
export async function manifestClaimPrepTask(
  taskId: string,
  stationId?: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await claimPrepTask(
    runtime,
    taskId,
    userId,
    stationId || "",
    overrideRequests
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Start a prep task using Manifest runtime
 */
export async function manifestStartPrepTask(
  taskId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await startPrepTask(runtime, taskId, userId, overrideRequests);

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Complete a prep task using Manifest runtime
 */
export async function manifestCompletePrepTask(
  taskId: string,
  quantityCompleted: number,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await completePrepTask(
    runtime,
    taskId,
    quantityCompleted,
    userId,
    overrideRequests
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Release a prep task using Manifest runtime
 */
export async function manifestReleasePrepTask(
  taskId: string,
  reason?: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await releasePrepTask(
    runtime,
    taskId,
    userId,
    reason || "",
    overrideRequests
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Reassign a prep task using Manifest runtime
 */
export async function manifestReassignPrepTask(
  taskId: string,
  newUserId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await reassignPrepTask(
    runtime,
    taskId,
    newUserId,
    userId,
    overrideRequests
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Cancel a prep task using Manifest runtime
 */
export async function manifestCancelPrepTask(
  taskId: string,
  reason: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepTaskCommandResult> {
  const { runtime, userId } = await createRuntimeAndContext();

  const result = await cancelPrepTask(
    runtime,
    taskId,
    reason,
    userId,
    overrideRequests
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

/**
 * Create override request for a constraint
 */
export function createPrepTaskOverride(
  constraintCode: string,
  reason: OverrideReasonCode,
  details: string,
  authorizedBy: string
): OverrideRequest {
  return {
    constraintCode,
    reason: `${reason}${details ? `: ${details}` : ""}`,
    authorizedBy,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Station Commands (Manifest-backed)
// ============================================================================

export async function manifestAssignTaskToStation(
  stationId: string,
  taskId: string,
  taskName: string
) {
  const { runtime } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.assignTaskToStation(
    runtime,
    stationId,
    taskId,
    taskName
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

export async function manifestRemoveTaskFromStation(
  stationId: string,
  taskId: string
) {
  const { runtime } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.removeTaskFromStation(
    runtime,
    stationId,
    taskId
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

export async function manifestUpdateStationCapacity(
  stationId: string,
  newCapacity: number
) {
  const { runtime, userId } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.updateStationCapacity(
    runtime,
    stationId,
    newCapacity,
    userId
  );

  revalidatePath("/kitchen/prep-tasks");

  return result;
}

// ============================================================================
// Inventory Commands (Manifest-backed)
// ============================================================================

export async function manifestReserveInventory(
  itemId: string,
  quantity: number,
  eventId: string
) {
  const { runtime, userId } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.reserveInventory(
    runtime,
    itemId,
    quantity,
    eventId,
    userId
  );

  revalidatePath("/kitchen/inventory");

  return result;
}

export async function manifestConsumeInventory(
  itemId: string,
  quantity: number,
  lotId?: string
) {
  const { runtime, userId } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.consumeInventory(
    runtime,
    itemId,
    quantity,
    lotId || "",
    userId
  );

  revalidatePath("/kitchen/inventory");

  return result;
}

export async function manifestRestockInventory(
  itemId: string,
  quantity: number,
  costPerUnit: number
) {
  const { runtime, userId } = await createRuntimeAndContext();

  const kitchenOps = await import("@repo/kitchen-ops");
  const result = await kitchenOps.restockInventory(
    runtime,
    itemId,
    quantity,
    costPerUnit,
    userId
  );

  revalidatePath("/kitchen/inventory");

  return result;
}
