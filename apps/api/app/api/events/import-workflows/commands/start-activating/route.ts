import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function POST(request: NextRequest) {
  return await executeManifestCommand(request, {
    entityName: "EventImportWorkflow",
    commandName: "startActivating",
  });
}
