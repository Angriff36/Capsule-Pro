/**
 * API endpoint for listing board templates
 * 
 * NOTE: CommandBoard model does not have shareId, isPublic fields.
 * This endpoint returns 501 Not Implemented until the model is updated.
 */

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // TODO: Implement when CommandBoard model has:
    // - shareId field
    // - isPublic field
    
    return manifestSuccessResponse({ 
      templates: [],
      message: "Template listing not yet implemented - CommandBoard model needs shareId and isPublic fields"
    });
  } catch (error) {
    console.error("Error fetching board templates:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
