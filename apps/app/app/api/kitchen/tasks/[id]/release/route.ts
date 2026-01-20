import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;
  const body = await request.json();

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [
        { tenantId },
        { authUserId: clerkId }
      ]
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Find active claim for this user
  const claim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [
        { tenantId },
        { taskId: id },
        { employeeId: currentUser.id },
        { releasedAt: null }
      ]
    },
  });

  if (!claim) {
    return NextResponse.json(
      { message: "No active claim found for this user" },
      { status: 404 }
    );
  }

  // Update claim to released
  const updatedClaim = await database.kitchenTaskClaim.update({
    where: { tenantId_id: { tenantId, id: claim.id } },
    data: {
      releasedAt: new Date(),
      releaseReason: body.releaseReason,
    },
  });

  // Get the current task
  const task = await database.kitchenTask.findFirst({
    where: {
      AND: [
        { tenantId },
        { id }
      ]
    },
  });

  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  // Check if there are any other active claims
  const remainingClaims = await database.kitchenTaskClaim.count({
    where: {
      AND: [
        { tenantId },
        { taskId: id },
        { releasedAt: null }
      ]
    },
  });

  // If no more active claims, set task back to pending
  if (remainingClaims === 0) {
    await database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: "pending" },
    });

    await database.kitchenTaskProgress.create({
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
  await database.outboxEvent.create({
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
      status: "pending" as const,
    },
  });

  return NextResponse.json({ claim: updatedClaim });
}
