// List recipes with pagination clamps to prevent unbounded reads.
// Hand-maintained derivation of the manifest projection — pagination policy
// is centralized in `@/lib/pagination`. The matching change in
// packages/manifest-runtime/src/manifest/projections/nextjs/generator.ts
// will produce this pattern automatically the next time the
// @angriff36/manifest CLI is republished.

import type { NextRequest } from "next/server";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";

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

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const recipes = await database.recipe.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    return manifestSuccessResponse({ recipes, limit, offset });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
