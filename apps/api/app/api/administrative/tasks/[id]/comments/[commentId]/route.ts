import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * DELETE /api/administrative/tasks/[id]/comments/[commentId]
 * Soft-delete via the governed AdminTaskComment.softDelete command.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  const user = await resolveCurrentUser(request);

  return runCommand({
    entity: "AdminTaskComment",
    command: "softDelete",
    body: {},
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: commentId,
  });
}
