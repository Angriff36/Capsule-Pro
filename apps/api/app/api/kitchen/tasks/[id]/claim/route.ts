import { database } from "@repo/database";
import { triggerTaskAssignedSms } from "@repo/notifications";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Claim a kitchen task via Manifest runtime.
 *
 * POST /api/kitchen/tasks/:id/claim
 *
 * Delegates to runManifestCommand which handles:
 * - Auth resolution, guard/policy enforcement
 * - Status transition (pending/in_progress -> in_progress)
 * - Event emission (KitchenTaskClaimed)
 * - Outbox event creation and webhook dispatch
 */
export async function POST(request: Request, context: RouteContext) {
  const user = await resolveCurrentUser(request);
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  // Fire-and-forget SMS trigger for task assignment
  // Resolve task name for SMS before delegating to runtime
  const task = await database.kitchenTask.findFirst({
    where: { AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }] },
    select: { title: true, dueDate: true },
  });
  if (task) {
    triggerTaskAssignedSms({
      tenantId: user.tenantId,
      taskId: id,
      taskName: task.title,
      employeeId: user.id,
      employeeName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      dueDate: task.dueDate?.toISOString(),
    }).catch(() => {});
  }

  return runManifestCommand({
    entity: "KitchenTask",
    command: "claim",
    body: {
      ...body,
      id,
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
