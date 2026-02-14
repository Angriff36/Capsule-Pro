import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Update a kitchen task status
 *
 * Simple status update for KitchenTask model (bypassing Manifest which expects PrepTask).
 * Supports common status transitions with validation.
 *
 * PATCH /api/kitchen/tasks/:id
 */
export async function PATCH(request: Request, context: RouteContext) {
  // Step 1: Authenticate
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();

  // Step 2: Verify task exists
  const existingTask = await database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const currentStatus = existingTask.status;
  const newStatus = body.status;

  // Step 3: Validate status transition
  const validTransitions: Record<string, string[]> = {
    pending: ["in_progress", "done", "cancelled"],
    in_progress: ["done", "cancelled", "pending"],
    done: ["pending"],
    cancelled: ["pending"],
  };

  const allowed = validTransitions[currentStatus];
  if (
    newStatus &&
    newStatus !== currentStatus &&
    !allowed?.includes(newStatus)
  ) {
    return NextResponse.json(
      {
        message: `Cannot transition from "${currentStatus}" to "${newStatus}"`,
      },
      { status: 400 }
    );
  }

  // Step 4: Update task
  try {
    const updatedTask = await database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    // Step 5: Create progress entry
    if (newStatus && newStatus !== currentStatus) {
      await database.kitchenTaskProgress.create({
        data: {
          tenantId,
          taskId: id,
          employeeId: userId,
          progressType: "status_change",
          oldStatus: currentStatus,
          newStatus: newStatus as string,
        },
      });
    }

    // Step 6: Emit outbox event
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "KitchenTask",
        aggregateId: id,
        eventType: "kitchen.task.updated",
        payload: { taskId: id, status: newStatus } as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Get ID from params
  const { id } = await context.params;

  // Verify task exists
  const existingTask = await database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }, { deletedAt: null }],
    },
  });

  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  // Soft delete
  await database.kitchenTask.update({
    where: { tenantId_id: { tenantId, id } },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ message: "Task deleted" });
}
