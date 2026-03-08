/**
 * Inventory Audit Discrepancy Detail API
 *
 * GET - Get single discrepancy details
 * PATCH - Update discrepancy (add resolution notes, root cause, etc.)
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

type DiscrepancyStatus = "pending" | "reviewed" | "approved" | "adjusted";
type DiscrepancySeverity = "low" | "medium" | "high" | "critical";

const SEVERITY_THRESHOLDS = {
  low: 5,
  medium: 10,
  high: 20,
  critical: Number.POSITIVE_INFINITY,
};

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

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface UpdateDiscrepancyBody {
  notes?: string;
  rootCause?: string;
  resolutionNotes?: string;
}

/**
 * GET /api/inventory/audit/discrepancies/[id]
 * Get single discrepancy details
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await context.params;

    const report = await database.varianceReport.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!report) {
      return manifestErrorResponse("Discrepancy not found", 404);
    }

    const variancePct = toNumber(report.variancePct);

    // Fetch related session info
    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id: report.sessionId,
        deletedAt: null,
      },
      select: {
        id: true,
        sessionId: true,
        sessionName: true,
        status: true,
        countType: true,
      },
    });

    // Fetch related item info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (await database.inventoryItem.findFirst({
      where: {
        tenantId,
        id: report.itemId,
        deletedAt: null,
      },
      select: {
        id: true,
        item_number: true,
        name: true,
        category: true,
        unitOfMeasure: true,
        quantityOnHand: true,
      },
    })) as any;

    // Fetch resolver info if resolved
    const resolver = report.resolvedById
      ? await database.user.findFirst({
          where: {
            tenantId,
            id: report.resolvedById,
            deletedAt: null,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        })
      : null;

    const discrepancy = {
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

    return manifestSuccessResponse({
      discrepancy,
      session,
      item,
      resolver,
    });
  } catch (error) {
    console.error("[discrepancies/get] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/inventory/audit/discrepancies/[id]
 * Update discrepancy (add resolution notes, root cause, etc.)
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Resolve internal user from Clerk auth
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const { id } = await context.params;
    const body: UpdateDiscrepancyBody = await request.json();

    // Validate body
    if (!(body.notes || body.rootCause || body.resolutionNotes)) {
      return manifestErrorResponse(
        "At least one field (notes, rootCause, resolutionNotes) must be provided",
        400
      );
    }

    // Check if discrepancy exists and is in a valid state
    const existingReport = await database.varianceReport.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existingReport) {
      return manifestErrorResponse("Discrepancy not found", 404);
    }

    // Only allow updates on pending or reviewed status
    if (!["pending", "reviewed"].includes(existingReport.status)) {
      return manifestErrorResponse(
        `Cannot update discrepancy with status '${existingReport.status}'`,
        400
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.rootCause !== undefined) {
      updateData.rootCause = body.rootCause;
    }

    if (body.resolutionNotes !== undefined) {
      updateData.resolutionNotes = body.resolutionNotes;
    }

    // Update the report
    const updatedReport = await database.varianceReport.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    console.log("[discrepancies/update] Updated discrepancy:", {
      id,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
      fieldsUpdated: Object.keys(updateData),
    });

    const variancePct = toNumber(updatedReport.variancePct);

    return manifestSuccessResponse({
      discrepancy: {
        id: updatedReport.id,
        tenantId: updatedReport.tenantId,
        sessionId: updatedReport.sessionId,
        reportType: updatedReport.reportType,
        itemId: updatedReport.itemId,
        itemNumber: updatedReport.itemNumber,
        itemName: updatedReport.itemName,
        expectedQuantity: toNumber(updatedReport.expectedQuantity),
        countedQuantity: toNumber(updatedReport.countedQuantity),
        variance: toNumber(updatedReport.variance),
        variancePct,
        accuracyScore: toNumber(updatedReport.accuracyScore),
        status: updatedReport.status as DiscrepancyStatus,
        severity: calculateSeverity(variancePct),
        adjustmentType: updatedReport.adjustmentType,
        adjustmentAmount: updatedReport.adjustmentAmount
          ? toNumber(updatedReport.adjustmentAmount)
          : null,
        adjustmentDate: updatedReport.adjustmentDate?.toISOString() ?? null,
        notes: updatedReport.notes,
        rootCause: updatedReport.rootCause,
        resolutionNotes: updatedReport.resolutionNotes,
        resolvedById: updatedReport.resolvedById,
        resolvedAt: updatedReport.resolvedAt?.toISOString() ?? null,
        generatedAt: updatedReport.generatedAt.toISOString(),
        createdAt: updatedReport.createdAt.toISOString(),
        updatedAt: updatedReport.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[discrepancies/update] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
