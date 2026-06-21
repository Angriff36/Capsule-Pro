/**
 * Inventory Audit Discrepancy Resolve API
 *
 * POST - Mark discrepancy as resolved with resolution details
 * This approves the variance report and records resolution metadata
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import type { CommandResult, RuntimeEngine } from "@/lib/manifest-runtime";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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
  adjustmentAmount?: number;
  adjustmentType?: AdjustmentType;
  resolutionNotes?: string;
  reviewNotes?: string;
  rootCause?: string;
  skipReview?: boolean;
}

interface DiscrepancyResponse {
  accuracyScore: number;
  adjustmentAmount: number | null;
  adjustmentDate: string | null;
  adjustmentType: string | null;
  countedQuantity: number;
  createdAt: string;
  expectedQuantity: number;
  generatedAt: string;
  id: string;
  itemId: string;
  itemName: string;
  itemNumber: string;
  notes: string | null;
  reportType: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  rootCause: string | null;
  sessionId: string;
  severity: DiscrepancySeverity;
  status: DiscrepancyStatus;
  tenantId: string;
  updatedAt: string;
  variance: number;
  variancePct: number;
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
  log.error(`[discrepancies/resolve] ${operation} command failed:`, {
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
  return manifestErrorResponse(
    result.error ?? `${operation} command failed`,
    400
  );
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
      error: manifestErrorResponse(
        "adjustmentType is required for resolution",
        400
      ),
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
 * Apply the governed stock correction for a resolved discrepancy.
 *
 * WHY: previously this route approved the variance report (status →
 * `approved`/`adjusted`) but performed NO `InventoryItem.adjust` and NO
 * `InventoryTransaction.create` — so resolving a discrepancy here marked the
 * books reconciled while physical on-hand never moved, a confirmed
 * inventory-integrity bug (IMPLEMENTATION_PLAN item 171). This mirrors the
 * cycle-count finalize route's governed correction exactly (same commands, same
 * delta = counted − live on-hand, same ledger row).
 *
 * Only `full_adjustment` is applied: on-hand is corrected to the counted
 * quantity. `no_adjustment` skips (intentional). `partial_adjustment` /
 * `write_off` map to a SIGNED stock delta in a way that is a domain decision
 * (still BLOCKED, item 171) — stock is deliberately left unmoved (status quo, no
 * regression) until those semantics are confirmed; the skip is logged.
 *
 * DOUBLE-APPLY GUARD: `approve` emits `VarianceReportApproved`, which has no
 * consumer today. If a reaction/middleware on that event is ever added to apply
 * stock, this route-local adjust MUST be removed in the same change or stock
 * will be double-counted.
 *
 * Failures are logged and non-fatal (mirrors finalize) — the variance report
 * stays resolved even if a downstream inventory command fails.
 */
async function applyResolutionStockMovement(
  adjustmentType: AdjustmentType,
  user: { id: string; role: string; tenantId: string },
  report: {
    countedQuantity: number;
    id: string;
    itemId: string;
    variance: number;
  },
  resolutionNotes: string
): Promise<void> {
  if (adjustmentType === "no_adjustment") {
    return;
  }

  // partial_adjustment / write_off → signed stock delta is a domain decision
  // (BLOCKED, item 171). Leave stock unmoved (status quo) and record the skip.
  if (
    adjustmentType === "partial_adjustment" ||
    adjustmentType === "write_off"
  ) {
    log.warn(
      "[discrepancies/resolve] adjustmentType requires deferred stock semantics; stock NOT moved (IMPLEMENTATION_PLAN item 171)",
      {
        reportId: report.id,
        itemId: report.itemId,
        tenantId: user.tenantId,
        adjustmentType,
      }
    );
    return;
  }

  // full_adjustment → correct on-hand to the counted quantity.
  if (report.variance === 0) {
    return;
  }

  // Read the live inventory item — constitution §10 (reads bypass Manifest).
  const inventoryItem = await database.inventoryItem.findFirst({
    where: { tenantId: user.tenantId, id: report.itemId, deletedAt: null },
  });

  if (!inventoryItem) {
    log.error(
      "[discrepancies/resolve] inventory item not found; stock NOT adjusted",
      { reportId: report.id, itemId: report.itemId, tenantId: user.tenantId }
    );
    return;
  }

  const deps = {
    createRuntime: ({
      user: u,
      entityName,
    }: {
      entityName: string;
      user: { id: string; role: string; tenantId: string };
    }) =>
      createManifestRuntime({
        user: { id: u.id, tenantId: u.tenantId, role: u.role },
        entityName,
      }),
  };

  // Governed: InventoryTransaction.create — append the adjustment ledger row.
  const txResult = await runManifestCommandCore(deps, {
    entity: "InventoryTransaction",
    command: "create",
    body: {
      itemId: report.itemId,
      transactionType: "adjustment",
      quantity: report.variance,
      unitCost: toNumber(inventoryItem.unitCost),
      referenceType: "discrepancy_resolution",
      referenceId: report.id,
      reason: `Discrepancy resolution for variance report ${report.id}`,
      notes: resolutionNotes,
      employeeId: "",
      // VarianceReport's live Prisma model carries no storage location; the
      // ledger row is item-scoped (matches finalize's `record.storageLocationId
      // || ""` fallback).
      storageLocationId: "",
    },
    user,
  });

  if (!txResult.ok) {
    log.error(
      "[discrepancies/resolve] failed to create inventory transaction",
      {
        reportId: report.id,
        itemId: report.itemId,
        error: txResult.message,
      }
    );
  }

  // Governed: InventoryItem.adjust — correct on-hand to the counted quantity.
  const currentOnHand = toNumber(inventoryItem.quantityOnHand);
  const adjustmentDelta = report.countedQuantity - currentOnHand;

  const adjustResult = await runManifestCommandCore(deps, {
    entity: "InventoryItem",
    command: "adjust",
    body: {
      quantity: adjustmentDelta,
      reason: `Discrepancy resolution for variance report ${report.id}`,
      userId: user.id,
    },
    user,
    instanceId: report.itemId,
  });

  if (!adjustResult.ok) {
    log.error("[discrepancies/resolve] failed to adjust inventory item", {
      reportId: report.id,
      itemId: report.itemId,
      error: adjustResult.message,
    });
  }
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

    if (["approved", "adjusted"].includes(existingReport.status)) {
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
    const { error: adjustmentError, adjustmentAmount } =
      validateAndCalculateAdjustment(body, toNumber(existingReport.variance));
    if (adjustmentError) {
      return adjustmentError;
    }

    // Record resolution metadata FIRST — updateDiscrepancy guards
    // `status in [pending, reviewed]`, so it must run before approve flips the
    // report to `approved`. (Previously it ran AFTER approve and always failed
    // its guard, so the route could never complete the resolution.)
    const resolveResult = await runtime.runCommand(
      "updateDiscrepancy",
      {
        notes: body.reviewNotes ?? body.resolutionNotes ?? "",
        rootCause: body.rootCause ?? "",
        resolutionNotes: body.resolutionNotes ?? "",
      },
      { entityName: "VarianceReport", instanceId: id }
    );

    if (!resolveResult.success) {
      log.error("[discrepancies/resolve] updateDiscrepancy command failed:", {
        error: resolveResult.error,
        id,
        tenantId,
      });
      return handleCommandError(
        resolveResult,
        currentUser.role,
        "UpdateDiscrepancy"
      );
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

    // Apply the governed stock correction now that the variance is approved
    // (full_adjustment moves stock; no_adjustment/partial_adjustment/write_off
    // are handled inside the helper). adjustmentType is guaranteed defined +
    // valid by validateAndCalculateAdjustment above.
    await applyResolutionStockMovement(
      body.adjustmentType as AdjustmentType,
      { id: currentUser.id, role: currentUser.role, tenantId },
      {
        countedQuantity: toNumber(existingReport.countedQuantity),
        id: existingReport.id,
        itemId: existingReport.itemId,
        variance: toNumber(existingReport.variance),
      },
      body.resolutionNotes ?? ""
    );

    // Read back the updated report for the response (constitution §10 — reads bypass Manifest).
    const updatedReport = await database.varianceReport.findFirst({
      where: { tenantId, id },
    });

    if (!updatedReport) {
      return manifestErrorResponse("Discrepancy not found after update", 404);
    }

    log.info("[discrepancies/resolve] Resolved discrepancy:", {
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
    log.error("[discrepancies/resolve] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
