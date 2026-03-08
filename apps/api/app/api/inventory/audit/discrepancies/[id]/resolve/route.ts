/**
 * Inventory Audit Discrepancy Resolve API
 *
 * POST - Mark discrepancy as resolved with resolution details
 * This approves the variance report and records resolution metadata
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
import { createManifestRuntime } from "@/lib/manifest-runtime";
import type { CommandResult, RuntimeEngine } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

type DiscrepancyStatus = "pending" | "reviewed" | "approved" | "adjusted";
type DiscrepancySeverity = "low" | "medium" | "high" | "critical";

const SEVERITY_THRESHOLDS = {
  low: 5,
  medium: 10,
  high: 20,
  critical: Number.POSITIVE_INFINITY,
};

const VALID_ADJUSTMENT_TYPES = [
  "full_adjustment",
  "partial_adjustment",
  "no_adjustment",
  "write_off",
] as const;

type AdjustmentType = (typeof VALID_ADJUSTMENT_TYPES)[number];

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

interface ResolveDiscrepancyBody {
  reviewNotes?: string;
  adjustmentType?: AdjustmentType;
  adjustmentAmount?: number;
  rootCause?: string;
  resolutionNotes?: string;
  skipReview?: boolean;
}

interface DiscrepancyResponse {
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

function formatDiscrepancy(report: {
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
}): DiscrepancyResponse {
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

function handleCommandError(
  result: CommandResult,
  userRole: string,
  operation: string
): Response {
  console.error(`[discrepancies/resolve] ${operation} command failed:`, {
    policyDenial: result.policyDenial,
    guardFailure: result.guardFailure,
    error: result.error,
    userRole,
  });

  if (result.policyDenial) {
    return manifestErrorResponse(
      `Access denied: ${result.policyDenial.policyName} (role=${userRole})`,
      403
    );
  }
  if (result.guardFailure) {
    return manifestErrorResponse(
      `Guard failed: ${result.guardFailure.formatted}`,
      422
    );
  }
  return manifestErrorResponse(result.error ?? `${operation} command failed`, 400);
}

async function executeReview(
  runtime: RuntimeEngine,
  reportId: string,
  userId: string,
  notes: string,
  userRole: string
): Promise<Response | null> {
  const result = await runtime.runCommand(
    "review",
    { id: reportId, userId, notes },
    { entityName: "VarianceReport" }
  );

  if (!result.success) {
    return handleCommandError(result, userRole, "Review");
  }
  return null;
}

async function executeApprove(
  runtime: RuntimeEngine,
  reportId: string,
  userId: string,
  adjustmentType: string,
  adjustmentAmount: number,
  userRole: string
): Promise<Response | null> {
  const result = await runtime.runCommand(
    "approve",
    { id: reportId, userId, adjustmentType, adjustmentAmount },
    { entityName: "VarianceReport" }
  );

  if (!result.success) {
    return handleCommandError(result, userRole, "Approve");
  }
  return null;
}

function validateAndCalculateAdjustment(
  body: ResolveDiscrepancyBody,
  variance: number
): { error: Response | null; adjustmentAmount: number } {
  if (!body.adjustmentType) {
    return {
      error: manifestErrorResponse("adjustmentType is required for resolution", 400),
      adjustmentAmount: 0,
    };
  }

  if (!VALID_ADJUSTMENT_TYPES.includes(body.adjustmentType)) {
    return {
      error: manifestErrorResponse(
        `Invalid adjustmentType. Must be one of: ${VALID_ADJUSTMENT_TYPES.join(", ")}`,
        400
      ),
      adjustmentAmount: 0,
    };
  }

  if (body.adjustmentAmount !== undefined) {
    return { error: null, adjustmentAmount: body.adjustmentAmount };
  }

  if (body.adjustmentType === "full_adjustment") {
    return { error: null, adjustmentAmount: variance };
  }

  if (body.adjustmentType === "no_adjustment") {
    return { error: null, adjustmentAmount: 0 };
  }

  return {
    error: manifestErrorResponse(
      "adjustmentAmount is required for partial_adjustment and write_off types",
      400
    ),
    adjustmentAmount: 0,
  };
}

/**
 * POST /api/inventory/audit/discrepancies/[id]/resolve
 * Mark discrepancy as resolved with resolution details
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const currentUser = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
    });

    if (!currentUser) {
      return manifestErrorResponse("User not found in database", 400);
    }

    const { id } = await context.params;
    const body: ResolveDiscrepancyBody = await request.json();

    const existingReport = await database.varianceReport.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existingReport) {
      return manifestErrorResponse("Discrepancy not found", 404);
    }

    if (existingReport.status === "approved" || existingReport.status === "adjusted") {
      return manifestErrorResponse("Discrepancy is already resolved", 400);
    }

    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "VarianceReport",
    });

    // Execute review if needed
    if (existingReport.status === "pending" && !body.skipReview) {
      const reviewError = await executeReview(
        runtime,
        existingReport.id,
        currentUser.id,
        body.reviewNotes ?? body.resolutionNotes ?? "",
        currentUser.role
      );
      if (reviewError) {
        return reviewError;
      }
    }

    // Validate and calculate adjustment
    const { error: adjustmentError, adjustmentAmount } = validateAndCalculateAdjustment(
      body,
      toNumber(existingReport.variance)
    );
    if (adjustmentError) {
      return adjustmentError;
    }

    // Execute approval
    const approveError = await executeApprove(
      runtime,
      existingReport.id,
      currentUser.id,
      body.adjustmentType as string,
      adjustmentAmount,
      currentUser.role
    );
    if (approveError) {
      return approveError;
    }

    // Update with resolution metadata
    const now = new Date();
    const updatedReport = await database.varianceReport.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        rootCause: body.rootCause,
        resolutionNotes: body.resolutionNotes,
        resolvedById: currentUser.id,
        resolvedAt: now,
        updatedAt: now,
      },
    });

    console.log("[discrepancies/resolve] Resolved discrepancy:", {
      id,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId,
      adjustmentType: body.adjustmentType,
      adjustmentAmount,
    });

    return manifestSuccessResponse({
      discrepancy: formatDiscrepancy(updatedReport),
    });
  } catch (error) {
    console.error("[discrepancies/resolve] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
