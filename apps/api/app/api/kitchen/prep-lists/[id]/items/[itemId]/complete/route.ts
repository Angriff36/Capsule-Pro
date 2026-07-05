// Prep list item completion endpoint for mobile kitchen app
// Handles both marking completed and uncompleted based on request body

import { auth } from "@repo/auth/server";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface CompleteRequestBody {
  completed: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { itemId } = await params;
    const body: CompleteRequestBody = await request.json();
    const { completed } = body;

    if (typeof completed !== "boolean") {
      return manifestErrorResponse("completed (boolean) is required", 400);
    }

    // completed_by is a uuid (employee id) column, and the runtime records
    // the actor identity — the raw Clerk id ("user_…") both fails the Postgres
    // cast with a 500 (22P02) and misattributes the actor.
    const employeeId = (await requireCurrentUser()).id;

    const runtime = await createManifestRuntime({
      user: { id: employeeId, tenantId },
      entityName: "PrepListItem",
    });

    // Choose command based on completion state
    const commandName = completed ? "markCompleted" : "markUncompleted";
    const commandBody = completed
      ? { id: itemId, completedByUserId: employeeId }
      : { id: itemId };

    const result = await runtime.runCommand(commandName, commandBody, {
      entityName: "PrepListItem",
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
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
