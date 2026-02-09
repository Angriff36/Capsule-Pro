import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { OverrideRequest } from "@repo/manifest";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Override authorization request body
 */
interface OverrideAuthorizationRequest {
  /** Constraint code being overridden */
  constraintCode: string;
  /** Reason for the override */
  reason: string;
  /** Additional details for the override */
  details?: string;
  /** The command being executed with this override */
  command: string;
  /** Entity type being operated on */
  entityType: string;
  /** Entity ID being operated on */
  entityId: string;
}

/**
 * POST /api/kitchen/overrides
 * Authorize and record an override for a blocking constraint
 */
export async function POST(request: Request) {
  const { orgId, userId: clerkId } = await auth();

  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body: OverrideAuthorizationRequest = await request.json();

  const { constraintCode, reason, details, command, entityType, entityId } =
    body;

  // Validate required fields
  if (!(constraintCode && reason && command && entityType && entityId)) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get current user by Clerk ID
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: clerkId }],
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Check if user has permission to override
  // Users can override if they are:
  // 1. Managers (role = "manager" or "admin")
  // 2. Have explicit override permission
  const userRole = currentUser.role || "kitchen_staff";
  const canOverride =
    userRole === "manager" ||
    userRole === "admin" ||
    userRole === "kitchen_manager";

  if (!canOverride) {
    return NextResponse.json(
      {
        message:
          "You don't have permission to override constraints. Please contact a manager.",
        requiresManager: true,
      },
      { status: 403 }
    );
  }

  // Create the override request
  const overrideRequest: OverrideRequest = {
    constraintCode,
    reason: details ? `${reason}: ${details}` : reason,
    authorizedBy: currentUser.id,
    timestamp: Date.now(),
  };

  // Record the override in the audit table
  try {
    await database.overrideAudit.create({
      data: {
        tenantId,
        entityType,
        entityId,
        constraintId: constraintCode,
        guardExpression: "", // Would be populated from constraint outcome
        overriddenBy: currentUser.id,
        overrideReason: details ? `${reason}: ${details}` : reason,
        authorizedBy: currentUser.id,
        authorizedAt: new Date(),
      },
    });
  } catch (error) {
    // If the table doesn't exist yet, just log and continue
    console.warn("Override audit table not available:", error);
  }

  // Create outbox event for the override
  try {
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: entityType,
        aggregateId: entityId,
        eventType: "kitchen.constraint.overridden",
        payload: {
          constraintCode,
          reason: details ? `${reason}: ${details}` : reason,
          authorizedBy: currentUser.id,
          authorizedByName:
            `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
          command,
          timestamp: overrideRequest.timestamp,
        },
        status: "pending" as const,
      },
    });
  } catch (error) {
    console.warn("Outbox event creation failed:", error);
  }

  return NextResponse.json({
    success: true,
    override: {
      constraintCode,
      reason: details ? `${reason}: ${details}` : reason,
      authorizedBy: currentUser.id,
      authorizedByName:
        `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
      timestamp: overrideRequest.timestamp,
    },
  });
}

/**
 * GET /api/kitchen/overrides
 * Get override audit history for an entity
 */
export async function GET(request: Request) {
  const { orgId, userId: clerkId } = await auth();

  if (!(orgId && clerkId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  if (!(entityType && entityId)) {
    return NextResponse.json(
      { message: "entityType and entityId are required" },
      { status: 400 }
    );
  }

  try {
    const overrides = await database.overrideAudit.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ overrides });
  } catch (error) {
    // If the table doesn't exist yet, return empty array
    console.warn("Override audit table not available:", error);
    return NextResponse.json({ overrides: [] });
  }
}
