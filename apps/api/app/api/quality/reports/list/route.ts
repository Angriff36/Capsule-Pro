// Quality Reports API route
// Lists all quality control reports for the current tenant

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("reportType");
    const locationId = searchParams.get("locationId");
    const status = searchParams.get("status");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    const reports = await database.qualityReport.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(reportType && { reportType }),
        ...(locationId && { locationId }),
        ...(status && { status }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await database.qualityReport.count({
      where: {
        tenantId,
        deletedAt: null,
        ...(reportType && { reportType }),
        ...(locationId && { locationId }),
        ...(status && { status }),
      },
    });

    return manifestSuccessResponse({ reports, total, limit, offset });
  } catch (error) {
    console.error("Error fetching quality reports:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { locationId, reportType, reportPeriodStart, reportPeriodEnd } = body;

    if (!(locationId && reportType && reportPeriodStart && reportPeriodEnd)) {
      return manifestErrorResponse(
        "Location, type, and period dates are required",
        400
      );
    }

    // Generate report number
    const reportCount = await database.qualityReport.count({
      where: { tenantId },
    });
    const reportNumber = `QR-${String(reportCount + 1).padStart(6, "0")}`;

    // Calculate report data
    const startDate = new Date(reportPeriodStart);
    const endDate = new Date(reportPeriodEnd);

    const [
      totalInspections,
      passedInspections,
      failedInspections,
      openCorrectiveActions,
      closedCorrectiveActions,
      criticalIssues,
    ] = await Promise.all([
      database.qualityInspection.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      }),
      database.qualityInspection.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          status: "approved",
          deletedAt: null,
        },
      }),
      database.qualityInspection.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ["rejected", "cancelled"] },
          deletedAt: null,
        },
      }),
      database.correctiveAction.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ["open", "in_progress"] },
          deletedAt: null,
        },
      }),
      database.correctiveAction.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          status: "closed",
          deletedAt: null,
        },
      }),
      database.correctiveAction.count({
        where: {
          tenantId,
          locationId,
          createdAt: { gte: startDate, lte: endDate },
          severity: "critical",
          status: { in: ["open", "in_progress"] },
          deletedAt: null,
        },
      }),
    ]);

    const overallPassRate =
      totalInspections > 0 ? (passedInspections / totalInspections) * 100 : 0;

    const report = await database.qualityReport.create({
      data: {
        tenantId,
        locationId,
        reportNumber,
        reportType,
        reportPeriodStart: startDate,
        reportPeriodEnd: endDate,
        reportData: {},
        totalInspections,
        passedInspections,
        failedInspections,
        overallPassRate,
        openCorrectiveActions,
        closedCorrectiveActions,
        criticalIssues,
        generatedById: userId,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ report });
  } catch (error) {
    console.error("Error creating quality report:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
