/**
 * @module ContractStatusAPI
 * @intent Handle contract status transitions via manifest runtime
 * @responsibility Map status values to specific EventContract commands (send, sign, expire, cancel)
 * @domain Events
 * @tags contracts, api, status, manifest-runtime
 * @canonical true
 */

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
 * Map of target status → manifest command name.
 *
 * The manifest defines specific commands for each status transition
 * (with guards enforcing valid source states), rather than a generic
 * "set status" mutation. This preserves domain invariants.
 */
const STATUS_COMMAND_MAP: Record<
  string,
  {
    commandName: string;
    buildPayload: (userId: string) => Record<string, unknown>;
  }
> = {
  sent: {
    commandName: "send",
    buildPayload: (userId) => ({ sentBy: userId }),
  },
  viewed: {
    commandName: "markViewed",
    buildPayload: () => ({}),
  },
  signed: {
    commandName: "sign",
    buildPayload: () => ({}),
  },
  expired: {
    commandName: "expire",
    buildPayload: () => ({}),
  },
  cancelled: {
    commandName: "cancel",
    buildPayload: (userId) => ({
      reason: "Status update via API",
      canceledBy: userId,
    }),
  },
};

const VALID_STATUSES = Object.keys(STATUS_COMMAND_MAP);

/**
 * PATCH /api/events/contracts/[id]/status
 * Transition contract status via the appropriate manifest command.
 *
 * Each status maps to a specific EventContract command:
 * - "sent"      → EventContract.send
 * - "viewed"    → EventContract.markViewed
 * - "signed"    → EventContract.sign
 * - "expired"   → EventContract.expire
 * - "cancelled" → EventContract.cancel
 *
 * The manifest commands enforce valid state transitions through guards
 * (e.g., "Cannot send a signed contract") and emit domain events.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const currentUser = await requireCurrentUser();

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is OK — status is the only required field
    }

    const status = body.status as string | undefined;

    if (!(status && VALID_STATUSES.includes(status))) {
      return manifestErrorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400
      );
    }

    const { commandName, buildPayload } = STATUS_COMMAND_MAP[status];

    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: "EventContract",
    });

    const payload = {
      id,
      tenantId: currentUser.tenantId,
      ...buildPayload(currentUser.id),
    };

    const idempotencyKey =
      request.headers.get("Idempotency-Key") ??
      request.headers.get("X-Idempotency-Key") ??
      undefined;

    const result = await runtime.runCommand(commandName, payload, {
      entityName: "EventContract",
      ...(idempotencyKey ? { idempotencyKey } : {}),
    });

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

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[EventContract/status] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
