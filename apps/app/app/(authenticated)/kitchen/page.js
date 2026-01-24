Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("@/app/lib/tenant");
const production_board_client_1 = require("./production-board-client");
const production_board_realtime_1 = require("./production-board-realtime");
const KitchenPage = async () => {
  const { orgId, userId: clerkId } = await (0, server_1.auth)();
  if (!orgId) {
    return (
      <div className="p-6">
        <p className="text-red-500">Unauthorized: No organization ID found</p>
      </div>
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Find current user in database using Clerk ID
  const dbUser = clerkId
    ? await database_1.database.user.findFirst({
        where: {
          tenantId,
          authUserId: clerkId,
        },
      })
    : null;
  // Fetch all kitchen tasks for the tenant
  const tasks = await database_1.database.kitchenTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [
      { priority: "asc" }, // priority 1-10, so ascending = highest first
      { dueDate: "asc" }, // earliest due date first
    ],
  });
  // Fetch claims separately
  const claims = await database_1.database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { releasedAt: null }],
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
      avatarUrl: true,
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  // Build task map with claims
  const taskClaimsMap = new Map();
  claims.forEach((claim) => {
    if (!taskClaimsMap.has(claim.taskId)) {
      taskClaimsMap.set(claim.taskId, []);
    }
    taskClaimsMap.get(claim.taskId).push(claim);
  });
  // Attach users to claims and to tasks
  const tasksWithUsers = tasks.map((task) => ({
    ...task,
    claims: (taskClaimsMap.get(task.id) || []).map((claim) => ({
      ...claim,
      user: userMap.get(claim.employeeId) || null,
    })),
  }));
  return (
    <>
      <production_board_client_1.ProductionBoardClient
        currentUserId={dbUser?.id}
        initialTasks={tasksWithUsers}
        tenantId={tenantId}
      />
      <production_board_realtime_1.ProductionBoardRealtime
        tenantId={tenantId}
        userId={dbUser?.id}
      />
    </>
  );
};
exports.default = KitchenPage;
