/**
 * Individual Client Interaction API Endpoints
 *
 * PUT    /api/crm/clients/[id]/interactions/[interactionId] - Update interaction (via manifest command)
 * DELETE /api/crm/clients/[id]/interactions/[interactionId] - Complete interaction (via manifest command)
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteContext {
  params: Promise<{ id: string; interactionId: string }>;
}

/**
 * PUT /api/crm/clients/[id]/interactions/[interactionId]
 * Update a specific interaction via manifest command
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id, interactionId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "ClientInteraction",
    commandName: "update",
    params: { id, interactionId },
    transformBody: (body) => ({ ...body, id: interactionId, clientId: id }),
  });
}

/**
 * DELETE /api/crm/clients/[id]/interactions/[interactionId]
 * Complete a specific interaction via manifest command
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id, interactionId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "ClientInteraction",
    commandName: "complete",
    params: { id, interactionId },
    transformBody: (_body) => ({ id: interactionId, clientId: id }),
  });
}
