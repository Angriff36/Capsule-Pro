import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  // Optional filters
  const status = searchParams.get("status"); // pending | in_progress | completed | canceled
  const minPriority = searchParams.get("minPriority"); // number 1-10

  const tasks = await database.kitchenTask.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        ...(status ? [{ status }] : []),
        ...(minPriority
          ? [{ priority: { lte: Number.parseInt(minPriority, 10) } }]
          : []),
      ],
    },
    orderBy: [
      { priority: "asc" }, // priority 1-10, ascending = highest first
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
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // Build task map with claims
  const taskClaimsMap = new Map<string, typeof claims>();
  for (const claim of claims) {
    if (!taskClaimsMap.has(claim.taskId)) {
      taskClaimsMap.set(claim.taskId, []);
    }
    taskClaimsMap.get(claim.taskId)?.push(claim);
  }

  // Attach users to claims
  const tasksWithUsers = tasks.map((task) => ({
    ...task,
    claims: (taskClaimsMap.get(task.id) || []).map((claim) => ({
      ...claim,
      user: userMap.get(claim.employeeId) || null,
    })),
  }));

  return NextResponse.json({ tasks: tasksWithUsers });
}

/**
 * Create a new KitchenTask via manifest runtime.
 *
 * Delegates to executeManifestCommand which handles auth, tenant resolution,
 * user lookup, guard/policy enforcement, and event emission.
 *
 * POST /api/kitchen/tasks
 */
export async function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "create",
    transformBody: (body, ctx) => ({
      ...body,
      // Provide defaults matching the old direct-Prisma behavior
      summary: body.summary || body.title,
      priority: body.priority ?? 5,
      complexity: body.complexity ?? 5,
      tags: body.tags || [],
    }),
  });
}
