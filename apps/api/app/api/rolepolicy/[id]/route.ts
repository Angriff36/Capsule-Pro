/**
 * Role Policy Detail API Endpoint
 *
 * GET /api/rolepolicy/:id - Get a single role policy by ID
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";

/**
 * GET /api/rolepolicy/:id
 * Get a single role policy by ID
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 400 });
    }

    const { id } = await context.params;

    const policy = await database.rolePolicy.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ message: "Role policy not found" }, { status: 404 });
    }

    if (policy.deletedAt) {
      return NextResponse.json({ message: "Role policy not found" }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("[RolePolicy/detail] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch role policy" },
      { status: 500 }
    );
  }
}
