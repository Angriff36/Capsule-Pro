// Shadow endpoint for evaluating generated Manifest command handling.
// This route is intentionally separate from the production claim endpoint.

import { auth } from "@repo/auth/server";
import type { NextRequest, RouteContext } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/kitchen/tasks/[id]/claim-shadow-manifest">
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const {
      userId: _bodyUserId,
      id: _bodyId,
      tenantId: _bodyTenantId,
      orgId: _bodyOrgId,
      user: _bodyUser,
      ...payloadBody
    } = body;
    const payload = { ...payloadBody, id, userId };

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
    });

    const result = await runtime.runCommand("claim", payload, {
      entityName: "PrepTask",
    });

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
    console.error("Error executing shadow PrepTask.claim:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
