/**
 * Cycle Count Session Detail API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions/[sessionId]      - Get a single session
 * PUT    /api/inventory/cycle-count/sessions/[sessionId]      - Start a session (manifest command)
 * DELETE /api/inventory/cycle-count/sessions/[sessionId]      - Cancel a session (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

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
 * GET /api/inventory/cycle-count/sessions/[sessionId] - Get a single session
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

    const { sessionId } = await context.params;

    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id: sessionId,
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
 * PUT /api/inventory/cycle-count/sessions/[sessionId] - Start a session
 */
// TODO: This maps to CycleCountSession.start but the old route handled multiple status transitions (start/complete/finalize/cancel). Consider routing to the appropriate command based on body.status.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  console.log("[CycleCountSession/PUT] Delegating to manifest start command", {
    sessionId,
  });
  return executeManifestCommand(request, {
    entityName: "CycleCountSession",
    commandName: "start",
    params: { sessionId },
    transformBody: (body) => ({ ...body, id: sessionId }),
  });
}

/**
 * DELETE /api/inventory/cycle-count/sessions/[sessionId] - Cancel a session
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  console.log(
    "[CycleCountSession/DELETE] Delegating to manifest cancel command",
    { sessionId }
  );
  return executeManifestCommand(request, {
    entityName: "CycleCountSession",
    commandName: "cancel",
    params: { sessionId },
    transformBody: (_body) => ({ id: sessionId }),
  });
}
