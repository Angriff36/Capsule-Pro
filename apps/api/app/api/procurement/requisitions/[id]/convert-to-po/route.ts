/**
 * POST /api/procurement/requisitions/[id]/convert-to-po
 *
 * Custom orchestration route: materializes an APPROVED purchase requisition
 * into a real PurchaseOrder. The bare `PurchaseRequisition.convertToPo`
 * command only records a purchaseOrderId — nothing previously CREATED that
 * order, which left the "Convert to PO" button dead. This route runs the
 * whole conversion as governed commands inside one transaction-bound
 * Manifest runtime (same pattern as runManifestBatch):
 *
 *   PurchaseOrder.create → PurchaseOrderItem.create per line →
 *   PurchaseOrder.updateTotals → PurchaseRequisition.convertToPo
 *
 * The PO's Vendor comes from the requisition's InventorySupplier via the
 * InventorySupplier.vendorId bridge (2026-07-04). If the supplier has no
 * linked purchasing Vendor the conversion FAILS with an actionable message —
 * it never guesses or auto-creates a Vendor.
 */

import { database } from "@repo/database";
import {
  type RunManifestCommandCoreFailure,
  runManifestCommandCore,
} from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { batchTransactionTimeout } from "@/lib/manifest/batch-timeout";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface ConvertResponseBody {
  error?: string;
  purchaseOrderId?: string;
  redirectUrl?: string;
  success: boolean;
}

function json(body: ConvertResponseBody, status = 200) {
  return NextResponse.json(body, { status });
}

/** Thrown inside the transaction to abort it and surface the core failure. */
class GovernedConvertError extends Error {
  readonly failure: RunManifestCommandCoreFailure;
  constructor(failure: RunManifestCommandCoreFailure) {
    super(failure.message);
    this.name = "GovernedConvertError";
    this.failure = failure;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const tenantId = currentUser.tenantId;
    const user = { id: currentUser.id, tenantId, role: currentUser.role };
    const { id: requisitionId } = await params;

    // Reads bypass the runtime (constitution §10).
    const requisition = await database.purchaseRequisition.findFirst({
      where: { id: requisitionId, tenantId, deletedAt: null },
    });
    if (!requisition) {
      return json({ success: false, error: "Requisition not found." }, 404);
    }
    if (requisition.status !== "approved") {
      return json(
        {
          success: false,
          error: `Only approved requisitions can be converted (status: ${requisition.status}).`,
        },
        409
      );
    }

    const items = await database.purchaseRequisitionItem.findMany({
      where: { requisitionId, tenantId, deletedAt: null },
    });
    if (items.length === 0) {
      return json(
        { success: false, error: "Requisition has no line items to order." },
        409
      );
    }

    // Resolve the purchasing Vendor via the InventorySupplier.vendorId bridge.
    let vendorId = "";
    let supplierName = "";
    if (requisition.supplierId) {
      const supplier = await database.inventorySupplier.findFirst({
        where: { id: requisition.supplierId, tenantId },
      });
      supplierName = supplier?.name ?? requisition.supplierId;
      vendorId = supplier?.vendorId ?? "";
      if (!vendorId) {
        return json(
          {
            success: false,
            error: `Inventory supplier "${supplierName}" has no linked purchasing vendor. Link one first (InventorySupplier.linkVendor), then convert.`,
          },
          409
        );
      }
      const vendor = await database.vendor.findFirst({
        where: { id: vendorId, tenantId },
      });
      if (!vendor) {
        return json(
          {
            success: false,
            error: `Linked vendor ${vendorId} for supplier "${supplierName}" does not exist. Re-link the supplier to a valid vendor.`,
          },
          409
        );
      }
    } else {
      // Manual requisition: accept a single consistent suggestedVendorId that
      // is a REAL Vendor. Anything ambiguous fails loudly — no guessing.
      const suggested = [
        ...new Set(items.map((i) => i.suggestedVendorId).filter(Boolean)),
      ];
      if (suggested.length !== 1 || !suggested[0]) {
        return json(
          {
            success: false,
            error:
              "Requisition has no supplier and no single suggested vendor across its lines — set a vendor before converting.",
          },
          409
        );
      }
      const vendor = await database.vendor.findFirst({
        where: { id: suggested[0], tenantId },
      });
      if (!vendor) {
        return json(
          {
            success: false,
            error: `Suggested vendor ${suggested[0]} is not a purchasing Vendor record — set a valid vendor before converting.`,
          },
          409
        );
      }
      vendorId = vendor.id;
      supplierName = vendor.name;
    }

    const expectedDeliveryDate = (
      requisition.requiredBy ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    ).toISOString();

    const purchaseOrderId = await database.$transaction(
      async (tx) => {
        const txRuntime = await createManifestRuntime({
          user,
          prismaOverride: tx,
        });
        const deps = { createRuntime: () => Promise.resolve(txRuntime) };
        const run = async (
          entity: string,
          command: string,
          body: Record<string, unknown>
        ) => {
          const result = await runManifestCommandCore(deps, {
            entity,
            command,
            body,
            user,
          });
          if (!result.ok) {
            throw new GovernedConvertError(result);
          }
          return result;
        };

        const created = await run("PurchaseOrder", "create", {
          poNumber: `PO-${requisition.requisitionNumber}`,
          vendorId,
          locationId: requisition.locationId ?? "",
          notes:
            `Converted from requisition ${requisition.requisitionNumber} (${supplierName}).` +
            (requisition.sourceType === "prep_demand"
              ? " Source: consolidated prep-list demand — per-line provenance in item notes."
              : ""),
        });
        const poId = (created.result as { id?: string } | null)?.id;
        if (!poId) {
          throw new Error("PurchaseOrder.create returned no instance id");
        }

        let subtotal = 0;
        for (const item of items) {
          const quantity = Number(item.quantityRequested);
          const unitCost = Number(item.estimatedUnitCost);
          if (!(quantity > 0)) {
            continue;
          }
          subtotal += Math.round(quantity * unitCost * 100) / 100;
          const provenance =
            Array.isArray(item.sourcePrepListIds) &&
            item.sourcePrepListIds.length > 0
              ? ` [prep-lists: ${item.sourcePrepListIds.join(", ")}]`
              : "";
          await run("PurchaseOrderItem", "create", {
            purchaseOrderId: poId,
            itemId: item.itemId,
            quantityOrdered: quantity,
            unitId: item.unitId ?? 0,
            unitCost,
            notes: `${item.notes ?? ""}${provenance}`.trim(),
          });
        }
        subtotal = Math.round(subtotal * 100) / 100;

        await run("PurchaseOrder", "updateTotals", {
          id: poId,
          subtotal,
          total: subtotal,
          itemCount: items.length,
          expectedDeliveryDate,
        });

        await run("PurchaseRequisition", "convertToPo", {
          id: requisitionId,
          userId: user.id,
          purchaseOrderId: poId,
        });

        return poId;
      },
      // Bound at the app-wide tx ceiling (30s) so one conversion can't pin a
      // pool connection — see batch-timeout.ts (db-perf #29 / #18). opCount =
      // N line items + 3 fixed writes (PO.create + updateTotals + convertToPo).
      {
        timeout: batchTransactionTimeout(items.length + 3),
        maxWait: 10_000,
      }
    );

    return json({
      success: true,
      purchaseOrderId,
      redirectUrl: `/procurement/purchase-orders/${purchaseOrderId}`,
    });
  } catch (error) {
    if (error instanceof GovernedConvertError) {
      return json(
        { success: false, error: error.failure.message },
        error.failure.httpStatus
      );
    }
    if (error instanceof Error && error.name === "InvariantError") {
      return json({ success: false, error: error.message }, 401);
    }
    captureException(error);
    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to convert requisition",
      },
      500
    );
  }
}
