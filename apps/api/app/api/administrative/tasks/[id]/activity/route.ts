import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/administrative/tasks/[id]/activity
 *
 * Read-only operational activity feed for a task. AdminTaskActivity is an
 * append-only log table with no manifest entity and no soft-delete column,
 * so no `deletedAt: null` filter applies (the model has no deletedAt field).
 * Nothing writes to this table via this API surface — rows are reserved for
 * operational logging, while semantic events are emitted by the governed
 * AdminTask* commands.
 */
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

  const activity = await database.adminTaskActivity.findMany({
    where: {
      AND: [{ tenantId }, { taskId: id }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: activity });
}
