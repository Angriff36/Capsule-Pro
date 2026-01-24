Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/tasks/available
 *
 * Returns tasks that are available for the current user to claim.
 * Filters out tasks that are already claimed by the current user.
 * Supports filtering by station, priority, and status.
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
  const minPriority = searchParams.get("minPriority"); // number 1-10
  const station = searchParams.get("station"); // filter by station/tag
  // Get tasks that are NOT claimed by current user
  // First, get all task IDs claimed by current user
  const myClaims = await database_1.database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { employeeId: currentUser.id }, { releasedAt: null }],
    },
    select: {
      taskId: true,
    },
  });
  const myClaimedTaskIds = new Set(myClaims.map((c) => c.taskId));
  // Build where clause with proper typing
  const whereClause = {
    AND: [
      { tenantId },
      { deletedAt: null },
      // Exclude tasks already claimed by me
      ...(myClaimedTaskIds.size > 0
        ? [{ id: { notIn: Array.from(myClaimedTaskIds) } }]
        : []),
      ...(status ? [{ status }] : []),
      ...(minPriority
        ? [{ priority: { lte: Number.parseInt(minPriority, 10) } }]
        : []),
      ...(station ? [{ tags: { has: station } }] : []),
    ],
  };
  const tasks = await database_1.database.kitchenTask.findMany({
    where: whereClause,
    orderBy: [
      { priority: "asc" }, // priority 1-10, ascending = highest first
      { dueDate: "asc" }, // earliest due date first
      { createdAt: "desc" }, // newest tasks first
    ],
  });
  // Fetch claims for all tasks
  const taskIds = tasks.map((t) => t.id);
  const claims = await database_1.database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { taskId: { in: taskIds } }, { releasedAt: null }],
    },
  });
  // Fetch users for claims
  const claimEmployeeIds = new Set(claims.map((c) => c.employeeId));
  const users = await database_1.database.user.findMany({
    where: {
      AND: [{ tenantId }, { id: { in: Array.from(claimEmployeeIds) } }],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  // Build task map with claims using for...of
  const taskClaimsMap = new Map();
  for (const claim of claims) {
    if (!taskClaimsMap.has(claim.taskId)) {
      taskClaimsMap.set(claim.taskId, []);
    }
    const claimsList = taskClaimsMap.get(claim.taskId);
    if (claimsList) {
      claimsList.push(claim);
    }
  }
  // Attach users to claims and mark availability
  const tasksWithClaims = tasks.map((task) => {
    const taskClaims = (taskClaimsMap.get(task.id) || []).map((claim) => ({
      ...claim,
      user: userMap.get(claim.employeeId) || null,
    }));
    return {
      ...task,
      claims: taskClaims,
      isClaimedByOthers: taskClaims.length > 0,
      isAvailable: taskClaims.length === 0,
    };
  });
  return server_2.NextResponse.json({
    tasks: tasksWithClaims,
    userId: currentUser.id,
  });
}
