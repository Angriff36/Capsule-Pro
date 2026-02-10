import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

import {
  fetchTask,
  processStatusChange,
  syncStatusUpdateResults,
  updateTaskFields,
  validatePriority,
} from "../shared-task-helpers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Consume inventory items when a prep task is completed
 *
 * This function:
 * 1. Fetches recipe ingredients for the prep task
 * 2. Matches ingredients to inventory items by name
 * 3. Calculates scaled quantities based on task batch size
 * 4. Creates inventory transactions for each ingredient consumed
 * 5. Updates inventory quantities
 * 6. Emits outbox events for real-time updates
 */
async function consumeInventoryForPrepTask(
  tenantId: string,
  taskId: string,
  recipeVersionId: string,
  taskQuantityTotal: number,
  employeeId: string
): Promise<{
  success: boolean;
  consumedIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    inventoryItemId: string | null;
    quantityConsumed: number;
    success: boolean;
    error?: string;
  }>;
  warnings: string[];
}> {
  const consumedIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    inventoryItemId: string | null;
    quantityConsumed: number;
    success: boolean;
    error?: string;
  }> = [];
  const warnings: string[] = [];

  try {
    // Fetch recipe version to get yield quantity for scaling
    const recipeVersion = await database.$queryRaw<
      Array<{ yield_quantity: number; yield_unit_id: number }>
    >(
      Prisma.sql`
        SELECT yield_quantity, yield_unit_id
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId} AND id = ${recipeVersionId}
      `
    );

    if (!recipeVersion[0]) {
      warnings.push(`Recipe version ${recipeVersionId} not found`);
      return { success: false, consumedIngredients, warnings };
    }

    const recipeYieldQuantity = Number(recipeVersion[0].yield_quantity);

    // Calculate scale factor: how many times the recipe is being made
    const scaleFactor =
      recipeYieldQuantity > 0 ? taskQuantityTotal / recipeYieldQuantity : 1;

    // Fetch all recipe ingredients with their details
    const recipeIngredients = await database.$queryRaw<
      Array<{
        id: string;
        ingredient_id: string;
        ingredient_name: string;
        quantity: number;
        unit_id: number;
        waste_factor: number;
      }>
    >(
      Prisma.sql`
        SELECT
          ri.id,
          ri.ingredient_id,
          i.name as ingredient_name,
          ri.quantity,
          ri.unit_id,
          COALESCE(ri.waste_factor, 1.0) as waste_factor
        FROM tenant_kitchen.recipe_ingredients ri
        JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
        WHERE ri.tenant_id = ${tenantId}
          AND ri.recipe_version_id = ${recipeVersionId}
          AND ri.deleted_at IS NULL
        ORDER BY ri.sort_order
      `
    );

    // Get all inventory items for matching
    const inventoryItems = await database.inventoryItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        quantityOnHand: true,
        unitCost: true,
      },
    });

    // Create a map for efficient lookup (case-insensitive name matching)
    const inventoryItemsMap = new Map(
      inventoryItems.map((item) => [item.name.toLowerCase().trim(), item])
    );

    // Process each ingredient
    for (const ingredient of recipeIngredients) {
      const ingredientQuantity = Number(ingredient.quantity);
      const wasteFactor = Number(ingredient.waste_factor);

      // Calculate actual quantity to consume (base quantity * waste factor * scale factor)
      const quantityToConsume = ingredientQuantity * wasteFactor * scaleFactor;

      // Try to find matching inventory item by name
      const inventoryItem = inventoryItemsMap.get(
        ingredient.ingredient_name.toLowerCase().trim()
      );

      if (!inventoryItem) {
        warnings.push(
          `No inventory item found for ingredient: ${ingredient.ingredient_name}`
        );
        consumedIngredients.push({
          ingredientId: ingredient.ingredient_id,
          ingredientName: ingredient.ingredient_name,
          inventoryItemId: null,
          quantityConsumed: quantityToConsume,
          success: false,
          error: "No matching inventory item",
        });
        continue;
      }

      // Check if we have enough inventory
      const currentQuantityOnHand = Number(inventoryItem.quantityOnHand);
      if (currentQuantityOnHand < quantityToConsume) {
        warnings.push(
          `Insufficient inventory for ${ingredient.ingredient_name}: ` +
            `have ${currentQuantityOnHand}, need ${quantityToConsume}`
        );
      }

      // Create inventory transaction and update quantity
      try {
        // Use transaction to ensure both operations succeed or fail together
        await database.$transaction([
          // Create inventory transaction
          database.inventoryTransaction.create({
            data: {
              tenantId,
              itemId: inventoryItem.id,
              transactionType: "consumption",
              quantity: -quantityToConsume,
              unit_cost: inventoryItem.unitCost,
              reason: `Prep task completion: ${taskId}`,
              referenceType: "PrepTask",
              referenceId: taskId,
              employee_id: employeeId,
            },
          }),
          // Update inventory quantity on hand
          database.inventoryItem.update({
            where: {
              tenantId_id: { tenantId, id: inventoryItem.id },
            },
            data: {
              quantityOnHand: {
                decrement: quantityToConsume,
              },
            },
          }),
        ]);

        // Create outbox event for real-time update
        await database.outboxEvent.create({
          data: {
            tenantId,
            aggregateType: "InventoryItem",
            aggregateId: inventoryItem.id,
            eventType: "inventory.item.consumed",
            payload: {
              inventoryItemId: inventoryItem.id,
              quantity: quantityToConsume,
              referenceType: "PrepTask",
              referenceId: taskId,
              ingredientName: ingredient.ingredient_name,
            } as Prisma.InputJsonValue,
            status: "pending" as const,
          },
        });

        consumedIngredients.push({
          ingredientId: ingredient.ingredient_id,
          ingredientName: ingredient.ingredient_name,
          inventoryItemId: inventoryItem.id,
          quantityConsumed: quantityToConsume,
          success: true,
        });
      } catch (transactionError) {
        const errorMessage =
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error";
        warnings.push(
          `Failed to consume inventory for ${ingredient.ingredient_name}: ${errorMessage}`
        );
        consumedIngredients.push({
          ingredientId: ingredient.ingredient_id,
          ingredientName: ingredient.ingredient_name,
          inventoryItemId: inventoryItem.id,
          quantityConsumed: quantityToConsume,
          success: false,
          error: errorMessage,
        });
      }
    }

    return {
      success: true,
      consumedIngredients,
      warnings,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    warnings.push(`Failed to consume inventory: ${errorMessage}`);
    return { success: false, consumedIngredients, warnings };
  }
}

/**
 * Update a prep task using Manifest runtime
 *
 * PATCH /api/kitchen/tasks/:id
 *
 * This endpoint uses the Manifest runtime for:
 * - Status changes (complete, cancel, release) with constraint checking
 * - Event emission for status changes
 *
 * For non-status updates (priority, summary, tags, dueDate), direct Prisma
 * updates are used since Manifest doesn't have generic update commands.
 */
export async function PATCH(request: Request, context: RouteContext) {
  // Step 1: Authenticate
  const { orgId, userId: clerkId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();

  // Step 2: Get current user for progress tracking
  const { employeeId, userRole } = await getEmployeeInfo(tenantId, clerkId);

  // Step 3: Verify task exists
  const existingTaskResult = await fetchTask(tenantId, id);
  if (!(existingTaskResult.success && existingTaskResult.task)) {
    return NextResponse.json(
      { message: existingTaskResult.error?.message ?? "Unknown error" },
      { status: existingTaskResult.error?.status ?? 500 }
    );
  }

  const existingTask = existingTaskResult.task;

  // Step 4: Validate priority if provided
  if (body.priority !== undefined) {
    const priorityValidation = validatePriority(body.priority);
    if (!priorityValidation.valid) {
      return NextResponse.json(
        { message: priorityValidation.error },
        { status: 400 }
      );
    }
  }

  // Step 5: Handle status changes via Manifest commands
  if (body.status) {
    return handleStatusUpdate(
      tenantId,
      id,
      existingTask,
      body.status,
      employeeId,
      userRole,
      body.notes
    );
  }

  // Step 6: Handle non-status updates via direct Prisma
  return handleFieldUpdates(tenantId, id, existingTask, employeeId, body);
}

/**
 * Get employee information from Clerk ID
 */
async function getEmployeeInfo(tenantId: string, clerkId: string | null) {
  let employeeId: string | undefined;
  let userRole: string | undefined;

  if (clerkId) {
    const user = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });
    employeeId = user?.id;
    userRole = user?.role;
  }

  return { employeeId, userRole };
}

/**
 * Handle status update via Manifest commands
 */
async function handleStatusUpdate(
  tenantId: string,
  taskId: string,
  existingTask: Prisma.PrepTaskGetPayload<Record<string, never>>,
  newStatus: string,
  employeeId: string | undefined,
  userRole: string | undefined,
  notes?: string
) {
  const statusResult = await processStatusChange(
    tenantId,
    taskId,
    existingTask,
    newStatus,
    employeeId,
    userRole
  );

  if (!statusResult.success) {
    return NextResponse.json(
      {
        message: statusResult.error.message,
      },
      { status: statusResult.error.status }
    );
  }

  const { result } = statusResult;

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    return NextResponse.json(
      {
        message: "Cannot update task due to constraint violations",
        constraintOutcomes: blockingConstraints,
      },
      { status: 400 }
    );
  }

  // Sync status update to database
  await syncStatusUpdateResults(
    tenantId,
    taskId,
    existingTask,
    newStatus,
    employeeId,
    result,
    notes
  );

  // Consume inventory for completed prep tasks
  const inventoryConsumptionResult =
    await handleInventoryConsumptionForCompletedTask(
      tenantId,
      taskId,
      existingTask,
      newStatus,
      employeeId
    );

  return NextResponse.json({
    task: {
      ...existingTask,
      status: newStatus,
    },
    constraintOutcomes: result.constraintOutcomes,
    emittedEvents: result.emittedEvents,
    inventoryConsumption: inventoryConsumptionResult,
  });
}

/**
 * Handle inventory consumption for completed tasks
 */
async function handleInventoryConsumptionForCompletedTask(
  tenantId: string,
  taskId: string,
  existingTask: Prisma.PrepTaskGetPayload<Record<string, never>>,
  newStatus: string,
  employeeId: string | undefined
): Promise<Awaited<ReturnType<typeof consumeInventoryForPrepTask>> | null> {
  if (
    (newStatus !== "done" && newStatus !== "completed") ||
    !existingTask.recipeVersionId ||
    !employeeId
  ) {
    return null;
  }

  const result = await consumeInventoryForPrepTask(
    tenantId,
    taskId,
    existingTask.recipeVersionId,
    Number(existingTask.quantityTotal),
    employeeId
  );

  // Log warnings for inventory consumption issues
  if (result.warnings.length > 0) {
    console.warn(
      `Inventory consumption warnings for task ${taskId}:`,
      result.warnings
    );
  }

  return result;
}

/**
 * Handle non-status field updates
 */
async function handleFieldUpdates(
  tenantId: string,
  taskId: string,
  existingTask: Prisma.PrepTaskGetPayload<Record<string, never>>,
  employeeId: string | undefined,
  body: {
    priority?: number;
    notes?: string | null;
    estimatedMinutes?: number | null;
    actualMinutes?: number | null;
    status?: string;
  }
) {
  const updatedTask = await updateTaskFields(tenantId, taskId, {
    priority: body.priority,
    notes: body.notes,
    estimatedMinutes: body.estimatedMinutes,
    actualMinutes: body.actualMinutes,
  });

  // If status changed, create progress entry
  if (body.status && body.status !== existingTask.status && employeeId) {
    await database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId: updatedTask.id,
        employeeId,
        progressType: "status_change",
        oldStatus: existingTask.status,
        newStatus: body.status,
        notes: body.notes ?? undefined,
      },
    });
  }

  // Create outbox event
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: updatedTask.id,
      eventType: "kitchen.task.updated",
      payload: {
        taskId: updatedTask.id,
        status: updatedTask.status,
        priority: updatedTask.priority,
      },
      status: "pending" as const,
    },
  });

  return NextResponse.json({ task: updatedTask });
}
