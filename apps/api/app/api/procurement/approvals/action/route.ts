// Approve or reject a purchase order via Manifest runtime
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface ActionRequest {
  orderId: string;
  action: "approved" | "rejected";
  notes?: string;
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);

    const body: ActionRequest = await request.json();
    const { orderId, action, notes } = body;

    if (!(orderId && action)) {
      return NextResponse.json({ error: "Missing orderId or action" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Pre-validation: get current PO to check state and fetch context
    // (reads bypass Manifest runtime per constitution §10)
    const currentPO = await database.purchaseOrder.findFirst({
      where: { id: orderId, tenantId: user.tenantId, deletedAt: null },
      select: { id: true, status: true, poNumber: true },
    });

    if (!currentPO) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    // Validate state transition: only "submitted" can transition
    if (currentPO.status !== "submitted") {
      return NextResponse.json(
        { error: `Cannot ${action} a purchase order with status '${currentPO.status}'. Only 'submitted' orders can be approved or rejected.` },
        { status: 400 }
      );
    }

    // Delegate governed mutation to Manifest runtime
    const command = action === "approved" ? "approve" : "reject";
    const commandBody: Record<string, unknown> = { id: orderId, userId: user.id };
    if (action === "rejected" && notes) {
      commandBody.reason = notes;
    }

    const result = await runManifestCommand({
      entity: "PurchaseOrder",
      command,
      body: commandBody,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    // If the command failed, return the error from runtime
    if (result.status >= 400) {
      return result;
    }

    // Side effect: insert approval history record (infrastructure audit, not governed domain state)
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
