import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

const VALID_STATUSES = new Set([
  "backlog",
  "in_progress",
  "review",
  "done",
  "cancelled",
]);

/**
 * POST /api/administrative/tasks/[id]/move
 *
 * Kanban drag/drop. Dispatches the governed AdminTask command matching the
 * drag semantics:
 *   - cross-column drag  → moveCard(status, position) — the state machine's
 *     transition table governs legal column changes
 *   - same-column drag   → reorder(position) — the runtime rejects no-op
 *     self-transitions, so moveCard cannot target the current column
 *
 * The legacy "todo" status no longer exists and maps to "backlog".
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const requestedStatus =
    rawBody.status === "todo" ? "backlog" : (rawBody.status as string);
  if (!VALID_STATUSES.has(requestedStatus)) {
    return NextResponse.json(
      { message: `Invalid status: ${String(rawBody.status)}` },
      { status: 400 }
    );
  }

  const position = Number(rawBody.position);
  if (!Number.isFinite(position)) {
    return NextResponse.json(
      { message: "position must be a number" },
      { status: 400 }
    );
  }

  // Tenant-scoped read to pick the command (cross-column vs same-column).
  const task = await database.adminTask.findFirst({
    where: {
      AND: [{ tenantId: user.tenantId }, { id }, { deletedAt: null }],
    },
    select: { status: true },
  });
  if (!task) {
    return NextResponse.json({ message: "Task not found" }, { status: 404 });
  }

  if (task.status === requestedStatus) {
    return runCommand({
      entity: "AdminTask",
      command: "reorder",
      body: { position },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
      instanceId: id,
    });
  }

  return runCommand({
    entity: "AdminTask",
    command: "moveCard",
    body: { status: requestedStatus, position },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: id,
  });
}
