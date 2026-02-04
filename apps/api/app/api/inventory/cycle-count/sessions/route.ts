/**
 * Cycle Count Sessions API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions      - List sessions with pagination and filters
 * POST   /api/inventory/cycle-count/sessions      - Create a new cycle count session
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

function validateSessionInput(body: Record<string, unknown>): asserts body is {
  session_name: string;
  location_id: string;
  count_type: string;
  scheduled_date?: string;
  notes?: string;
} {
  if (!body.session_name || typeof body.session_name !== "string") {
    throw new InvariantError("session_name is required and must be a string");
  }

  if (!body.location_id || typeof body.location_id !== "string") {
    throw new InvariantError("location_id is required and must be a string");
  }

  if (!body.count_type || typeof body.count_type !== "string") {
    throw new InvariantError("count_type is required and must be a string");
  }

  const validCountTypes: CycleCountSessionType[] = [
    "ad_hoc",
    "scheduled_daily",
    "scheduled_weekly",
    "scheduled_monthly",
  ];

  if (!validCountTypes.includes(body.count_type as CycleCountSessionType)) {
    throw new InvariantError(
      `count_type must be one of: ${validCountTypes.join(", ")}`
    );
  }
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
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    validateSessionInput(body);

    // Get the user's database ID
    const user = await database.user.findFirst({
      where: {
        tenantId,
        authUserId: userId,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Create cycle count session
    const session = await database.cycleCountSession.create({
      data: {
        tenantId,
        locationId: body.location_id,
        sessionId: crypto.randomUUID(),
        sessionName: body.session_name,
        countType: body.count_type,
        scheduledDate: body.scheduled_date
          ? new Date(body.scheduled_date)
          : null,
        notes: body.notes || null,
        createdById: user.id,
        totalItems: 0,
        countedItems: 0,
        totalVariance: 0,
        variancePercentage: 0,
      },
    });

    const mappedSession = {
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
    };

    return NextResponse.json(mappedSession, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
