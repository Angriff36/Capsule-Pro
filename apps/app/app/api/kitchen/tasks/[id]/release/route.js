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
  // Find active claim for this user
  const claim = await database_1.database.kitchenTaskClaim.findFirst({
    where: {
      AND: [
        { tenantId },
        { taskId: id },
        { employeeId: currentUser.id },
        { releasedAt: null },
      ],
    },
  });
  if (!claim) {
    return server_2.NextResponse.json(
      { message: "No active claim found for this user" },
      { status: 404 }
    );
  }
  // Update claim to released
  const updatedClaim = await database_1.database.kitchenTaskClaim.update({
    where: { tenantId_id: { tenantId, id: claim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: body.releaseReason,
    },
  });
  // Get the current task
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
  // Check if there are any other active claims
  const remainingClaims = await database_1.database.kitchenTaskClaim.count({
    where: {
      AND: [{ tenantId }, { taskId: id }, { releasedAt: null }],
    },
  });
  // If no more active claims, set task back to pending
  if (remainingClaims === 0) {
    await database_1.database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: "pending" },
    });
    await database_1.database.kitchenTaskProgress.create({
      data: {
        tenantId,
        taskId: id,
        employeeId: currentUser.id,
        progressType: "status_change",
        oldStatus: "in_progress",
        newStatus: "pending",
        notes: body.releaseReason || "Task released",
      },
    });
  }
  // Create outbox event
  await database_1.database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "KitchenTask",
      aggregateId: id,
      eventType: "kitchen.task.released",
      payload: {
        taskId: id,
        claimId: claim.id,
        employeeId: currentUser.id,
        releaseReason: body.releaseReason,
        status: remainingClaims === 0 ? "pending" : "in_progress",
      },
      status: "pending",
    },
  });
  return server_2.NextResponse.json({ claim: updatedClaim });
}
