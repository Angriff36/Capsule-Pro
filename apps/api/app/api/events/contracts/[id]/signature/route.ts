/**
 * Event Contract Signature API Endpoints
 *
 * POST   /api/events/contracts/[id]/signature - Capture new signature via manifest runtime
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * POST /api/events/contracts/[id]/signature
 * Capture a new signature for a contract via ContractSignature.create command.
 *
 * The manifest command enforces guards (contractId, signatureData, signerName required)
 * and emits SignatureCreated event. The auto-update of contract status to "signed"
 * should be handled by an event handler listening for SignatureCreated.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  return executeManifestCommand(request, {
    entityName: "ContractSignature",
    commandName: "create",
    params: { contractId },
    transformBody: (body, ctx) => ({
      ...body,
      contractId,
      tenantId: ctx.tenantId,
    }),
  });
}
