// Auto-generated Next.js command handler for Event.create
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

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
    let currentUser = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
    });

    // Fallback: Clerk session user not in DB yet (e.g. new login) — use any active admin
    if (!currentUser) {
      currentUser = await database.user.findFirst({
        where: { tenantId, isActive: true },
      });
    }

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();

    console.log("[event/create] Executing command:", {
      entityName: "Event",
      command: "create",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "Event",
    });

    const result = await runtime.runCommand("create", body, {
      entityName: "Event",
    });

    if (!result.success) {
      console.error("[event/create] Command failed:", {
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

    // WHY TWO-STEP: runCommand("create") validates governance (policies/guards/constraints)
    // and fires emits, but the IR command create uses mutate+emit only — no persist action.
    // Without createInstance the row is never written to Prisma. EventPrismaStore handles
    // the actual INSERT into tenant_events.events.
    //
    // WHY DEFAULTS: createInstance re-evaluates entity constraints against merged defaults+body.
    // Entity-level constraints (validEventType, validStatus) fail if fields are empty string.
    // We apply command-equivalent defaults here so constraints pass on creation.
    // TODO: Move to IR persist action so this is unnecessary.
    const instanceData = {
      ...body,
      // Apply command-equivalent defaults so entity constraints pass on creation
      title: body.title || "Untitled Event",
      eventType: body.eventType || "general",
      status: body.status || "confirmed",
      guestCount: Number(body.guestCount) > 0 ? Number(body.guestCount) : 1,
      eventDate:
        Number(body.eventDate) > 0 ? Number(body.eventDate) : Date.now(),
    };
    const created = await runtime.createInstance("Event", instanceData);

    return manifestSuccessResponse({
      result: created,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[event/create] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
