/**
 * Payroll Periods API Endpoints
 *
 * GET    /api/payroll/periods      - List payroll periods with pagination and filters
 * POST   /api/payroll/periods      - Create a new payroll period
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type PayrollPeriodStatus = "open" | "closed" | "processing";

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

/**
 * GET /api/payroll/periods - List payroll periods
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
    const offset = (page - 1) * limit;

    // Parse filters
    const status = searchParams.get("status") as PayrollPeriodStatus | null;

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    // Get total count for pagination
    const total = await database.$queryRaw<
      { count: bigint }[]
    >(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.payroll_periods
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
      `
    );

    const totalCount = Number(total[0]?.count ?? 0);

    // Get periods with pagination
    const periods = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        period_start: Date;
        period_end: Date;
        status: PayrollPeriodStatus;
        created_at: Date;
        updated_at: Date;
      }[]
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          period_start,
          period_end,
          status,
          created_at,
          updated_at
        FROM tenant_staff.payroll_periods
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
        ORDER BY period_start DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    const mappedPeriods = periods.map((period) => ({
      id: period.id,
      tenantId: period.tenant_id,
      periodStart: period.period_start,
      periodEnd: period.period_end,
      status: period.status,
      createdAt: period.created_at,
      updatedAt: period.updated_at,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: mappedPeriods,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to list payroll periods:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payroll/periods - Create a new payroll period
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
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

    const body = await request.json();

    if (!body.periodStart || !body.periodEnd) {
      throw new InvariantError("periodStart and periodEnd are required");
    }

    const startDate = new Date(body.periodStart);
    const endDate = new Date(body.periodEnd);

    if (startDate >= endDate) {
      throw new InvariantError("periodStart must be before periodEnd");
    }

    // Check for reasonable date range (max 31 days)
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 31) {
      throw new InvariantError("Payroll period cannot exceed 31 days");
    }

    // Create payroll period
    const period = await database.$queryRaw<
      { id: string; tenant_id: string; period_start: Date; period_end: Date; status: string; created_at: Date; updated_at: Date }[]
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.payroll_periods (tenant_id, period_start, period_end, status)
        VALUES (${tenantId}, ${startDate}, ${endDate}, 'open')
        RETURNING id, tenant_id, period_start, period_end, status, created_at, updated_at
      `
    );

    if (!period[0]) {
      throw new Error("Failed to create payroll period");
    }

    const mappedPeriod = {
      id: period[0].id,
      tenantId: period[0].tenant_id,
      periodStart: period[0].period_start,
      periodEnd: period[0].period_end,
      status: period[0].status as PayrollPeriodStatus,
      createdAt: period[0].created_at,
      updatedAt: period[0].updated_at,
    };

    return NextResponse.json(mappedPeriod, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create payroll period:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
