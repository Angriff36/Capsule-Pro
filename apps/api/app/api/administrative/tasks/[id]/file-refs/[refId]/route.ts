import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  const { refId } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTaskFileRef",
    commandName: "softDelete",
    params: { id: refId },
  });
}
