/**
 * Cycle Count Sessions API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions      - List sessions with pagination and filters
 * POST   /api/inventory/cycle-count/sessions      - Create a new cycle count session (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type CycleCountSessionType =
  | "ad_hoc"
  | "scheduled_daily"
  | "scheduled_weekly"
  | "scheduled_monthly";

type CycleCountSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "finalized"
  | "cancelled";

interface PaginationParams {
  page: number;
  limit: number;
}

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  return { page, limit };
}

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

/**
 * GET /api/inventory/cycle-count/sessions - List cycle count sessions
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    // Parse filters
    const status = searchParams.get("status");
    const countType = searchParams.get("countType");
    const locationId = searchParams.get("locationId");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (countType) {
      where.countType = countType;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    // Get total count for pagination
    const total = await database.cycleCountSession.count({ where });

    // Get sessions with pagination
    const sessions = await database.cycleCountSession.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const mappedSessions = sessions.map((session) => ({
      id: session.id,
      tenant_id: session.tenantId,
      location_id: session.locationId,
      session_id: session.sessionId,
      session_name: session.sessionName,
      count_type: session.countType as CycleCountSessionType,
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
    }));

    return NextResponse.json({
      data: mappedSessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list cycle count sessions:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/cycle-count/sessions - Create a new cycle count session
 */
export async function POST(request: NextRequest) {
  console.log("[CycleCountSession/POST] Delegating to manifest create command");
  return executeManifestCommand(request, {
    entityName: "CycleCountSession",
    commandName: "create",
  });
}
