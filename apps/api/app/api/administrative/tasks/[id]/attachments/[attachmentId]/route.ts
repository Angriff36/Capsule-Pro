import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * DELETE /api/administrative/tasks/[id]/attachments/[attachmentId]
 * Soft-delete via the governed AdminTaskAttachment.softDelete command.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  const user = await resolveCurrentUser(request);

  return runCommand({
    entity: "AdminTaskAttachment",
    command: "softDelete",
    body: {},
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: attachmentId,
  });
}
