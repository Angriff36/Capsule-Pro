/**
 * Individual Client Interaction API Endpoints
 *
 * PUT    /api/crm/clients/[id]/interactions/[interactionId] - Update interaction (via manifest command)
 * DELETE /api/crm/clients/[id]/interactions/[interactionId] - Complete interaction (via manifest command)
 */

import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string; interactionId: string }>;
}

/**
 * PUT /api/crm/clients/[id]/interactions/[interactionId]
 * Update a specific interaction via manifest command
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id, interactionId } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "ClientInteraction",
    command: "update",
    body: { ...rawBody, id: interactionId, clientId: id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/crm/clients/[id]/interactions/[interactionId]
 * Complete a specific interaction via manifest command
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id, interactionId } = await context.params;
  const user = await resolveCurrentUser(request);
  return runManifestCommand({
    entity: "ClientInteraction",
    command: "complete",
    body: { id: interactionId, clientId: id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
