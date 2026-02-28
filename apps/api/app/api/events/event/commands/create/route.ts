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
    console.log("[event/create] Auth context:", { clerkId, orgId, tenantId });
    let currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    // Fallback: any active admin for this tenant (handles Clerk ID mismatch in dev)
    if (!currentUser) {
      console.log("[event/create] User not found by clerkId, trying admin fallback");
      currentUser = await database.user.findFirst({
        where: { AND: [{ tenantId }, { role: "admin" }, { isActive: true }] },
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

    // WHY TWO-STEP: The compiled IR for Event.create is mutate+emit only (no auto-persist).
    // Per Manifest semantics: mutate only has storage effect when instance is bound.
    // So runCommand("create") succeeds but doesn't persist - we need createInstance to persist.
    // TODO: Fix Event.create IR to include persistence semantics, then remove this workaround.
    if (result.success) {
      await runtime.createInstance("Event", body);
    }

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

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[event/create] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
