import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type { NextRequest } from "next/server";

/**
 * POST /api/kitchen/equipment/commands/update-status
 * Update equipment status/condition via Manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Equipment",
    commandName: "updateStatus",
    transformBody: (body) => ({
      id: body.id,
      status: body.status,
      condition: body.condition,
      notes: body.notes,
    }),
  });
}
