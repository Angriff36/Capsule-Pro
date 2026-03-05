// Auto-generated Next.js command handler for VendorCatalog.updateCost
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { auth } from "@repo/auth/server";
import { database, processVendorCostUpdate } from "@repo/database";
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
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const body = await request.json();

    console.log("[vendor-catalog/updateCost] Executing command:", {
      entityName: "VendorCatalog",
      command: "updateCost",
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
    });

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "VendorCatalog",
    });

    const result = await runtime.runCommand("updateCost", body, {
      entityName: "VendorCatalog",
    });

    if (!result.success) {
      console.error("[vendor-catalog/updateCost] Command failed:", {
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

    // Process cost updates to related inventory items and recipes
    // This is a designated bypass - mechanical updates from a governed source
    const catalogEntryId = body.id || result.result?.id;
    if (catalogEntryId && body.newBaseUnitCost !== undefined) {
      try {
        const costUpdateResult = await processVendorCostUpdate(database, {
          catalogEntryId,
          oldCost: body.oldCost ?? 0,
          newCost: body.newBaseUnitCost,
          tenantId,
          userId: currentUser.id,
          reason: body.reason ?? "Vendor catalog price update",
        });

        console.log(
          "[vendor-catalog/updateCost] Cost propagation complete:",
          costUpdateResult
        );

        // Include cost propagation results in the response
        return manifestSuccessResponse({
          result: {
            ...result.result,
            costPropagation: costUpdateResult,
          },
          events: result.emittedEvents,
        });
      } catch (costUpdateError) {
        console.error(
          "[vendor-catalog/updateCost] Cost propagation failed:",
          costUpdateError
        );
        captureException(costUpdateError);

        // Return success but warn about cost propagation failure
        return manifestSuccessResponse({
          result: {
            ...result.result,
            costPropagationError:
              "Failed to propagate costs to inventory items and recipes",
          },
          events: result.emittedEvents,
        });
      }
    }

    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    console.error("[vendor-catalog/updateCost] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
