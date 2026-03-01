/**
 * @module ContractSendAPI
 * @intent Handle sending contracts to clients for signature via manifest runtime
 * @responsibility Execute EventContract.send command, then send notification email
 * @domain Events
 * @tags contracts, api, send, manifest-runtime
 * @canonical true
 */

import { randomUUID } from "node:crypto";
import { database } from "@repo/database";
import { ContractTemplate, resend } from "@repo/email";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

/**
 * POST /api/events/contracts/[id]/send
 * Send contract to client for signature.
 *
 * 1. Executes EventContract.send via manifest runtime (status → "sent", guards enforced)
 * 2. Generates signing token and updates contract
 * 3. Sends notification email to client (best-effort — email failure does not roll back)
 *
 * Note: The signing token generation and email dispatch are side-effects that
 * will eventually move into manifest event handlers. For now they remain in
 * the route handler to preserve existing behavior.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

  try {
    const currentUser = await requireCurrentUser();

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is acceptable
    }

    const clientId = body.clientId as string | undefined;
    const message = body.message as string | undefined;

    // --- 1. Execute manifest command: EventContract.send ---
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: "EventContract",
    });

    const idempotencyKey =
      request.headers.get("Idempotency-Key") ??
      request.headers.get("X-Idempotency-Key") ??
      undefined;

    const result = await runtime.runCommand(
      "send",
      {
        id: contractId,
        tenantId: currentUser.tenantId,
        sentBy: currentUser.id,
      },
      {
        entityName: "EventContract",
        ...(idempotencyKey ? { idempotencyKey } : {}),
      }
    );

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    // --- 2. Generate signing token (side-effect, will move to event handler) ---
    const signingToken = randomUUID();

    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id: contractId,
        },
      },
      data: { signingToken },
    });

    // --- 3. Send email notification (best-effort) ---
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId: currentUser.tenantId,
          id: contractId,
        },
      },
    });

    let clientEmail: string | null = null;
    let signingUrl = "";

    if (clientId) {
      const clientResult = await database.$queryRaw<
        Array<{
          id: string;
          company_name: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        }>
      >`
        SELECT c.id,
               c.company_name,
               c.first_name,
               c.last_name,
               c.email
        FROM tenant_crm.clients AS c
        WHERE c.tenant_id = ${currentUser.tenantId}
          AND c.id = ${clientId}
          AND c.deleted_at IS NULL
      `;

      const client = clientResult[0];

      if (client?.email) {
        clientEmail = client.email;
        const appUrl = process.env.APP_URL || "https://app.convoy.com";
        signingUrl = `${appUrl}/sign/contract/${signingToken}`;
        const clientName =
          client.first_name || client.company_name || "Valued Client";

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM || "noreply@convoy.com",
            to: client.email,
            subject: `Contract for Signature: ${contract?.title ?? "Contract"}`,
            react: ContractTemplate({
              clientName,
              contractTitle: contract?.title ?? "Contract",
              signingUrl,
              message,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send contract email:", emailError);
          // Continue — email failure is non-fatal
        }
      }
    }

    return manifestSuccessResponse({
      result: {
        ...(result.result as Record<string, unknown>),
        message: "Contract sent successfully",
        clientEmail,
        signingUrl,
      },
      events: result.emittedEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[EventContract/send] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
