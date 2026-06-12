import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTask",
    commandName: "moveCard",
    params: { id },
  });
}
