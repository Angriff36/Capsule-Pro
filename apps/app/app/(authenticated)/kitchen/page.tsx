import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ProductionBoardClient } from "./production-board-client";
import { ProductionBoardRealtime } from "./production-board-realtime";

const KitchenPage = async () => {
  const { orgId, userId: clerkId } = await auth();

  if (!orgId) {
    return (
      <div className="p-6">
        <p className="text-red-500">Unauthorized: No organization ID found</p>
      </div>
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Find current user in database using Clerk ID
  const dbUser = clerkId
    ? await database.user.findFirst({
        where: {
          tenantId,
          authUserId: clerkId,
        },
      })
    : null;

  // Fetch all kitchen tasks for the tenant
  const tasks = await database.kitchenTask.findMany({
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
  const claims = await database.kitchenTaskClaim.findMany({
    where: {
      AND: [{ tenantId }, { releasedAt: null }],
    },
  });

  // Fetch users for claims
  const claimEmployeeIds = new Set(claims.map((c) => c.employeeId));
  const users = await database.user.findMany({
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
  const taskClaimsMap = new Map<string, typeof claims>();
  claims.forEach((claim) => {
    if (!taskClaimsMap.has(claim.taskId)) {
      taskClaimsMap.set(claim.taskId, []);
    }
    taskClaimsMap.get(claim.taskId)!.push(claim);
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
      <ProductionBoardClient
        currentUserId={dbUser?.id}
        initialTasks={tasksWithUsers}
      />
      <ProductionBoardRealtime tenantId={tenantId} userId={dbUser?.id} />
    </>
  );
};

export default KitchenPage;
