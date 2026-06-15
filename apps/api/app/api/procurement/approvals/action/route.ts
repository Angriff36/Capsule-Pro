// Approve or reject a purchase order via Manifest runtime + native approval gate
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import type { CommandResult } from "@angriff36/manifest";
import { createManifestRuntime } from "@/lib/manifest-runtime";

/**
 * U10 — Route approve/reject through the native approval gate.
 *
 * Previously this route hand-checked `currentPO.status !== "submitted"` and
 * called `runManifestCommand` directly, bypassing the engine's approval
 * lifecycle methods (`requestApproval` / `approveStage` / `denyApproval`).
 *
 * The PurchaseOrder entity declares:
 *   approval managerApproval {
 *     command: approve
 *     stages { manager { policy: user.role in ["manager","admin"], required: 1 } }
 *   }
 *
 * Now the route:
 *  1. Creates the runtime engine directly (not through the HTTP wrapper).
 *  2. Calls `engine.requestApproval()` to create/return the pending approval.
 *  3. On approve → `engine.approveStage()` grants the "manager" stage, then
 *     `engine.runCommand("approve")` passes through the gate and executes.
 *  4. On reject → `engine.denyApproval()` records the denial, then
 *     `engine.runCommand("reject")` executes (reject has no approval gate).
 *
 * State-transition validation (status == "submitted") is handled by the
 * engine's command guard, so the manual pre-check is removed.
 */

interface ActionRequest {
  action: "approved" | "rejected";
  notes?: string;
  orderId: string;
}

/** Approval name declared on PurchaseOrder.approve in the .manifest source */
const PO_APPROVAL_NAME = "managerApproval";
/** Stage name inside the managerApproval block */
const PO_APPROVAL_STAGE = "manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);

    const body: ActionRequest = await request.json();
    const { orderId, action, notes } = body;

    if (!(orderId && action)) {
      return NextResponse.json(
        { error: "Missing orderId or action" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Pre-validation: confirm the PO exists and belongs to the tenant.
    // (Reads bypass the Manifest runtime per constitution §10.)
    const currentPO = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, status: true, poNumber: true },
    });

    if (!currentPO) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // ── Native approval gate ───────────────────────────────────────────
    // Create the runtime engine directly so we can access the approval
    // lifecycle methods that the HTTP wrapper (runManifestCommand) does not
    // expose.
    const engine = await createManifestRuntime({
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
      entityName: "PurchaseOrder",
      source: "route.procurement.approval",
    });

    // Ensure a pending approval request exists for this PO + approval name.
    await engine.requestApproval(
      "PurchaseOrder",
      orderId,
      PO_APPROVAL_NAME
    );

    if (action === "approved") {
      // Grant the "manager" stage — the policy `user.role in ["manager",
      // "admin"]` is evaluated by the engine against the approver context.
      await engine.approveStage(
        "PurchaseOrder",
        orderId,
        PO_APPROVAL_NAME,
        PO_APPROVAL_STAGE,
        { id: user.id, role: user.role }
      );

      // Now run the approve command — the gate is satisfied, so it executes.
      const result = await engine.runCommand(
        "approve",
        { userId: user.id },
        { entityName: "PurchaseOrder", instanceId: orderId }
      );

      if (!result.success) {
        return commandErrorToResponse(result, "approve");
      }
    } else {
      // Deny the approval request natively.
      await engine.denyApproval(
        "PurchaseOrder",
        orderId,
        PO_APPROVAL_NAME,
        user.id,
        notes
      );

      // Run the reject command (no approval gate on reject).
      const result = await engine.runCommand(
        "reject",
        { userId: user.id, reason: notes ?? "" },
        { entityName: "PurchaseOrder", instanceId: orderId }
      );

      if (!result.success) {
        return commandErrorToResponse(result, "reject");
      }
    }

    // Side effect: insert approval history record (infrastructure audit,
    // not governed domain state)
    await database.approvalHistory.create({
      data: {
        entityType: "purchase_order",
        entityId: orderId,
        action,
        performedBy: user.id,
        previousStatus: "submitted",
        newStatus: action,
        notes: notes || null,
        tenantId: user.tenantId,
      },
    });

    // Fetch updated PO + vendor info for response (reads bypass runtime)
    const updatedPO = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId },
      select: {
        id: true,
        poNumber: true,
        status: true,
        total: true,
        submittedBy: true,
        submittedAt: true,
        updatedAt: true,
        vendorId: true,
      },
    });

    let vendorName: string | null = null;
    if (updatedPO?.vendorId) {
      const vendor = await database.inventorySupplier.findFirst({
        where: { id: updatedPO.vendorId, tenantId: user.tenantId },
        select: { name: true },
      });
      vendorName = vendor?.name ?? null;
    }

    return NextResponse.json({
      order: updatedPO
        ? {
            id: updatedPO.id,
            po_number: updatedPO.poNumber,
            status: updatedPO.status,
            total: updatedPO.total,
            submitted_by: updatedPO.submittedBy,
            submitted_at: updatedPO.submittedAt,
            updated_at: updatedPO.updatedAt,
            vendor_name: vendorName,
          }
        : null,
      message: `Purchase order ${currentPO.poNumber} has been ${action}`,
    });
  } catch (error) {
    captureException(error);
    log.error("Error processing approval action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Map a failed CommandResult to an HTTP response, preserving the engine's
 * diagnostic information (guard failures, policy denials, etc.).
 */
function commandErrorToResponse(
  result: CommandResult,
  command: string
): NextResponse {
  if (result.policyDenial) {
    return NextResponse.json(
      {
        error: `Access denied for ${command}: ${result.policyDenial.message ?? result.policyDenial.formatted}`,
      },
      { status: 403 }
    );
  }

  if (result.guardFailure) {
    return NextResponse.json(
      { error: result.guardFailure.formatted },
      { status: 422 }
    );
  }

  if (result.constraintOutcomes?.some((c) => c.formatted)) {
    const blocked = result.constraintOutcomes.filter((c) => c.formatted);
    return NextResponse.json(
      { error: blocked.map((c) => c.formatted).join("; ") },
      { status: 422 }
    );
  }

  return NextResponse.json(
    { error: result.error ?? `Command ${command} failed` },
    { status: 400 }
  );
}
