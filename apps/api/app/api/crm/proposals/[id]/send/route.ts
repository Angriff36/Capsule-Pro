/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client (via manifest command)
 */

import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/crm/proposals/[id]/send
 * Send a proposal to the client via manifest command
 * Updates proposal status to 'sent' and records sentAt timestamp
 */
export async function POST(request: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "Proposal",
    command: "send",
    body: { ...rawBody, id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
