/**
 * Inventory Audit Discrepancies API
 *
 * GET - List all discrepancies (variance reports with status 'pending' or 'reviewed')
 * Includes filtering by status, severity, item, date range and pagination
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export const runtime = "nodejs";

// Severity thresholds based on variance percentage
const SEVERITY_THRESHOLDS = {
  low: 5, // < 5% variance
  medium: 10, // 5-10% variance
  high: 20, // 10-20% variance
  critical: Number.POSITIVE_INFINITY, // > 20% variance
};

type DiscrepancyStatus = "pending" | "reviewed" | "approved" | "adjusted";
type DiscrepancySeverity = "low" | "medium" | "high" | "critical";

interface DiscrepancyListItem {
  id: string;
  tenantId: string;
  sessionId: string;
  reportType: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  variancePct: number;
  accuracyScore: number;
  status: DiscrepancyStatus;
  severity: DiscrepancySeverity;
  adjustmentType: string | null;
  adjustmentAmount: number | null;
  adjustmentDate: string | null;
  notes: string | null;
  rootCause: string | null;
  resolutionNotes: string | null;
  resolvedById: string | null;
  resolvedAt: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface DiscrepanciesQueryParams {
  status?: DiscrepancyStatus;
  severity?: DiscrepancySeverity;
  itemId?: string;
  sessionId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "variancePct" | "itemName";
  sortOrder?: "asc" | "desc";
}

function toNumber(
  value: { toNumber: () => number } | null | undefined
): number {
  if (!value) {
    return 0;
  }
  return value.toNumber();
}

function calculateSeverity(variancePct: number): DiscrepancySeverity {
  const absVariance = Math.abs(variancePct);
  if (absVariance < SEVERITY_THRESHOLDS.low) {
    return "low";
  }
  if (absVariance < SEVERITY_THRESHOLDS.medium) {
    return "medium";
  }
  if (absVariance < SEVERITY_THRESHOLDS.high) {
    return "high";
  }
  return "critical";
}

function buildWhereClause(
  tenantId: string,
  params: DiscrepanciesQueryParams,
  statusFilter: DiscrepancyStatus[]
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
    status: { in: statusFilter },
  };
  if (params.itemId) {
    where.itemId = params.itemId;
  }
  if (params.sessionId) {
    where.sessionId = params.sessionId;
  }
  if (params.dateFrom || params.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (params.dateFrom) {
      dateFilter.gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      dateFilter.lte = new Date(params.dateTo);
    }
    where.generatedAt = dateFilter;
  }
  if (params.search) {
    where.OR = [
      { itemName: { contains: params.search, mode: "insensitive" } },
      { itemNumber: { contains: params.search, mode: "insensitive" } },
    ];
  }
  return where;
}
interface VarianceReportRecord {
  id: string;
  tenantId: string;
  sessionId: string;
  reportType: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  expectedQuantity: { toNumber: () => number };
  countedQuantity: { toNumber: () => number };
  variance: { toNumber: () => number };
  variancePct: { toNumber: () => number };
  accuracyScore: { toNumber: () => number };
  status: string;
  adjustmentType: string | null;
  adjustmentAmount: { toNumber: () => number } | null;
  adjustmentDate: Date | null;
  notes: string | null;
  rootCause: string | null;
  resolutionNotes: string | null;
  resolvedById: string | null;
  resolvedAt: Date | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

function mapReportToDiscrepancy(
  report: VarianceReportRecord
): DiscrepancyListItem {
  const variancePct = toNumber(report.variancePct);
  return {
    id: report.id,
    tenantId: report.tenantId,
    sessionId: report.sessionId,
    reportType: report.reportType,
    itemId: report.itemId,
    itemNumber: report.itemNumber,
    itemName: report.itemName,
    expectedQuantity: toNumber(report.expectedQuantity),
    countedQuantity: toNumber(report.countedQuantity),
    variance: toNumber(report.variance),
    variancePct,
    accuracyScore: toNumber(report.accuracyScore),
    status: report.status as DiscrepancyStatus,
    severity: calculateSeverity(variancePct),
    adjustmentType: report.adjustmentType,
    adjustmentAmount: report.adjustmentAmount
      ? toNumber(report.adjustmentAmount)
      : null,
    adjustmentDate: report.adjustmentDate?.toISOString() ?? null,
    notes: report.notes,
    rootCause: report.rootCause,
    resolutionNotes: report.resolutionNotes,
    resolvedById: report.resolvedById,
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
    generatedAt: report.generatedAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
function parseQueryParams(searchParams: URLSearchParams): DiscrepanciesQueryParams {
  return {
    status: searchParams.get("status") as DiscrepancyStatus | undefined,
    severity: searchParams.get("severity") as DiscrepancySeverity | undefined,
    itemId: searchParams.get("itemId") ?? undefined,
    sessionId: searchParams.get("sessionId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10)),
    limit: Math.min(
      200,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "50", 10))
    ),
    sortBy:
      (searchParams.get("sortBy") as DiscrepanciesQueryParams["sortBy"]) ??
      "createdAt",
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? "desc",
  };
}
function getStatusFilter(status?: DiscrepancyStatus): DiscrepancyStatus[] {
  if (status) {
    return String(status)
      .split(",")
      .map((s) => s.trim()) as DiscrepancyStatus[];
  }
  return ["pending", "reviewed"];
}
async function fetchDiscrepancies(
  where: Record<string, unknown>,
  params: DiscrepanciesQueryParams
): Promise<DiscrepancyListItem[]> {
  const reports = await database.varianceReport.findMany({
    where,
    orderBy: { [params.sortBy ?? "createdAt"]: params.sortOrder ?? "desc" },
    skip: ((params.page ?? 1) - 1) * (params.limit ?? 50),
    take: params.limit ?? 50,
  });
  return reports.map(mapReportToDiscrepancy);
}
function filterBySeverity(
  discrepancies: DiscrepancyListItem[],
  severity?: DiscrepancySeverity
): DiscrepancyListItem[] {
  if (!severity) {
    return discrepancies;
  }
  return discrepancies.filter((d) => d.severity === severity);
}
function calculateSummary(
  discrepancies: DiscrepancyListItem[],
  where: Record<string, unknown>
) {
  return {
    byStatus: {
      pending: database.varianceReport.count({
        where: { ...where, status: "pending" },
      }),
      reviewed: database.varianceReport.count({
        where: { ...where, status: "reviewed" },
      }),
    },
    bySeverity: {
      low: discrepancies.filter((d) => d.severity === "low").length,
      medium: discrepancies.filter((d) => d.severity === "medium").length,
      high: discrepancies.filter((d) => d.severity === "high").length,
      critical: discrepancies.filter((d) => d.severity === "critical").length,
    },
    totalVarianceValue: discrepancies.reduce((sum, d) => sum + d.variance, 0),
  };
}
/**
 * GET /api/inventory/audit/discrepancies
 * List all discrepancies with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }
    const { searchParams } = new URL(request.url);
    const params = parseQueryParams(searchParams);
    const statusFilter = getStatusFilter(params.status);
    const where = buildWhereClause(tenantId, params, statusFilter);
    const total = await database.varianceReport.count({ where });
    const totalPages = Math.ceil(total / (params.limit ?? 50));
    const discrepancies = await fetchDiscrepancies(where, params);
    const filteredDiscrepancies = filterBySeverity(discrepancies, params.severity);
    const summary = await calculateSummary(discrepancies, where);
    return manifestSuccessResponse({
      discrepancies: filteredDiscrepancies,
      pagination: {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        total,
        totalPages,
        hasMore: (params.page ?? 1) < totalPages,
      },
      summary,
    });
  } catch (error) {
    console.error("[discrepancies/list] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
