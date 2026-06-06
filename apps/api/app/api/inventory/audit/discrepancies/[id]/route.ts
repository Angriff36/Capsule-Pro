/**
 * Inventory Audit Discrepancy Detail API
 *
 * GET - Get single discrepancy details (read — bypasses Manifest per §10)
 * PATCH - Update discrepancy (add resolution notes, root cause, etc.) via Manifest runtime
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
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
 * Get single discrepancy details (read — bypasses Manifest per §10)
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();

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
    log.error("[discrepancies/get] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/inventory/audit/discrepancies/[id]
 * Update discrepancy (add resolution notes, root cause, etc.) via Manifest runtime.
 * Pre-validation reads are §10-compliant.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const body: UpdateDiscrepancyBody = await request.json();

    // Validate body
    if (!(body.notes || body.rootCause || body.resolutionNotes)) {
      return manifestErrorResponse(
        "At least one field (notes, rootCause, resolutionNotes) must be provided",
        400
      );
    }

    // Pre-validation: check discrepancy exists and is in a valid state (read per §10)
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

    // Delegate update to Manifest runtime
    return runManifestCommand({
      entity: "VarianceReport",
      command: "updateDiscrepancy",
      body: {
        notes: body.notes ?? existingReport.notes ?? "",
        rootCause: body.rootCause ?? existingReport.rootCause ?? "",
        resolutionNotes:
          body.resolutionNotes ?? existingReport.resolutionNotes ?? "",
      },
      user: { id: user.id, tenantId, role: user.role },
      instanceId: id,
    });
  } catch (error) {
    log.error("[discrepancies/update] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
