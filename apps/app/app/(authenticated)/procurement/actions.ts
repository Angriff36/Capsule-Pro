"use server";

/**
 * Procurement Server Actions
 *
 * Server actions for Purchase Order and Purchase Requisition creation.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { invariant } from "@/app/lib/invariant";
import { getTenantId } from "@/app/lib/tenant";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const purchaseOrderItemSchema = z.object({
  itemId: z.string().uuid(),
  quantityOrdered: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0),
  unitId: z.coerce.number().int().default(1),
});

const purchaseOrderSchema = z.object({
  vendorId: z.string().uuid("Invalid vendor"),
  locationId: z.string().uuid("Invalid location").optional().nullable(),
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
  itemId: z.string().uuid(),
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

async function requireAuth() {
  const { orgId } = await auth();
  invariant(orgId, "Unauthorized");

  const user = await auth();
  invariant(user.userId, "Unauthorized");
  const tenantId = await getTenantId();
  return { tenantId, userId: user.userId };
}

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
 * This action accepts a typed input object (called from onSubmit) rather than
 * FormData, because the line items are managed in React state.
 */
export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const { tenantId, userId } = await requireAuth();

  const data = purchaseOrderSchema.parse(input);

  // Resolve locationId: prefer explicit selection, fall back to primary or first active location
  let locationId = data.locationId;
  if (!locationId) {
    const fallback = await database.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tenant.locations
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND is_active = true
      ORDER BY is_primary DESC, name ASC
      LIMIT 1
    `;
    if (fallback.length > 0) {
      locationId = fallback[0].id;
    }
  }
  invariant(locationId, "No location available — create a location first");

  // Calculate subtotal
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCost,
    0
  );

  // Generate a unique PO number
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const poNumber = generatePoNumber(year, suffix);

  const order = await database.purchaseOrder.create({
    data: {
      tenantId,
      poNumber,
      vendorId: data.vendorId,
      expectedDeliveryDate: data.expectedDeliveryDate
        ? new Date(`${data.expectedDeliveryDate}T00:00:00.000Z`)
        : null,
      notes: data.notes,
      subtotal,
      total: subtotal,
      submittedBy: userId,
      submittedAt: new Date(),
      status: "draft",
      locationId,
      items: {
        create: data.items.map((item) => ({
          tenantId,
          itemId: item.itemId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          unitId: item.unitId,
          totalCost: item.quantityOrdered * item.unitCost,
        })),
      },
    },
  });

  revalidatePath("/procurement/purchase-orders");
  revalidatePath("/procurement");
  redirect(`/procurement/purchase-orders/${order.id}`);
}

/**
 * Create a new purchase requisition with line items.
 *
 * This action accepts a typed input object (called from onSubmit) rather than
 * FormData, because the line items are managed in React state.
 */
export async function createPurchaseRequisition(
  input: CreatePurchaseRequisitionInput
) {
  const { tenantId, userId } = await requireAuth();

  const data = purchaseRequisitionSchema.parse(input);

  // Calculate estimated totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + item.quantityRequested * item.estimatedUnitCost,
    0
  );

  // Generate a unique requisition number
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const requisitionNumber = generateRequisitionNumber(year, suffix);

  const requisition = await database.purchaseRequisition.create({
    data: {
      tenantId,
      requisitionNumber,
      requestedBy: userId,
      requiredBy: data.requiredBy
        ? new Date(`${data.requiredBy}T00:00:00.000Z`)
        : null,
      department: data.department,
      justification: data.justification,
      priority: data.priority,
      notes: data.notes,
      subtotal,
      estimatedTotal: subtotal,
      items: {
        create: data.items.map((item) => ({
          tenantId,
          itemId: item.itemId,
          itemName: item.itemName,
          quantityRequested: item.quantityRequested,
          estimatedUnitCost: item.estimatedUnitCost,
          estimatedTotalCost: item.estimatedTotalCost,
        })),
      },
    },
  });

  revalidatePath("/procurement/requisitions");
  revalidatePath("/procurement");
  redirect("/procurement/requisitions");
}
