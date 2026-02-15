/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client (via manifest command)
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
  return executeManifestCommand(request, {
    entityName: "Proposal",
    commandName: "send",
    params: { id },
    transformBody: (body) => ({ ...body, id }),
  });
}
