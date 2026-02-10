import { auth } from "@repo/auth/server";
import { Prisma, database } from "@repo/database";
import {
  cancelPrepTask,
  completePrepTask,
  createPrepTaskRuntime,
  type KitchenOpsContext,
  type PrepTaskCommandResult,
  releasePrepTask,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
  const { orgId, userId: clerkId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();

  // Get current user for progress tracking
  let employeeId: string | undefined;
  if (clerkId) {
    const user = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });
    employeeId = user?.id;
  }

  // Verify task exists
  const existingTask = await database.prepTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  // Validate priority if provided
  if (
    body.priority !== undefined &&
    (typeof body.priority !== "number" ||
      body.priority < 1 ||
      body.priority > 10)
  ) {
    return NextResponse.json(
      { message: "Priority must be an integer between 1 and 10" },
      { status: 400 }
    );
  }

  // Handle status changes via Manifest commands
  if (body.status) {
    // Create Prisma store provider for Manifest runtime
    const { createPrismaStoreProvider } = await import(
      "@repo/manifest-adapters/prisma-store"
    );

    const runtimeContext: KitchenOpsContext = {
      tenantId,
      userId: employeeId || "",
      userRole: undefined, // TODO: get user role from auth
      storeProvider: createPrismaStoreProvider(database, tenantId),
    };

    try {
      const runtime = await createPrepTaskRuntime(runtimeContext);

      // Load the task entity into Manifest
      await runtime.createInstance("PrepTask", {
        id: existingTask.id,
        tenantId: existingTask.tenantId,
        eventId: existingTask.eventId,
        name: existingTask.name,
        taskType: existingTask.taskType,
        status: mapPrismaStatusToManifest(existingTask.status),
        priority: existingTask.priority,
        quantityTotal: Number(existingTask.quantityTotal),
        quantityUnitId: existingTask.quantityUnitId ?? "",
        quantityCompleted: Number(existingTask.quantityCompleted),
        servingsTotal: existingTask.servingsTotal ?? 0,
        startByDate: existingTask.startByDate
          ? existingTask.startByDate.getTime()
          : 0,
        dueByDate: existingTask.dueByDate
          ? existingTask.dueByDate.getTime()
          : 0,
        locationId: existingTask.locationId,
        dishId: existingTask.dishId ?? "",
        recipeVersionId: existingTask.recipeVersionId ?? "",
        methodId: existingTask.methodId ?? "",
        containerId: existingTask.containerId ?? "",
        estimatedMinutes: existingTask.estimatedMinutes ?? 0,
        actualMinutes: existingTask.actualMinutes ?? 0,
        notes: existingTask.notes ?? "",
        stationId: "",
        claimedBy: "",
        claimedAt: 0,
        createdAt: existingTask.createdAt.getTime(),
        updatedAt: existingTask.updatedAt.getTime(),
      });

      let result: PrepTaskCommandResult | undefined;
      const newStatus = body.status;

      // Route status change to appropriate Manifest command
      if (newStatus === "done" || newStatus === "completed") {
        // Complete task
        result = await completePrepTask(
          runtime,
          id,
          Number(existingTask.quantityTotal),
          employeeId || ""
        );
      } else if (newStatus === "canceled") {
        // Cancel task
        result = await cancelPrepTask(
          runtime,
          id,
          body.reason || "Canceled via API",
          employeeId || ""
        );
      } else if (
        newStatus === "pending" &&
        existingTask.status === "in_progress"
      ) {
        // Release task (change from in_progress back to pending)
        result = await releasePrepTask(
          runtime,
          id,
          employeeId || "",
          body.reason || "Released via API"
        );
      }

      // Check for blocking constraints
      if (result) {
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

        // Sync status update to Prisma
        await database.prepTask.update({
          where: { tenantId_id: { tenantId, id } },
          data: {
            status:
              newStatus === "done"
                ? "done"
                : mapManifestStatusToPrisma(newStatus),
          },
        });

        // Create progress entry for status change
        if (employeeId && newStatus !== existingTask.status) {
          await database.kitchenTaskProgress.create({
            data: {
              tenantId,
              taskId: id,
              employeeId,
              progressType: "status_change",
              oldStatus: existingTask.status,
              newStatus,
              notes: body.notes,
            },
          });
        }

        // Create outbox event for task status change
        await database.outboxEvent.create({
          data: {
            tenantId,
            aggregateType: "KitchenTask",
            aggregateId: id,
            eventType: `kitchen.task.${
              newStatus === "done" ? "completed" : newStatus
            }`,
            payload: {
              taskId: id,
              status: newStatus as string,
              constraintOutcomes: result.constraintOutcomes,
            } as Prisma.InputJsonValue,
            status: "pending" as const,
          },
        });

        // Consume inventory for completed prep tasks
        let inventoryConsumptionResult: Awaited<
          ReturnType<typeof consumeInventoryForPrepTask>
        > | null = null;
        if (
          (newStatus === "done" || newStatus === "completed") &&
          existingTask.recipeVersionId
        ) {
          inventoryConsumptionResult = await consumeInventoryForPrepTask(
            tenantId,
            id,
            existingTask.recipeVersionId,
            Number(existingTask.quantityTotal),
            employeeId || ""
          );

          // Log warnings for inventory consumption issues
          if (inventoryConsumptionResult.warnings.length > 0) {
            console.warn(
              `Inventory consumption warnings for task ${id}:`,
              inventoryConsumptionResult.warnings
            );
          }
        }

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
    } catch (error) {
      console.error("Error updating task via Manifest:", error);
      return NextResponse.json(
        {
          message: "Failed to update task",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  }

  // Handle non-status updates (priority, summary, tags, dueDate) via direct Prisma
  interface TaskUpdateData {
    status?: string;
    priority?: number;
    summary?: string;
    complexity?: number;
    tags?: string[];
    dueDate?: Date | null;
  }
  const updateData: TaskUpdateData = {};
  if (body.status) {
    updateData.status = body.status;
  }
  if (body.priority !== undefined) {
    updateData.priority = body.priority;
  }
  if (body.summary !== undefined && body.summary !== null) {
    updateData.summary = body.summary;
  }
  if (body.complexity !== undefined && body.complexity !== null) {
    updateData.complexity = body.complexity;
  }
  if (body.tags !== undefined) {
    updateData.tags = body.tags;
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }

  const task = await database.prepTask.update({
    where: { tenantId_id: { tenantId, id } },
    data: updateData,
  });

  // If status changed, create progress entry
  if (body.status && body.status !== existingTask.status && employeeId) {
    await database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId: task.id,
        employeeId,
        progressType: "status_change",
        oldStatus: existingTask.status,
        newStatus: body.status,
        notes: body.notes,
      },
    });
  }

  // Create outbox event
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: task.id,
      eventType: "kitchen.task.updated",
      payload: {
        taskId: task.id,
        status: task.status,
        priority: task.priority,
      },
      status: "pending" as const,
    },
  });

  return NextResponse.json({ task });
}

/**
 * Map Prisma status to Manifest status
 */
function mapPrismaStatusToManifest(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "open",
    in_progress: "in_progress",
    done: "done",
    completed: "done",
    canceled: "canceled",
  };
  return statusMap[status] ?? status;
}

/**
 * Map Manifest status to Prisma status
 */
function mapManifestStatusToPrisma(status: string): string {
  const statusMap: Record<string, string> = {
    open: "pending",
    in_progress: "in_progress",
    done: "done",
    canceled: "canceled",
  };
  return statusMap[status] ?? status;
}
