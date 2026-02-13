import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { UpdateAdminTaskSchema } from "../validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

export async function GET(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  const task = await fetchAdminTask(tenantId, id);
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  return NextResponse.json({ data: task });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  // Verify task exists
  const existingTask = await fetchAdminTask(tenantId, id);
  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  const body = await request.json();
  const parseResult = UpdateAdminTaskSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { message: "Invalid request body", details: parseResult.error.issues },
      { status: 400 }
    );
  }

  try {
    // Validate status transitions
    const { status: newStatus, dueDate, ...rest } = parseResult.data;
    if (newStatus) {
      validateStatusTransition(existingTask.status, newStatus);
    }

    const updatedTask = await database.adminTask.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...rest,
        ...(newStatus !== undefined ? { status: newStatus } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
      },
    });

    return NextResponse.json({ data: updatedTask });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await context.params;

  // Verify task exists
  const existingTask = await fetchAdminTask(tenantId, id);
  if (!existingTask) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  // Soft delete
  await database.adminTask.update({
    where: { tenantId_id: { tenantId, id } },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ message: "Task deleted" });
}

// ============ Business Rules ============

/**
 * Validate that a status transition is allowed.
 *
 * Allowed transitions:
 *   backlog  → todo, cancelled
 *   todo     → in_progress, backlog, cancelled
 *   in_progress → done, todo, cancelled
 *   done     → (terminal)
 *   cancelled → backlog (reopen)
 */
const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  backlog: ["todo", "cancelled"],
  todo: ["in_progress", "backlog", "cancelled"],
  in_progress: ["done", "todo", "cancelled"],
  done: [],
  cancelled: ["backlog"],
};

function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  if (currentStatus === newStatus) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed?.includes(newStatus)) {
    throw new InvariantError(
      `Cannot transition from "${currentStatus}" to "${newStatus}"`
    );
  }
}
