import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  cancelPrepTask,
  completePrepTask,
  createPrepTaskRuntime,
  type KitchenOpsContext,
  releasePrepTask,
} from "@repo/kitchen-ops";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
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
      "@repo/kitchen-ops/prisma-store"
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

      let result;
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

        // Create outbox event
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

        return NextResponse.json({
          task: {
            ...existingTask,
            status: newStatus,
          },
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
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
