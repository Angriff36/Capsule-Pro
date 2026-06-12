import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException, logger } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * Override authorization request body
 */
interface OverrideAuthorizationRequest {
  /** The command being executed with this override */
  command: string;
  /** Constraint code being overridden */
  constraintCode: string;
  /** Additional details for the override */
  details?: string;
  /** Entity ID being operated on */
  entityId: string;
  /** Entity type being operated on */
  entityType: string;
  /** Reason for the override */
  reason: string;
}

/**
 * POST /api/kitchen/overrides
 * Authorize and record an override for a blocking constraint via Manifest runtime.
 * The governed write (OverrideAudit.create) routes through Manifest;
 * the outbox event is a fire-and-forget side-effect.
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

  // Get current user by Clerk ID (read per §10)
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

  // Check if user has permission to override (read per §10)
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

  // Delegate governed write to Manifest runtime
  const overrideReason = details ? `${reason}: ${details}` : reason;
  const timestamp = Date.now();

  const result = await runManifestCommand({
    entity: "OverrideAudit",
    command: "create",
    body: {
      entityType,
      entityId,
      constraintId: constraintCode,
      guardExpression: "",
      overriddenBy: currentUser.id,
      overrideReason,
      authorizedBy: currentUser.id,
    },
    user: { id: currentUser.id, tenantId, role: userRole },
  });

  // Determine if the governed write succeeded
  const auditLogged = result.status >= 200 && result.status < 300;

  if (!auditLogged) {
    captureException(
      new Error(`Override audit Manifest command failed: ${result.status}`)
    );
  }

  // Fire-and-forget outbox event (infrastructure side-effect, not governed)
  if (auditLogged) {
    try {
      await database.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: entityType,
          aggregateId: entityId,
          eventType: "kitchen.constraint.overridden",
          payload: {
            constraintCode,
            reason: overrideReason,
            authorizedBy: currentUser.id,
            authorizedByName:
              `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
            command,
            timestamp,
          },
          status: "pending" as const,
        },
      });
    } catch (error) {
      captureException(error);
      logger.error("Override outbox event failed", {
        error: String(error),
        constraintCode,
        entityType,
        entityId,
        overriddenBy: currentUser.id,
      });
    }
  }

  return NextResponse.json({
    success: true,
    auditLogged,
    override: {
      constraintCode,
      reason: overrideReason,
      authorizedBy: currentUser.id,
      authorizedByName:
        `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
      timestamp,
    },
  });
}

/**
 * GET /api/kitchen/overrides
 * Get override audit history for an entity (read — bypasses Manifest per §10).
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
    captureException(error);
    // If the table doesn't exist yet, return empty array
    logger.warn("Override audit table not available", { error: String(error) });
    return NextResponse.json({ overrides: [] });
  }
}
