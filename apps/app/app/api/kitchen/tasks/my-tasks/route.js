Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/tasks/my-tasks
 *
 * Returns tasks that are currently claimed by the current user.
 * This is the "My Tasks" view for mobile users.
 */
async function GET(request) {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!(orgId && clerkId)) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = new URL(request.url);
  // Get current user by Clerk ID
  const currentUser = await database_1.database.user.findFirst({
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
    return server_2.NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }
  // Optional filters
  const status = searchParams.get("status"); // pending | in_progress | completed | canceled
  const station = searchParams.get("station"); // filter by station/tag
  // Get active claims for current user
  const myClaims = await database_1.database.kitchenTaskClaim.findMany({
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
    return server_2.NextResponse.json({
      tasks: [],
      userId: currentUser.id,
    });
  }
  // Get the tasks
  const tasks = await database_1.database.kitchenTask.findMany({
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
  return server_2.NextResponse.json({
    tasks: tasksWithClaimInfo,
    userId: currentUser.id,
  });
}
