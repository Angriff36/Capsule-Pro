/**
 * RolePolicy API Routes
 *
 * GET /api/settings/role-policies - List all role policies for the tenant
 * POST /api/settings/role-policies - Create a new role policy (admin only)
 */

import { auth } from "@clerk/nextjs/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/current-user";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/settings/role-policies
 * List all role policies for the current tenant
 */
export async function GET(request: Request) {
  try {
    const authUser = await auth();
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg();
    const currentUser = await requireCurrentUser();

    // Fetch role policies from database
    const rolePolicies = await database.rolePolicy.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        roleName: "asc",
      },
    });

    // Parse permissions JSON
    const policies = rolePolicies.map((policy) => ({
      id: policy.id,
      roleId: policy.roleId,
      roleName: policy.roleName,
      permissions: Array.isArray(policy.permissions)
        ? policy.permissions
        : typeof policy.permissions === "string"
          ? JSON.parse(policy.permissions)
          : [],
      description: policy.description,
      isActive: policy.isActive,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));

    return NextResponse.json({ rolePolicies: policies });
  } catch (error) {
    log.error("Failed to fetch role policies", { error });
    return NextResponse.json(
      { error: "Failed to fetch role policies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/role-policies
 * Create a new role policy (admin only)
 *
 * Body:
 * {
 *   roleId: string
 *   roleName: string
 *   permissions: string[]
 *   description?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const authUser = await auth();
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg();
    const currentUser = await requireCurrentUser();

    // Check if user is admin
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create role policies" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { roleId, roleName, permissions, description } = body;

    if (!(roleId && roleName && Array.isArray(permissions))) {
      return NextResponse.json(
        {
          error:
            "Invalid request: roleId, roleName, and permissions (array) are required",
        },
        { status: 400 }
      );
    }

    // Check if a policy already exists for this role
    const existing = await database.rolePolicy.findUnique({
      where: {
        tenantId_roleId: {
          tenantId,
          roleId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Role policy already exists for this role" },
        { status: 409 }
      );
    }

    // Create the role policy
    const rolePolicy = await database.rolePolicy.create({
      data: {
        tenantId,
        roleId,
        roleName,
        permissions: permissions as any, // Json type
        description: description || "",
        isActive: true,
      },
    });

    return NextResponse.json({
      rolePolicy: {
        id: rolePolicy.id,
        roleId: rolePolicy.roleId,
        roleName: rolePolicy.roleName,
        permissions: Array.isArray(rolePolicy.permissions)
          ? rolePolicy.permissions
          : [],
        description: rolePolicy.description,
        isActive: rolePolicy.isActive,
        createdAt: rolePolicy.createdAt,
        updatedAt: rolePolicy.updatedAt,
      },
    });
  } catch (error) {
    log.error("Failed to create role policy", { error });
    return NextResponse.json(
      { error: "Failed to create role policy" },
      { status: 500 }
    );
  }
}
