import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * DELETE /api/administrative/tasks/[id]/file-refs/[refId]
 * Soft-delete via the governed AdminTaskFileRef.softDelete command.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  const { refId } = await params;
  const user = await resolveCurrentUser(request);

  return runCommand({
    entity: "AdminTaskFileRef",
    command: "softDelete",
    body: {},
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: refId,
  });
}
