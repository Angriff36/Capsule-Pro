"use server";

import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  activatePrepList,
  cancelPrepList,
  createPrepList,
  createPrepListRuntime,
  deactivatePrepList,
  finalizePrepList,
  type KitchenOpsContext,
  markPrepListCompleted,
  markPrepListItemCompleted,
  markPrepListItemUncompleted,
  updatePrepList,
  updatePrepListBatchMultiplier,
  updatePrepListItemNotes,
  updatePrepListItemQuantity,
  updatePrepListItemStation,
} from "@repo/kitchen-ops";
import type { ConstraintOutcome, OverrideRequest } from "@repo/manifest";
import { revalidatePath } from "next/cache";
import { invariant } from "../../../lib/invariant";
import { requireTenantId } from "../../../lib/tenant";

// ============ Helper Types ============

export interface PrepListItemInput {
  stationId: string;
  stationName: string;
  ingredientId: string;
  ingredientName: string;
  category: string | null;
  baseQuantity: number;
  baseUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  isOptional: boolean;
  preparationNotes: string | null;
  allergens: string[];
  dietarySubstitutions: string[];
  dishId: string | null;
  dishName: string | null;
  recipeVersionId: string | null;
}

export interface CreatePrepListInput {
  eventId: string;
  name: string;
  batchMultiplier: number;
  dietaryRestrictions: string[];
  totalItems: number;
  totalEstimatedTime: number;
  notes: string | null;
  items: PrepListItemInput[];
}

export interface UpdatePrepListInput {
  prepListId: string;
  name: string;
  dietaryRestrictions: string[];
  notes: string;
}

export interface UpdateBatchMultiplierInput {
  prepListId: string;
  batchMultiplier: number;
}

export interface UpdateItemQuantityInput {
  itemId: string;
  baseQuantity: number;
  scaledQuantity: number;
  baseUnit: string;
  scaledUnit: string;
}

export interface UpdateItemStationInput {
  itemId: string;
  stationId: string;
  stationName: string;
}

export interface UpdateItemNotesInput {
  itemId: string;
  preparationNotes: string;
  dietarySubstitutions: string;
}

// ============ Result Types ============

export interface PrepListManifestActionResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  redirectUrl?: string;
  error?: string;
  prepListId?: string;
}

// ============ Helper Functions ============

/**
 * Creates a Manifest runtime context with Prisma store provider
 * for persistent entity storage and constraint checking.
 */
async function createRuntimeContext(): Promise<KitchenOpsContext> {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const tenantId = await requireTenantId();

  // Get current user from database
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: (await auth()).userId ?? "" }],
    },
  });

  invariant(currentUser, "User not found in database");

  // Dynamically import PrismaStore to avoid circular dependencies
  const { createPrismaStoreProvider } = await import(
    "@repo/kitchen-ops/prisma-store"
  );

  return {
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };
}

/**
 * Create override requests from user-provided reason and details
 */
function createOverrideRequests(
  constraints: ConstraintOutcome[],
  reason: string,
  userId: string
): OverrideRequest[] {
  return constraints.map((c) => ({
    constraintCode: c.code,
    reason,
    authorizedBy: userId,
    timestamp: Date.now(),
  }));
}

/**
 * Enqueue outbox event for downstream consumers
 */
async function enqueueOutboxEvent(
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
) {
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
    },
  });
}

// ============ Public Actions ============

/**
 * Create a new prep list using Manifest runtime for constraint checking.
 *
 * This action:
 * 1. Validates input data
 * 2. Creates PrepList and PrepListItem entities in Manifest for constraint checking
 * 3. Returns constraint outcomes (blocking or warning)
 * 4. If no blocking constraints (or they're overridden), persists to Prisma
 * 5. Returns redirect URL for success navigation
 *
 * @param input - Prep list creation data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes and redirect URL
 */
export const createPrepListManifest = async (
  input: CreatePrepListInput,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  // Validate required fields
  if (!input.eventId) {
    return { success: false, error: "Event ID is required." };
  }

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "Prep list name is required." };
  }

  // Verify event exists
  const [event] = await database.$queryRaw<
    Array<{ id: string; title: string; event_date: Date }>
  >(
    Prisma.sql`
      SELECT id, title, event_date
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}
        AND id = ${input.eventId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!event) {
    return { success: false, error: "Event not found." };
  }

  const prepListId = randomUUID();
  const dietaryRestrictions = input.dietaryRestrictions?.join(",") ?? "";
  const totalEstimatedTimeMinutes = Math.round(input.totalEstimatedTime * 60);

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Create PrepList entity in Manifest for constraint checking
  const createResult = await createPrepList(
    runtime,
    prepListId,
    input.eventId,
    name,
    input.batchMultiplier ?? 1,
    dietaryRestrictions,
    input.totalItems ?? 0,
    totalEstimatedTimeMinutes,
    input.notes ?? "",
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = createResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: createResult.constraintOutcomes,
    };
  }

  // Log warning constraints for observability
  const warningConstraints = createResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "warn"
  );
  if (warningConstraints && warningConstraints.length > 0) {
    console.warn(
      "[Manifest] PrepList creation warnings:",
      warningConstraints.map((c) => `${c.code}: ${c.formatted}`)
    );
  }

  // Persist to Prisma database
  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.prep_lists (
        tenant_id,
        event_id,
        id,
        name,
        batch_multiplier,
        dietary_restrictions,
        status,
        total_items,
        total_estimated_time,
        notes,
        generated_at
      )
      VALUES (
        ${tenantId},
        ${input.eventId},
        ${prepListId},
        ${name},
        ${input.batchMultiplier ?? 1},
        ${input.dietaryRestrictions?.length > 0 ? input.dietaryRestrictions : null},
        'draft',
        ${input.totalItems ?? 0},
        ${totalEstimatedTimeMinutes},
        ${input.notes ?? null},
        NOW()
      )
    `
  );

  // Create prep list items
  if (input.items && Array.isArray(input.items)) {
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const itemId = randomUUID();

      await database.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.prep_list_items (
            tenant_id,
            prep_list_id,
            id,
            station_id,
            station_name,
            ingredient_id,
            ingredient_name,
            category,
            base_quantity,
            base_unit,
            scaled_quantity,
            scaled_unit,
            is_optional,
            preparation_notes,
            allergens,
            dietary_substitutions,
            dish_id,
            dish_name,
            recipe_version_id,
            sort_order
          )
          VALUES (
            ${tenantId},
            ${prepListId},
            ${itemId},
            ${item.stationId},
            ${item.stationName},
            ${item.ingredientId},
            ${item.ingredientName},
            ${item.category ?? null},
            ${item.baseQuantity},
            ${item.baseUnit},
            ${item.scaledQuantity},
            ${item.scaledUnit},
            ${item.isOptional},
            ${item.preparationNotes ?? null},
            ${item.allergens ?? []},
            ${item.dietarySubstitutions ?? []},
            ${item.dishId ?? null},
            ${item.dishName ?? null},
            ${item.recipeVersionId ?? null},
            ${i}
          )
        `
      );
    }
  }

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.created",
    {
      prepListId,
      eventId: input.eventId,
      name,
      totalItems: input.totalItems ?? 0,
      batchMultiplier: input.batchMultiplier ?? 1,
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: createResult.constraintOutcomes,
    redirectUrl: `/kitchen/prep-lists/${prepListId}`,
    prepListId,
  };
};

/**
 * Create a prep list with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const createPrepListWithOverride = async (
  input: CreatePrepListInput,
  reason: string,
  details: string
): Promise<PrepListManifestActionResult> => {
  const runtimeContext = await createRuntimeContext();

  // First run without overrides to get constraint outcomes
  const initialResult = await createPrepListManifest(input);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    // Re-run with override requests
    return createPrepListManifest(input, overrideRequests);
  }

  return initialResult;
};

/**
 * Update a prep list using Manifest runtime for constraint checking.
 *
 * @param input - Update data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes
 */
export const updatePrepListManifest = async (
  input: UpdatePrepListInput,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!input.prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "Prep list name is required." };
  }

  // Verify prep list exists and is in draft status
  const [existing] = await database.$queryRaw<
    Array<{ id: string; status: string; name: string }>
  >(
    Prisma.sql`
      SELECT id, status, name
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${input.prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.status !== "draft") {
    return {
      success: false,
      error: "Can only update draft prep lists.",
    };
  }

  const dietaryRestrictions = input.dietaryRestrictions?.join(",") ?? "";

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Update via Manifest (constraint checking)
  const updateResult = await updatePrepList(
    runtime,
    input.prepListId,
    name,
    dietaryRestrictions,
    input.notes ?? "",
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = updateResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: updateResult.constraintOutcomes,
    };
  }

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET
        name = ${name},
        dietary_restrictions = ${input.dietaryRestrictions?.length > 0 ? input.dietaryRestrictions : null},
        notes = ${input.notes ?? null},
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${input.prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    input.prepListId,
    "kitchen.preplist.updated",
    {
      prepListId: input.prepListId,
      oldName: existing.name,
      newName: name,
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${input.prepListId}`);

  return {
    success: true,
    constraintOutcomes: updateResult.constraintOutcomes,
    prepListId: input.prepListId,
  };
};

/**
 * Update prep list with override requests.
 */
export const updatePrepListWithOverride = async (
  input: UpdatePrepListInput,
  reason: string,
  details: string
): Promise<PrepListManifestActionResult> => {
  const runtimeContext = await createRuntimeContext();

  const initialResult = await updatePrepListManifest(input);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      runtimeContext.userId
    );

    return updatePrepListManifest(input, overrideRequests);
  }

  return initialResult;
};

/**
 * Update batch multiplier using Manifest runtime for constraint checking.
 */
export const updateBatchMultiplierManifest = async (
  input: UpdateBatchMultiplierInput,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!input.prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  if (input.batchMultiplier === null || input.batchMultiplier <= 0) {
    return { success: false, error: "Batch multiplier must be positive." };
  }

  // Verify prep list exists and is in draft status
  const [existing] = await database.$queryRaw<
    Array<{ id: string; status: string; batch_multiplier: number }>
  >(
    Prisma.sql`
      SELECT id, status, batch_multiplier
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${input.prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.status !== "draft") {
    return {
      success: false,
      error: "Can only update draft prep lists.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Update via Manifest (constraint checking)
  const updateResult = await updatePrepListBatchMultiplier(
    runtime,
    input.prepListId,
    input.batchMultiplier,
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = updateResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: updateResult.constraintOutcomes,
    };
  }

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET batch_multiplier = ${input.batchMultiplier},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${input.prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    input.prepListId,
    "kitchen.preplist.batch_multiplier_updated",
    {
      prepListId: input.prepListId,
      oldMultiplier: existing.batch_multiplier,
      newMultiplier: input.batchMultiplier,
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${input.prepListId}`);

  return {
    success: true,
    constraintOutcomes: updateResult.constraintOutcomes,
    prepListId: input.prepListId,
  };
};

/**
 * Finalize a prep list using Manifest runtime for constraint checking.
 */
export const finalizePrepListManifest = async (
  prepListId: string,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  // Verify prep list exists and is in draft status
  const [existing] = await database.$queryRaw<
    Array<{ id: string; status: string; total_items: number }>
  >(
    Prisma.sql`
      SELECT id, status, total_items
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.status !== "draft") {
    return {
      success: false,
      error: "Can only finalize draft prep lists.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Finalize via Manifest (constraint checking)
  const finalizeResult = await finalizePrepList(
    runtime,
    prepListId,
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = finalizeResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: finalizeResult.constraintOutcomes,
    };
  }

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET status = 'finalized',
          finalized_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.finalized",
    {
      prepListId,
      totalItems: existing.total_items,
      finalizedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${prepListId}`);

  return {
    success: true,
    constraintOutcomes: finalizeResult.constraintOutcomes,
    prepListId,
  };
};

/**
 * Activate a prep list.
 */
export const activatePrepListManifest = async (
  prepListId: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  // Verify prep list exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; is_active: boolean }>
  >(
    Prisma.sql`
      SELECT id, is_active
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.is_active) {
    return {
      success: false,
      error: "Prep list is already active.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Activate via Manifest
  const activateResult = await activatePrepList(runtime, prepListId);

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET is_active = true,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.activated",
    {
      prepListId,
      activatedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${prepListId}`);

  return {
    success: true,
    constraintOutcomes: activateResult.constraintOutcomes,
    prepListId,
  };
};

/**
 * Deactivate a prep list.
 */
export const deactivatePrepListManifest = async (
  prepListId: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  // Verify prep list exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; is_active: boolean }>
  >(
    Prisma.sql`
      SELECT id, is_active
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (!existing.is_active) {
    return {
      success: false,
      error: "Prep list is already inactive.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Deactivate via Manifest
  const deactivateResult = await deactivatePrepList(runtime, prepListId);

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET is_active = false,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.deactivated",
    {
      prepListId,
      deactivatedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${prepListId}`);

  return {
    success: true,
    constraintOutcomes: deactivateResult.constraintOutcomes,
    prepListId,
  };
};

/**
 * Mark a prep list as completed.
 */
export const markPrepListCompletedManifest = async (
  prepListId: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  // Verify prep list exists and is finalized
  const [existing] = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.status !== "finalized") {
    return {
      success: false,
      error: "Can only mark finalized prep lists as completed.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Mark completed via Manifest
  const completeResult = await markPrepListCompleted(runtime, prepListId);

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET status = 'completed',
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.completed",
    {
      prepListId,
      completedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${prepListId}`);

  return {
    success: true,
    constraintOutcomes: completeResult.constraintOutcomes,
    prepListId,
  };
};

/**
 * Cancel a prep list.
 */
export const cancelPrepListManifest = async (
  prepListId: string,
  reason: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!prepListId) {
    return { success: false, error: "Prep list ID is required." };
  }

  // Verify prep list exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; status: string }>
  >(
    Prisma.sql`
      SELECT id, status
      FROM tenant_kitchen.prep_lists
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list not found." };
  }

  if (existing.status === "completed") {
    return {
      success: false,
      error: "Cannot cancel completed prep lists.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Cancel via Manifest
  const cancelResult = await cancelPrepList(runtime, prepListId, reason);

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_lists
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${prepListId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepList",
    prepListId,
    "kitchen.preplist.cancelled",
    {
      prepListId,
      reason,
      cancelledAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");
  revalidatePath(`/kitchen/prep-lists/${prepListId}`);

  return {
    success: true,
    constraintOutcomes: cancelResult.constraintOutcomes,
    prepListId,
  };
};

// ============ Prep List Item Actions ============

/**
 * Update prep list item quantity using Manifest runtime for constraint checking.
 */
export const updatePrepListItemQuantityManifest = async (
  input: UpdateItemQuantityInput,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!input.itemId) {
    return { success: false, error: "Item ID is required." };
  }

  // Verify item exists
  const [existing] = await database.$queryRaw<
    Array<{
      id: string;
      base_quantity: number;
      scaled_quantity: number;
      base_unit: string;
      scaled_unit: string;
    }>
  >(
    Prisma.sql`
      SELECT id, base_quantity, scaled_quantity, base_unit, scaled_unit
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list item not found." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Update via Manifest (constraint checking)
  const updateResult = await updatePrepListItemQuantity(
    runtime,
    input.itemId,
    input.baseQuantity,
    input.scaledQuantity,
    input.baseUnit,
    input.scaledUnit,
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = updateResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: updateResult.constraintOutcomes,
    };
  }

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_list_items
      SET base_quantity = ${input.baseQuantity},
          scaled_quantity = ${input.scaledQuantity},
          base_unit = ${input.baseUnit},
          scaled_unit = ${input.scaledUnit},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepListItem",
    input.itemId,
    "kitchen.preplist.item_updated",
    {
      itemId: input.itemId,
      oldScaledQuantity: existing.scaled_quantity,
      newScaledQuantity: input.scaledQuantity,
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: updateResult.constraintOutcomes,
  };
};

/**
 * Update prep list item station using Manifest runtime for constraint checking.
 */
export const updatePrepListItemStationManifest = async (
  input: UpdateItemStationInput,
  overrideRequests?: OverrideRequest[]
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!input.itemId) {
    return { success: false, error: "Item ID is required." };
  }

  // Verify item exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; station_id: string; station_name: string }>
  >(
    Prisma.sql`
      SELECT id, station_id, station_name
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list item not found." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Update via Manifest (constraint checking)
  const updateResult = await updatePrepListItemStation(
    runtime,
    input.itemId,
    input.stationId,
    input.stationName,
    overrideRequests
  );

  // Check for blocking constraints
  const blockingConstraints = updateResult.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block" && !o.overridden
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return {
      success: false,
      constraintOutcomes: updateResult.constraintOutcomes,
    };
  }

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_list_items
      SET station_id = ${input.stationId},
          station_name = ${input.stationName},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepListItem",
    input.itemId,
    "kitchen.preplist.item_station_changed",
    {
      itemId: input.itemId,
      oldStationName: existing.station_name,
      newStationName: input.stationName,
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: updateResult.constraintOutcomes,
  };
};

/**
 * Update prep list item notes.
 */
export const updatePrepListItemNotesManifest = async (
  input: UpdateItemNotesInput
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!input.itemId) {
    return { success: false, error: "Item ID is required." };
  }

  // Verify item exists
  const [existing] = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list item not found." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Update via Manifest
  const updateResult = await updatePrepListItemNotes(
    runtime,
    input.itemId,
    input.preparationNotes,
    input.dietarySubstitutions
  );

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_list_items
      SET preparation_notes = ${input.preparationNotes},
          dietary_substitutions = ${input.dietarySubstitutions},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${input.itemId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepListItem",
    input.itemId,
    "kitchen.preplist.item_notes_updated",
    {
      itemId: input.itemId,
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: updateResult.constraintOutcomes,
  };
};

/**
 * Mark prep list item as completed.
 */
export const markPrepListItemCompletedManifest = async (
  itemId: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!itemId) {
    return { success: false, error: "Item ID is required." };
  }

  // Verify item exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; is_completed: boolean }>
  >(
    Prisma.sql`
      SELECT id, is_completed
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND id = ${itemId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list item not found." };
  }

  if (existing.is_completed) {
    return {
      success: false,
      error: "Item is already completed.",
    };
  }

  // Get current user
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: (await auth()).userId ?? "" }],
    },
  });

  if (!currentUser) {
    return { success: false, error: "User not found." };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Mark completed via Manifest
  const completeResult = await markPrepListItemCompleted(
    runtime,
    itemId,
    currentUser.id
  );

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_list_items
      SET is_completed = true,
          completed_at = NOW(),
          completed_by = ${currentUser.id},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${itemId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepListItem",
    itemId,
    "kitchen.preplist.item_completed",
    {
      itemId,
      completedBy: currentUser.id,
      completedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: completeResult.constraintOutcomes,
  };
};

/**
 * Mark prep list item as uncompleted.
 */
export const markPrepListItemUncompletedManifest = async (
  itemId: string
): Promise<PrepListManifestActionResult> => {
  const tenantId = await requireTenantId();

  if (!itemId) {
    return { success: false, error: "Item ID is required." };
  }

  // Verify item exists
  const [existing] = await database.$queryRaw<
    Array<{ id: string; is_completed: boolean }>
  >(
    Prisma.sql`
      SELECT id, is_completed
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND id = ${itemId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existing) {
    return { success: false, error: "Prep list item not found." };
  }

  if (!existing.is_completed) {
    return {
      success: false,
      error: "Item is not completed.",
    };
  }

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createPrepListRuntime(runtimeContext);

  // Mark uncompleted via Manifest
  const uncompleteResult = await markPrepListItemUncompleted(runtime, itemId);

  // Persist to Prisma
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.prep_list_items
      SET is_completed = false,
          completed_at = NULL,
          completed_by = NULL,
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${itemId}
    `
  );

  // Enqueue outbox event
  await enqueueOutboxEvent(
    tenantId,
    "PrepListItem",
    itemId,
    "kitchen.preplist.item_uncompleted",
    {
      itemId,
      uncompletedAt: Date.now(),
    }
  );

  revalidatePath("/kitchen/prep-lists");

  return {
    success: true,
    constraintOutcomes: uncompleteResult.constraintOutcomes,
  };
};

// ============ Re-export existing actions ============

// Re-export generatePrepList, savePrepListToProductionBoard, savePrepListToDatabase from original actions
import {
  generatePrepList as _generatePrepList,
  savePrepListToDatabase as _savePrepListToDatabase,
  savePrepListToProductionBoard as _savePrepListToProductionBoard,
} from "./actions";

export const generatePrepList = _generatePrepList;
export const savePrepListToDatabase = _savePrepListToDatabase;
export const savePrepListToProductionBoard = _savePrepListToProductionBoard;

// Re-export types
export type {
  IngredientItem,
  PrepListGenerationResult,
  StationPrepList,
} from "./actions";
