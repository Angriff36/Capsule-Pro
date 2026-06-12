// Auto-generated Next.js API route for RecipeIngredient
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const recipeIngredients = await database.recipeIngredient.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!recipeIngredients) {
      return manifestErrorResponse("Not found", 404);
    }

    return manifestSuccessResponse({ recipeIngredients });
  } catch (error) {
    log.error("Error fetching recipeIngredients:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
