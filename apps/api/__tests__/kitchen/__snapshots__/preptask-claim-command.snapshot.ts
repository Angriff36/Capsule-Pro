// Auto-generated Next.js command handler for PrepTask.claim
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import { NextRequest } from "next/server";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { manifestSuccessResponse, manifestErrorResponse } from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    // Auth disabled - all requests allowed
    const userId = "anonymous";

    const body = await request.json();

    const runtime = await createManifestRuntime({ user: { id: userId, tenantId: "__no_tenant__" } });
    const result = await runtime.runCommand("claim", body, {
      entityName: "PrepTask",
    });

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(`Access denied: ${result.policyDenial.policyName}`, 403);
      }
      if (result.guardFailure) {
        return manifestErrorResponse(`Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`, 422);
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({ result: result.result, events: result.emittedEvents });
  } catch (error) {
    console.error("Error executing PrepTask.claim:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
