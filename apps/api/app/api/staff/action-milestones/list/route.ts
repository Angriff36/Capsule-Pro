// Auto-generated Next.js API route for ActionMilestone
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@repo/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { auth } from "@repo/auth/server";

export async function GET(_request: NextRequest) {
  try {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    return manifestErrorResponse({ error: "Unauthorized", diagnostics: [] }, 401);
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    return manifestErrorResponse({ error: "Tenant not found", diagnostics: [] }, 400);
  }

const actionMilestones = await database.actionMilestone.findMany({
    where: {
        tenant_id: tenantId
      },
    orderBy: {
      created_at: "desc",
    },
  });

    return manifestSuccessResponse({ actionMilestones });
  } catch (error) {
    // Auth helpers (clerk, next-auth, custom) may throw on invalid/expired
    // tokens. Goal step 4: auth failures MUST NEVER surface as 500.
    const isAuthError = error instanceof Error && (
      /unauth/i.test(error.message) ||
      /token/i.test(error.message) ||
      /session/i.test(error.message)
    );
    if (isAuthError) {
      return manifestErrorResponse({ error: "Unauthorized", diagnostics: [] }, 401);
    }
    console.error("Error fetching actionMilestones:", error);
    return manifestErrorResponse(
      { error: "Internal server error", diagnostics: [{ kind: "runtime_error", message: error instanceof Error ? error.message : String(error) }] },
      500,
    );
  }
}
