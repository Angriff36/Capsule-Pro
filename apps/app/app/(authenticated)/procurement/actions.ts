"use server";
import { listStorageLocations } from "@/app/lib/manifest-client.generated";

/**
 * Procurement Server Actions
 *
 * Server actions for Purchase Order and Purchase Requisition creation.
 * Governed writes (create) go through Manifest runtime (constitution §9).
 * Reads remain direct Prisma (constitution §10).
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const purchaseOrderItemSchema = z.object({
  itemId: z.uuid(),
  quantityOrdered: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  unitId: z.coerce.number().int().default(1),
});

const purchaseOrderSchema = z.object({
  vendorId: z.uuid({ error: "Invalid vendor" }),
  locationId: z.uuid({ error: "Invalid location" }).optional().nullable(),
  expectedDeliveryDate: z
    .string()
    .optional()
    .transform((v) => v || null),
  notes: z
    .string()
    .optional()
    .transform((v) => v || null),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, "At least one line item is required"),
});

const purchaseRequisitionItemSchema = z.object({
  itemId: z.uuid(),
  itemName: z.string().optional(),
  itemNumber: z.string().optional(),
  unitOfMeasure: z.string().optional(),
  quantityRequested: z.coerce.number().positive(),
  estimatedUnitCost: z.coerce.number().min(0),
  estimatedTotalCost: z.coerce.number().min(0),
});

const purchaseRequisitionSchema = z.object({
  requiredBy: z
    .string()
    .optional()
    .transform((v) => v || null),
  department: z
    .string()
    .optional()
    .transform((v) => v || null),
  justification: z
    .string()
    .optional()
    .transform((v) => v || null),
  priority: z
    .enum(["low", "normal", "high", "urgent", "critical"])
    .default("normal"),
  notes: z
    .string()
    .optional()
    .transform((v) => v || null),
  items: z
    .array(purchaseRequisitionItemSchema)
    .min(1, "At least one line item is required"),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreatePurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type CreatePurchaseRequisitionInput = z.infer<
  typeof purchaseRequisitionSchema
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePoNumber(year: number, suffix: string): string {
  return `PO-${year}-${suffix}`;
}

function generateRequisitionNumber(year: number, suffix: string): string {
  return `PR-${year}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a new purchase order with line items.
 *
 * Governed write: PurchaseOrder.create + PurchaseOrderItem.create +
 * PurchaseOrder.updateTotals all run through the Manifest runtime
 * (constitution §9). requireCurrentUser supplies the actor + tenant for
 * policy + audit context (§19).
 *
 * NOTE: submittedBy/submittedAt are intentionally NOT set here — the PO is
 * still in draft status. These fields belong to the `submit` command.
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const parsed = purchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: `Validation failed: ${z.prettifyError(parsed.error)}` };
  }
  const data = parsed.data;

  // Resolve locationId: prefer explicit selection, fall back to first active storage location
  let locationId = data.locationId;
  if (!locationId) {
    locationId =
      (await listStorageLocations()).data.find((location) => location.is_active)?.id ??
      null;
  }
  invariant(locationId, "No location available — select one explicitly");

  // Generate a unique PO number
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const poNumber = generatePoNumber(year, suffix);

  // Calculate subtotal
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  // --- Governed create: PurchaseOrder header ---
  const headerResult = await runManifestCommand({
    entity: "PurchaseOrder",
    command: "create",
    body: {
      poNumber,
      vendorId: data.vendorId,
      locationId,
      notes: data.notes ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!headerResult.ok) {
    throw new Error(headerResult.message || "Failed to create purchase order");
  }

  const orderId = (headerResult.result as Record<string, unknown>)
    ?.id as string;

  // --- Governed create: PurchaseOrderItem for each line item ---
  for (const item of data.items) {
    const itemResult = await runManifestCommand({
      entity: "PurchaseOrderItem",
      command: "create",
      body: {
        purchaseOrderId: orderId,
        itemId: item.itemId,
        quantityOrdered: item.quantityOrdered,
        unitId: item.unitId,
        unitCost: item.unitCost,
        notes: "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!itemResult.ok) {
      throw new Error(
        itemResult.message || "Failed to create purchase order item"
      );
    }
  }

  // --- Update header financial fields via governed command ---
  const totalsResult = await runManifestCommand({
    entity: "PurchaseOrder",
    command: "updateTotals",
    instanceId: orderId,
    body: {
      subtotal,
      total: subtotal,
      itemCount: data.items.length,
      expectedDeliveryDate: data.expectedDeliveryDate
        ? new Date(`${data.expectedDeliveryDate}T00:00:00.000Z`).getTime()
        : 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!totalsResult.ok) {
    throw new Error(
      totalsResult.message || "Failed to update purchase order totals"
    );
  }

  revalidatePath("/procurement/purchase-orders");
  revalidatePath("/procurement");
  redirect(`/procurement/purchase-orders/${orderId}`);
}

/**
 * Create a new purchase requisition with line items.
 *
 * Governed write: PurchaseRequisition.create + PurchaseRequisitionItem.create
 * run through the Manifest runtime (constitution §9). After items are created,
 * completeDraftFromPrepDemand updates the header financial fields.
 * requireCurrentUser supplies the actor + tenant for policy + audit (§19).
 */
export async function createPurchaseRequisition(
  input: CreatePurchaseRequisitionInput
) {
  const user = await requireCurrentUser();

  const parsed = purchaseRequisitionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: `Validation failed: ${z.prettifyError(parsed.error)}` };
  }
  const data = parsed.data;

  // Calculate estimated totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantityRequested * item.estimatedUnitCost,
    0
  );

  // Generate a unique requisition number
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const requisitionNumber = generateRequisitionNumber(year, suffix);

  // --- Governed create: PurchaseRequisition header ---
  const headerResult = await runManifestCommand({
    entity: "PurchaseRequisition",
    command: "create",
    body: {
      requisitionNumber,
      locationId: "",
      department: data.department ?? "",
      requestedBy: user.id,
      requiredBy: data.requiredBy
        ? new Date(`${data.requiredBy}T00:00:00.000Z`).getTime()
        : 0,
      justification: data.justification ?? "",
      priority: data.priority,
      itemCategory: "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!headerResult.ok) {
    throw new Error(
      headerResult.message || "Failed to create purchase requisition"
    );
  }

  const requisitionId = (headerResult.result as Record<string, unknown>)
    ?.id as string;

  // --- Governed create: PurchaseRequisitionItem for each line item ---
  for (const item of data.items) {
    const itemResult = await runManifestCommand({
      entity: "PurchaseRequisitionItem",
      command: "create",
      body: {
        requisitionId,
        itemId: item.itemId,
        itemName: item.itemName ?? "",
        quantityRequested: item.quantityRequested,
        unitId: 0,
        estimatedUnitCost: item.estimatedUnitCost,
        suggestedVendorId: "",
        suggestedVendorName: "",
        specifications: "",
        notes: "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!itemResult.ok) {
      throw new Error(
        itemResult.message || "Failed to create requisition item"
      );
    }
  }

  // --- Update header financial fields via governed command ---
  const completeResult = await runManifestCommand({
    entity: "PurchaseRequisition",
    command: "completeDraftFromPrepDemand",
    instanceId: requisitionId,
    body: {
      itemCount: data.items.length,
      subtotal,
      estimatedTax: 0,
      estimatedShipping: 0,
      estimatedTotal: subtotal,
      notes: data.notes ?? "",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!completeResult.ok) {
    throw new Error(
      completeResult.message || "Failed to complete requisition draft"
    );
  }

  revalidatePath("/procurement/requisitions");
  revalidatePath("/procurement");
  redirect("/procurement/requisitions");
}
