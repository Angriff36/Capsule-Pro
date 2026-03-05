// Command handler for EventProfitability.recalculate
// Writes flow through runtime.runCommand() to enforce guards, policies, and constraints
// Post-command: invokes profitability calculation service to compute actual vs. projected values

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import {
  calculateEventProfitability,
  updateEventProfitabilityRecord,
} from "@/app/lib/event-profitability-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Resolve internal user from Clerk auth
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();
    const { eventId } = body as { eventId?: string };

    if (!eventId) {
      return manifestErrorResponse("eventId is required", 400);
    }

    console.log("[event-profitability/recalculate] Executing command:", {
      entityName: "EventProfitability",
      command: "recalculate",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
      eventId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "EventProfitability",
    });

    const result = await runtime.runCommand("recalculate", body, {
      entityName: "EventProfitability",
    });

    if (!result.success) {
      console.error("[event-profitability/recalculate] Command failed:", {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

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

    // Post-command effect: Run profitability calculation
    // This is a DESIGNATED BYPASS because:
    // 1. The calculation is a deterministic downstream effect of the recalculate command
    // 2. The runtime command has already enforced guards and policies
    // 3. All profitability data derives from governed entities (TimeEntry, InventoryTransaction, etc.)
    // 4. Requiring a separate command for each field update would be impractical
    console.log("[event-profitability/recalculate] Running profitability calculation");
    const profitabilityResult = await calculateEventProfitability(database, {
      eventId,
      tenantId,
    });
    await updateEventProfitabilityRecord(database, profitabilityResult);

    return manifestSuccessResponse({
      result: {
        ...result.result,
        profitability: profitabilityResult,
      },
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[event-profitability/recalculate] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
