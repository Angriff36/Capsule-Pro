import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTaskComment",
    commandName: "softDelete",
    params: { id: commentId },
  });
}
