import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.clone().json();

  // Route to the appropriate manifest command based on the payload
  const commandName = body.columns ? "updateColumns" : "updateSettings";

  return executeManifestCommand(request, {
    entityName: "BoardConfig",
    commandName,
    params: { id },
  });
}
