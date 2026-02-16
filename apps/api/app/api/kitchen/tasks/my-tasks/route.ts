import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/kitchen/tasks/my-tasks
 *
 * Returns tasks that are currently claimed by the current user.
 * This is the "My Tasks" view for mobile users.
 */
export async function GET(request: Request) {
  const { orgId, userId: clerkId } = await auth();
  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Optional filters
  const status = searchParams.get("status"); // pending | in_progress | completed | canceled
  const station = searchParams.get("station"); // filter by station/tag

  // Get active claims for current user
  const myClaims = await database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { employeeId: currentUser.id }, { releasedAt: null }],
    },
    select: {
      taskId: true,
      claimedAt: true,
    },
  });

  const myClaimedTaskIds = myClaims.map((c) => c.taskId);

  if (myClaimedTaskIds.length === 0) {
    return NextResponse.json({
      tasks: [],
      userId: currentUser.id,
    });
  }

  // Get the tasks
  const tasks = await database.kitchenTask.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        { id: { in: myClaimedTaskIds } },
        ...(status ? [{ status }] : []),
        ...(station ? [{ tags: { has: station } }] : []),
      ],
    },
    orderBy: [
      { priority: "asc" }, // priority 1-10, ascending = highest first
      { dueDate: "asc" }, // earliest due date first
    ],
  });

  // Create a map of taskId to claim data
  const claimMap = new Map(
    myClaims.map((c) => [c.taskId, { claimedAt: c.claimedAt }])
  );

  // Attach claim info to tasks
  const tasksWithClaimInfo = tasks.map((task) => ({
    ...task,
    claimedAt: claimMap.get(task.id)?.claimedAt,
  }));

  return NextResponse.json({
    tasks: tasksWithClaimInfo,
    userId: currentUser.id,
  });
}
