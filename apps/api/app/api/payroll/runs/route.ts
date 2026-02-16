/**
 * Payroll Runs API Endpoints
 *
 * GET    /api/payroll/runs              - List payroll runs with pagination and filters
 * GET    /api/payroll/runs/[runId]      - Get details of a specific payroll run
 * PUT    /api/payroll/runs/[runId]      - Update payroll run (approve, finalize)
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "failed";

const _UpdatePayrollRunSchema = z.object({
  status: z
    .enum(["pending", "processing", "completed", "approved", "paid", "failed"])
    .optional(),
});

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
 * GET /api/payroll/runs - List payroll runs
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
    const status = searchParams.get("status") as PayrollRunStatus | null;
    const periodId = searchParams.get("periodId") || null;

    // Get total count for pagination
    const total = await database.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) as count
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
          ${periodId ? Prisma.sql`AND payroll_period_id = ${periodId}::uuid` : Prisma.empty}
      `
    );

    const totalCount = Number(total[0]?.count ?? 0);

    // Get runs with pagination
    const runs = await database.$queryRaw<
      {
        id: string;
        tenant_id: string;
        payroll_period_id: string;
        run_date: Date;
        status: PayrollRunStatus;
        total_gross: number;
        total_deductions: number;
        total_net: number;
        approved_by: string | null;
        approved_at: Date | null;
        paid_at: Date | null;
        created_at: Date;
        updated_at: Date;
      }[]
    >(
      Prisma.sql`
        SELECT
          id,
          tenant_id,
          payroll_period_id,
          run_date,
          status,
          total_gross,
          total_deductions,
          total_net,
          approved_by,
          approved_at,
          paid_at,
          created_at,
          updated_at
        FROM tenant_staff.payroll_runs
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          ${status ? Prisma.sql`AND status = ${status}` : Prisma.empty}
          ${periodId ? Prisma.sql`AND payroll_period_id = ${periodId}::uuid` : Prisma.empty}
        ORDER BY run_date DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `
    );

    const mappedRuns = runs.map((run) => ({
      id: run.id,
      tenantId: run.tenant_id,
      payrollPeriodId: run.payroll_period_id,
      runDate: run.run_date,
      status: run.status,
      totalGross: Number(run.total_gross),
      totalDeductions: Number(run.total_deductions),
      totalNet: Number(run.total_net),
      approvedBy: run.approved_by,
      approvedAt: run.approved_at,
      paidAt: run.paid_at,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: mappedRuns,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to list payroll runs:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
