Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function PATCH(request, context) {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await context.params;
  const body = await request.json();
  // Verify task exists and belongs to tenant
  const existingTask = await database_1.database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }],
    },
  });
  if (!existingTask) {
    return server_2.NextResponse.json(
      { message: "Task not found" },
      { status: 404 }
    );
  }
  // Get current user for progress tracking
  let employeeId;
  if (clerkId) {
    const user = await database_1.database.user.findFirst({
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
    return server_2.NextResponse.json(
      { message: "Priority must be an integer between 1 and 10" },
      { status: 400 }
    );
  }
  // Update task
  const updateData = {};
  if (body.status) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.summary !== undefined) updateData.summary = body.summary;
  if (body.complexity !== undefined) updateData.complexity = body.complexity;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.dueDate !== undefined)
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.status === "completed") updateData.completedAt = new Date();
  const task = await database_1.database.kitchenTask.update({
    where: { tenantId_id: { tenantId, id } },
    data: updateData,
  });
  // If status changed, create progress entry
  if (body.status && body.status !== existingTask.status && employeeId) {
    await database_1.database.kitchenTaskProgress.create({
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
  await database_1.database.outboxEvent.create({
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
      status: "pending",
    },
  });
  return server_2.NextResponse.json({ task });
}
