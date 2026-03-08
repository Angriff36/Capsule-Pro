/**
 * Role Policy List API Endpoint
 *
 * GET /api/rolepolicy/list - List all role policies for the tenant
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/rolepolicy/list
 * List all role policies with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50", 10), 100);
    const isActive = searchParams.get("isActive");
    const offset = (page - 1) * limit;

    // Build whereClause
    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (isActive !== null && isActive !== undefined) {
      whereClause.isActive = isActive === "true";
    }

    // Fetch role policies
    const policies = await database.rolePolicy.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await database.rolePolicy.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      policies,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error("[RolePolicy/list] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch role policies" },
      { status: 500 }
    );
  }
}
