import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
) {
  const { attachmentId } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTaskAttachment",
    commandName: "softDelete",
    params: { id: attachmentId },
  });
}
