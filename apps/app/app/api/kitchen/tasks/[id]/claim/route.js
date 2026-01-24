Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
async function POST(request, context) {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!(orgId && clerkId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { id } = await context.params;
  const body = await request.json();
  // Get current user by Clerk ID
  const currentUser = await database_1.database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
  });
  if (!currentUser) {
    return server_2.NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }
  // Verify task exists
  const task = await database_1.database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }],
    },
  });
  if (!task) {
    return server_2.NextResponse.json(
      { message: "Task not found" },
      { status: 404 }
    );
  }
  // Check if there's already an active claim for this task
  const existingClaim = await database_1.database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }, { releasedAt: null }],
    },
  });
  if (existingClaim) {
    return server_2.NextResponse.json(
      { message: "Task already claimed. Please release it first." },
      { status: 409 }
    );
  }
  // Create claim
  const claim = await database_1.database.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId: id,
      employeeId: currentUser.id,
    },
  });
  // Update task status to in_progress if it was pending
  if (task.status === "pending") {
    await database_1.database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: "in_progress" },
    });
    await database_1.database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId: id,
        employeeId: currentUser.id,
        progressType: "status_change",
        oldStatus: "pending",
        newStatus: "in_progress",
        notes: `Task claimed by ${currentUser.firstName || ""} ${currentUser.lastName || ""}`,
      },
    });
  }
  // Create outbox event
  await database_1.database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: id,
      eventType: "kitchen.task.claimed",
      payload: {
        taskId: id,
        claimId: claim.id,
        employeeId: currentUser.id,
        status: task.status === "pending" ? "in_progress" : task.status,
      },
      status: "pending",
    },
  });
  return server_2.NextResponse.json({ claim }, { status: 201 });
}
