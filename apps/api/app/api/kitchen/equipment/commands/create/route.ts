import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * POST /api/kitchen/equipment/commands/create
 * Create a new equipment record via Manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Equipment",
    commandName: "create",
  });
}
