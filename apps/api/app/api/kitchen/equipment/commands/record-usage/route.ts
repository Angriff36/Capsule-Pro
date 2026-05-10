import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * POST /api/kitchen/equipment/commands/record-usage
 * Record usage hours for equipment via Manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Equipment",
    commandName: "recordUsage",
    transformBody: (body) => ({
      id: body.id,
      hours: Number.parseFloat(String(body.hours ?? 0)),
      notes: body.notes,
    }),
  });
}
