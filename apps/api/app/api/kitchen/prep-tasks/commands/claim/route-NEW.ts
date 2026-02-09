// Auto-generated Next.js command handler for PrepTask.claim
// Generated from Manifest IR - DO NOT EDIT
// Writes MUST flow through runtime.runCommand() to enforce guards, policies, and constraints

import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user?.id) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    const userId = user.id;

    const userMapping = await database.userTenantMapping.findUnique({
      where: { userId },
    });

    if (!userMapping) {
      return manifestErrorResponse("User not mapped to tenant", 400);
    }

    const { tenantId } = userMapping;

    const body = await request.json();

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
    });
    const result = await runtime.runCommand("claim", body, {
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
    console.error("Error executing PrepTask.claim:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
