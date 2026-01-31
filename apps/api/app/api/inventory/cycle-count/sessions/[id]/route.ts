/**
 * Cycle Count Session Detail API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions/[id]      - Get a single session
 * PUT    /api/inventory/cycle-count/sessions/[id]      - Update a session
 * DELETE /api/inventory/cycle-count/sessions/[id]      - Delete a session (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Map cycle count session to response format
 */
function mapSession(session: {
  id: string;
  tenantId: string;
  locationId: string;
  sessionId: string;
  sessionName: string;
  countType: string;
  scheduledDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  finalizedAt: Date | null;
  status: string;
  totalItems: number;
  countedItems: number;
  totalVariance: { toNumber: () => number };
  variancePercentage: { toNumber: () => number };
  notes: string | null;
  createdById: string;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    id: session.id,
    tenant_id: session.tenantId,
    location_id: session.locationId,
    session_id: session.sessionId,
    session_name: session.sessionName,
    count_type: session.countType,
    scheduled_date: session.scheduledDate,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    finalized_at: session.finalizedAt,
    status: session.status as CycleCountSessionStatus,
    total_items: session.totalItems,
    counted_items: session.countedItems,
    total_variance: toNumber(session.totalVariance),
    variance_percentage: toNumber(session.variancePercentage),
    notes: session.notes,
    created_by_id: session.createdById,
    approved_by_id: session.approvedById,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    deleted_at: session.deletedAt,
  };
}

/**
 * Build update data for session
 */
function buildSessionUpdateData(
  body: Record<string, unknown>,
  existing: {
    startedAt: Date | null;
    completedAt: Date | null;
    finalizedAt: Date | null;
  }
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (body.session_name !== undefined) {
    if (typeof body.session_name !== "string") {
      throw new InvariantError("session_name must be a string");
    }
    updateData.sessionName = body.session_name;
  }

  if (body.status !== undefined) {
    const validStatuses: CycleCountSessionStatus[] = [
      "draft",
      "in_progress",
      "completed",
      "finalized",
      "cancelled",
    ];

    if (!validStatuses.includes(body.status as CycleCountSessionStatus)) {
      throw new InvariantError(
        `status must be one of: ${validStatuses.join(", ")}`
      );
    }

    updateData.status = body.status;

    if (body.status === "in_progress" && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if (body.status === "completed" && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    if (body.status === "finalized" && !existing.finalizedAt) {
      updateData.finalizedAt = new Date();
    }
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string") {
      throw new InvariantError("notes must be a string");
    }
    updateData.notes = body.notes;
  }

  if (body.approved_by_id !== undefined) {
    if (typeof body.approved_by_id !== "string") {
      throw new InvariantError("approved_by_id must be a string");
    }
    updateData.approvedById = body.approved_by_id;
  }

  return updateData;
}

/**
 * GET /api/inventory/cycle-count/sessions/[id] - Get a single session
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!session) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapSession(session));
  } catch (error) {
    console.error("Failed to get cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/cycle-count/sessions/[id] - Update a session
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    const updateData = buildSessionUpdateData(body, existing);

    const session = await database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    return NextResponse.json(mapSession(session));
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/cycle-count/sessions/[id] - Soft delete a session
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { id } = await context.params;

    // Check if session exists
    const existing = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    await database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Session deleted" });
  } catch (error) {
    console.error("Failed to delete cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
