/**
 * RolePolicy Permissions API Routes
 *
 * POST /api/settings/role-policies/[roleId]/permissions/grant - Grant a permission
 * POST /api/settings/role-policies/[roleId]/permissions/revoke - Revoke a permission
 */

import { auth } from "@clerk/nextjs/server";
import { database } from "@repo/database";
import { invalidatePermissionCache } from "@repo/manifest-adapters";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

type RouteContext = {
  params: Promise<{ roleId: string }>;
};

/**
 * POST /api/settings/role-policies/[roleId]/permissions/grant
 * Grant a permission to a role policy (admin only)
 *
 * Body:
 * {
 *   permission: string
 * }
 */
export async function POST_grant(request: Request, context: RouteContext) {
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
        { error: "Forbidden: Only admins can grant permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission } = body;

    if (!permission || typeof permission !== "string") {
      return NextResponse.json(
        { error: "Invalid request: permission (string) is required" },
        { status: 400 }
      );
    }

    // Get current role policy
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

    // Parse current permissions
    const currentPermissions = Array.isArray(rolePolicy.permissions)
      ? rolePolicy.permissions
      : typeof rolePolicy.permissions === "string"
        ? JSON.parse(rolePolicy.permissions)
        : [];

    // Check if permission already exists
    if (currentPermissions.includes(permission)) {
      return NextResponse.json(
        { error: "Permission already granted" },
        { status: 409 }
      );
    }

    // Add permission
    const updatedPermissions = [...currentPermissions, permission];

    const updated = await database.rolePolicy.update({
      where: {
        tenantId_id: {
          tenantId,
          id: roleId,
        },
      },
      data: {
        permissions: updatedPermissions as any,
      },
    });

    // Invalidate cache
    invalidatePermissionCache(tenantId);

    return NextResponse.json({
      rolePolicy: {
        id: updated.id,
        roleId: updated.roleId,
        roleName: updated.roleName,
        permissions: updatedPermissions,
        description: updated.description,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    log.error("Failed to grant permission", { error });
    return NextResponse.json(
      { error: "Failed to grant permission" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/role-policies/[roleId]/permissions/revoke
 * Revoke a permission from a role policy (admin only)
 *
 * Body:
 * {
 *   permission: string
 * }
 */
export async function POST_revoke(request: Request, context: RouteContext) {
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
        { error: "Forbidden: Only admins can revoke permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission } = body;

    if (!permission || typeof permission !== "string") {
      return NextResponse.json(
        { error: "Invalid request: permission (string) is required" },
        { status: 400 }
      );
    }

    // Get current role policy
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

    // Parse current permissions
    const currentPermissions = Array.isArray(rolePolicy.permissions)
      ? rolePolicy.permissions
      : typeof rolePolicy.permissions === "string"
        ? JSON.parse(rolePolicy.permissions)
        : [];

    // Check if permission exists
    if (!currentPermissions.includes(permission)) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    // Remove permission
    const updatedPermissions = currentPermissions.filter(
      (p: string) => p !== permission
    );

    const updated = await database.rolePolicy.update({
      where: {
        tenantId_id: {
          tenantId,
          id: roleId,
        },
      },
      data: {
        permissions: updatedPermissions as any,
      },
    });

    // Invalidate cache
    invalidatePermissionCache(tenantId);

    return NextResponse.json({
      rolePolicy: {
        id: updated.id,
        roleId: updated.roleId,
        roleName: updated.roleName,
        permissions: updatedPermissions,
        description: updated.description,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    log.error("Failed to revoke permission", { error });
    return NextResponse.json(
      { error: "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
