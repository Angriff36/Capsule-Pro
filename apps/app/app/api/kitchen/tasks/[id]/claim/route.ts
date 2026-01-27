import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
  const _body = await request.json();

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Verify task exists
  const task = await database.kitchenTask.findFirst({
    where: {
      AND: [{ tenantId }, { id }],
    },
  });

  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  // Check if there's already an active claim for this task
  const existingClaim = await database.kitchenTaskClaim.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }, { releasedAt: null }],
    },
  });

  if (existingClaim) {
    return NextResponse.json(
      { message: "Task already claimed. Please release it first." },
      { status: 409 }
    );
  }

  // Create claim
  const claim = await database.kitchenTaskClaim.create({
    data: {
      tenantId,
      taskId: id,
      employeeId: currentUser.id,
    },
  });

  // Update task status to in_progress if it was pending
  if (task.status === "pending") {
    await database.kitchenTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: { status: "in_progress" },
    });

    await database.kitchenTaskProgress.create({
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
  await database.outboxEvent.create({
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
      status: "pending" as const,
    },
  });

  return NextResponse.json({ claim }, { status: 201 });
}
