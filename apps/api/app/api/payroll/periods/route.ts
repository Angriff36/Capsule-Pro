/**
 * Payroll Periods API Endpoints
 *
 * GET    /api/payroll/periods      - List payroll periods with pagination and filters
 * POST   /api/payroll/periods      - Create a new payroll period
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
    const total = await database.$queryRaw<{ count: bigint }[]>(
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
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "PayrollPeriod",
    commandName: "create",
    transformBody: (body) => ({
      periodStart: body.periodStart || "",
      periodEnd: body.periodEnd || "",
    }),
  });
}
