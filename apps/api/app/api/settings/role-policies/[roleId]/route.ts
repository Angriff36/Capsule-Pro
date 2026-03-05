/**
 * RolePolicy Detail API Routes
 *
 * GET /api/settings/role-policies/[roleId] - Get a specific role policy
 * PATCH /api/settings/role-policies/[roleId] - Update a role policy (admin only)
 * DELETE /api/settings/role-policies/[roleId] - Delete a role policy (admin only)
 */

import { auth } from "@clerk/nextjs/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/current-user";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type RouteContext = {
  params: Promise<{ roleId: string }>;
};

/**
 * GET /api/settings/role-policies/[roleId]
 * Get a specific role policy
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const authUser = await auth();
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg();
    const { roleId } = await context.params;

    const rolePolicy = await database.rolePolicy.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: roleId,
        },
      },
    });

    if (!rolePolicy) {
      return NextResponse.json(
        { error: "Role policy not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rolePolicy: {
        id: rolePolicy.id,
        roleId: rolePolicy.roleId,
        roleName: rolePolicy.roleName,
        permissions: Array.isArray(rolePolicy.permissions)
          ? rolePolicy.permissions
          : typeof rolePolicy.permissions === "string"
            ? JSON.parse(rolePolicy.permissions)
            : [],
        description: rolePolicy.description,
        isActive: rolePolicy.isActive,
        createdAt: rolePolicy.createdAt,
        updatedAt: rolePolicy.updatedAt,
      },
    });
  } catch (error) {
    log.error("Failed to fetch role policy", { error });
    return NextResponse.json(
      { error: "Failed to fetch role policy" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/settings/role-policies/[roleId]
 * Update a role policy (admin only)
 *
 * Body:
 * {
 *   permissions?: string[]
 *   description?: string
 *   isActive?: boolean
 * }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const authUser = await auth();
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg();
    const { roleId } = await context.params;
    const currentUser = await requireCurrentUser();

    // Check if user is admin
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update role policies" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permissions, description, isActive } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (Array.isArray(permissions)) {
      updateData.permissions = permissions;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update the role policy
    const rolePolicy = await database.rolePolicy.update({
      where: {
        tenantId_id: {
          tenantId,
          id: roleId,
        },
      },
      data: updateData as any,
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
    log.error("Failed to update role policy", { error });
    return NextResponse.json(
      { error: "Failed to update role policy" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/settings/role-policies/[roleId]
 * Delete a role policy (admin only)
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const authUser = await auth();
    if (!authUser?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg();
    const { roleId } = await context.params;
    const currentUser = await requireCurrentUser();

    // Check if user is admin
    if (currentUser.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete role policies" },
        { status: 403 }
      );
    }

    // Soft delete the role policy
    const rolePolicy = await database.rolePolicy.update({
      where: {
        tenantId_id: {
          tenantId,
          id: roleId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Failed to delete role policy", { error });
    return NextResponse.json(
      { error: "Failed to delete role policy" },
      { status: 500 }
    );
  }
}
