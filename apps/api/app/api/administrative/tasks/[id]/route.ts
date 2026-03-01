import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

// ============ Helpers ============

/**
 * Fetch a single admin task with tenant isolation and soft-delete filter.
 */
async function fetchAdminTask(tenantId: string, taskId: string) {
  const task = await database.adminTask.findFirst({
    where: {
      AND: [{ tenantId }, { id: taskId }, { deletedAt: null }],
    },
  });

  return task;
}

// ============ Route Handlers ============

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const task = await fetchAdminTask(tenantId, id);
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: task });
}

/**
 * PATCH /api/administrative/tasks/[id]
 * Update task fields or transition status via manifest commands.
 *
 * Status changes are mapped to specific manifest commands:
 *   todo → moveToTodo, in_progress → startProgress, done → complete,
 *   cancelled → cancel, backlog → reopen
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.clone().json();

  // If status is being changed, use the specific status command
  if (body.status) {
    const statusCommandMap: Record<string, string> = {
      todo: "moveToTodo",
      in_progress: "startProgress",
      done: "complete",
      cancelled: "cancel",
      backlog: "reopen",
    };
    const commandName = statusCommandMap[body.status];
    if (!commandName) {
      return new Response(
        JSON.stringify({ message: `Invalid status: ${body.status}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    return executeManifestCommand(request, {
      entityName: "AdminTask",
      commandName,
      params: { id },
    });
  }

  // Otherwise it's a field update
  return executeManifestCommand(request, {
    entityName: "AdminTask",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body }),
  });
}

/**
 * DELETE /api/administrative/tasks/[id]
 * Soft-delete task via manifest command
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTask",
    commandName: "softDelete",
    params: { id },
  });
}
