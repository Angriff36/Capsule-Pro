// Auto-generated Next.js API detail route for Dish
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
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

    const dish = await database.dish.findUnique({
      where: {
        tenantId_id: { tenantId, id },
      },
    });

    if (!dish) {
      return manifestErrorResponse("Dish not found", 404);
    }

    return manifestSuccessResponse({ dish });
  } catch (error) {
    console.error("Error fetching dish:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
