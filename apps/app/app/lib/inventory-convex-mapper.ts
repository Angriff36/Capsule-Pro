import type {
  FSAStatus,
  InventoryItemWithStatus,
  StockStatus,
} from "@/app/lib/inventory";
import {
  type ConvexDoc,
  convexDocId,
  msToDate,
  parseDecimalString,
} from "@/app/lib/convex/doc-utils";

function stockStatus(quantity: number, reorder: number): StockStatus {
  if (quantity <= 0) {
    return "out_of_stock";
  }
  if (quantity <= reorder) {
    return "low_stock";
  }
  return "in_stock";
}

export function mapConvexInventoryItemToUi(
  doc: ConvexDoc
): InventoryItemWithStatus {
  const quantity = parseDecimalString(doc.quantityOnHand);
  const reorder = parseDecimalString(doc.reorder_level);
  const unitCost = parseDecimalString(doc.unitCost);

  return {
    id: convexDocId(doc),
    tenant_id: String(doc.tenantId ?? ""),
    item_number: String(doc.item_number ?? ""),
    name: String(doc.name ?? ""),
    description: (doc.description as string | null) ?? null,
    category: String(doc.category ?? ""),
    unit_of_measure: String(doc.unitOfMeasure ?? "each"),
    unit_cost: unitCost,
    quantity_on_hand: quantity,
    par_level: parseDecimalString(doc.parLevel),
    reorder_level: reorder,
    supplier_id: (doc.supplierId as string | null) ?? null,
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    fsa_status: (doc.fsa_status as FSAStatus | null) ?? null,
    fsa_temp_logged: (doc.fsa_temp_logged as boolean | null) ?? null,
    fsa_allergen_info: (doc.fsa_allergen_info as boolean | null) ?? null,
    fsa_traceable: (doc.fsa_traceable as boolean | null) ?? null,
    barcode: (doc.barcode as string | null) ?? null,
    deleted_at: msToDate(doc.deletedAt),
    created_at: msToDate(doc.createdAt) ?? new Date(0),
    updated_at: msToDate(doc.updatedAt) ?? new Date(0),
    stock_status: stockStatus(quantity, reorder),
    total_value: quantity * unitCost,
  };
}
