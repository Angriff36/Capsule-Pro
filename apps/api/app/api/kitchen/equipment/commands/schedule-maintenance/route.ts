import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type { NextRequest } from "next/server";

/**
 * POST /api/kitchen/equipment/commands/schedule-maintenance
 * Schedule maintenance for equipment via Manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "Equipment",
    commandName: "scheduleMaintenance",
    transformBody: (body) => ({
      equipmentId: body.equipmentId,
      title: body.title,
      description: body.description,
      priority: body.priority,
      scheduledDate: body.scheduledDate,
      assignedTo: body.assignedTo,
      estimatedCost: body.estimatedCost,
      vendorId: body.vendorId,
    }),
  });
}
