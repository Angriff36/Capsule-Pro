// Knowledge Base Delete Command Handler
// Soft deletes a knowledge base entry through the Manifest runtime

import { auth } from "@repo/auth/server";
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
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();

    if (!body.id) {
      return manifestErrorResponse("Entry ID is required", 400);
    }

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
    });

    const result = await runtime.runCommand(
      "delete",
      {
        deletedBy: userId,
        reason: body.reason ?? "Deleted by user",
      },
      {
        entityName: "KnowledgeEntry",
        id: body.id,
      }
    );

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName}`,
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
    console.error("Error executing KnowledgeEntry.delete:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
