import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId, userId: clerkId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();

  // Verify task exists and belongs to tenant
  const existingTask = await database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }],
    },
  });

  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

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

  // Update task
  const updateData: Record<string, any> = {};
  if (body.status) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.summary !== undefined) updateData.summary = body.summary;
  if (body.complexity !== undefined) updateData.complexity = body.complexity;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.dueDate !== undefined)
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.status === "completed") updateData.completedAt = new Date();

  const task = await database.kitchenTask.update({
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
