"use client";

import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  inventoryItemCreate,
  inventoryItemSoftDelete,
  inventoryItemUpdate,
  listInventorySuppliers,
} from "@/app/lib/manifest-client.generated";
import { mapConvexInventoryItemToUi } from "@/app/lib/inventory-convex-mapper";
import {
  activeTenantRows,
  type ConvexDoc,
} from "@/app/lib/convex/doc-utils";
import { fetchConvexList, fetchConvexRecord } from "@/app/lib/convex/read-bridge";
import { apiFetch } from "@/app/lib/api";
import type { InventoryItem as GeneratedInventoryItem } from "@/app/lib/manifest-types.generated";
// Type definitions matching the API response
export const FSA_STATUSES = [
  "unknown",
  "requires_review",
  "compliant",
  "non_compliant",
  "exempt",
] as const;
export type FSAStatus = (typeof FSA_STATUSES)[number];

export const ITEM_CATEGORIES = [
  "dairy",
  "meat",
  "poultry",
  "seafood",
  "produce",
  "dry_goods",
  "frozen",
  "beverages",
  "supplies",
  "equipment",
  "other",
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export const UNITS_OF_MEASURE = [
  "each",
  "lb",
  "oz",
  "kg",
  "g",
  "gal",
  "qt",
  "pt",
  "cup",
  "tbsp",
  "tsp",
  "ml",
  "l",
  "case",
  "box",
  "bag",
  "can",
  "bottle",
  "jar",
  "pack",
] as const;
export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  barcode: string | null;
  category: string;
  created_at: Date;
  deleted_at: Date | null;
  description: string | null;
  fsa_allergen_info: boolean | null;
  fsa_status: FSAStatus | null;
  fsa_temp_logged: boolean | null;
  fsa_traceable: boolean | null;
  id: string;
  item_number: string;
  name: string;
  par_level: number;
  quantity_on_hand: number;
  reorder_level: number;
  supplier_id: string | null;
  tags: string[];
  tenant_id: string;
  unit_cost: number;
  unit_of_measure: string;
  updated_at: Date;
}

export interface InventoryItemWithStatus extends InventoryItem {
  stock_status: StockStatus;
  total_value: number;
}

export interface InventoryItemListResponse {
  data: InventoryItemWithStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateInventoryItemRequest {
  category: string;
  description?: string;
  fsa_allergen_info?: boolean;
  fsa_status?: FSAStatus;
  fsa_temp_logged?: boolean;
  fsa_traceable?: boolean;
  item_number: string;
  name: string;
  par_level?: number;
  quantity_on_hand?: number;
  reorder_level?: number;
  supplier_id?: string;
  tags?: string[];
  unit_cost?: number;
  unit_of_measure?: string;
}

export interface UpdateInventoryItemRequest {
  category?: string;
  description?: string;
  fsa_allergen_info?: boolean;
  fsa_status?: FSAStatus;
  fsa_temp_logged?: boolean;
  fsa_traceable?: boolean;
  item_number?: string;
  name?: string;
  par_level?: number;
  quantity_on_hand?: number;
  reorder_level?: number;
  supplier_id?: string;
  tags?: string[];
  unit_cost?: number;
  unit_of_measure?: string;
}

/**
 * Client-side functions for inventory operations
 */

// List inventory items with pagination and filters
export async function listInventoryItems(params: {
  search?: string;
  barcode?: string;
  category?: string;
  supplierId?: string;
  stockStatus?: StockStatus;
  fsaStatus?: FSAStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<InventoryItemListResponse> {
  const rows = (await fetchConvexList("InventoryItem")) as ConvexDoc[];
  let items = activeTenantRows(rows).map(mapConvexInventoryItemToUi);

  if (params.barcode) {
    items = items.filter((i) => i.barcode === params.barcode);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.item_number.toLowerCase().includes(q) ||
        (i.barcode?.toLowerCase().includes(q) ?? false)
    );
  }
  if (params.category) {
    items = items.filter((i) => i.category === params.category);
  }
  if (params.supplierId) {
    items = items.filter((i) => i.supplier_id === params.supplierId);
  }
  if (params.stockStatus) {
    items = items.filter((i) => i.stock_status === params.stockStatus);
  }
  if (params.fsaStatus) {
    items = items.filter((i) => i.fsa_status === params.fsaStatus);
  }
  if (params.tags?.length) {
    items = items.filter((i) =>
      params.tags!.every((tag) => i.tags.includes(tag))
    );
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? items.length || 50;
  const total = items.length;
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getInventoryItem(
  itemId: string
): Promise<InventoryItemWithStatus> {
  const doc = (await fetchConvexRecord("InventoryItem", itemId)) as
    | ConvexDoc
    | null;
  if (!doc || doc.deletedAt != null) {
    throw new Error("Failed to get inventory item");
  }
  return mapConvexInventoryItemToUi(doc);
}

// Create a new inventory item
export async function createInventoryItem(
  request: CreateInventoryItemRequest
): Promise<GeneratedInventoryItem> {
  const result = await inventoryItemCreate({
    item_number: request.item_number,
    name: request.name,
    description: request.description,
    category: request.category,
    unitOfMeasure: request.unit_of_measure,
    unitCost: request.unit_cost,
    quantityOnHand: request.quantity_on_hand,
    parLevel: request.par_level,
    reorder_level: request.reorder_level,
    supplierId: request.supplier_id,
    tags: request.tags,
    fsa_status: request.fsa_status,
    fsa_temp_logged: request.fsa_temp_logged,
    fsa_allergen_info: request.fsa_allergen_info,
    fsa_traceable: request.fsa_traceable,
  });
  if (!result) {
    throw new Error("Failed to create inventory item");
  }
  return result;
}

// Update an inventory item
export async function updateInventoryItem(
  itemId: string,
  request: UpdateInventoryItemRequest
): Promise<GeneratedInventoryItem> {
  const result = await inventoryItemUpdate({
    id: itemId,
    name: request.name,
    description: request.description,
    category: request.category,
    unitOfMeasure: request.unit_of_measure,
    unitCost: request.unit_cost,
    quantityOnHand: request.quantity_on_hand,
    parLevel: request.par_level,
    reorder_level: request.reorder_level,
    supplierId: request.supplier_id,
    tags: request.tags,
    fsa_status: request.fsa_status,
    fsa_temp_logged: request.fsa_temp_logged as unknown as string | undefined,
    fsa_allergen_info: request.fsa_allergen_info as unknown as
      | string
      | undefined,
    fsa_traceable: request.fsa_traceable as unknown as string | undefined,
  });
  if (!result) {
    throw new Error("Failed to update inventory item");
  }
  return result;
}

// Delete an inventory item (soft delete)
export async function deleteInventoryItem(itemId: string): Promise<void> {
  await inventoryItemSoftDelete({ id: itemId });
}

// Helper to get stock status badge color
export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "bg-green-100 text-green-800 border-green-200";
    case "low_stock":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "out_of_stock":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Helper to get stock status label
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return "Unknown";
  }
}

// Helper to get FSA status badge color
export function getFSAStatusColor(status: FSAStatus): string {
  switch (status) {
    case "compliant":
      return "bg-green-100 text-green-800 border-green-200";
    case "non_compliant":
      return "bg-red-100 text-red-800 border-red-200";
    case "requires_review":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "exempt":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Helper to get FSA status label
export function getFSAStatusLabel(status: FSAStatus): string {
  switch (status) {
    case "compliant":
      return "Compliant";
    case "non_compliant":
      return "Non-Compliant";
    case "requires_review":
      return "Review Required";
    case "exempt":
      return "Exempt";
    default:
      return "Unknown";
  }
}

// Helper to get category label
export function getCategoryLabel(category: ItemCategory): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper to get unit of measure label
export function getUnitLabel(unit: UnitOfMeasure): string {
  const labels: Record<UnitOfMeasure, string> = {
    each: "Each",
    lb: "Pound (lb)",
    oz: "Ounce (oz)",
    kg: "Kilogram (kg)",
    g: "Gram (g)",
    gal: "Gallon (gal)",
    qt: "Quart (qt)",
    pt: "Pint (pt)",
    cup: "Cup",
    tbsp: "Tablespoon (tbsp)",
    tsp: "Teaspoon (tsp)",
    ml: "Milliliter (ml)",
    l: "Liter (l)",
    case: "Case",
    box: "Box",
    bag: "Bag",
    can: "Can",
    bottle: "Bottle",
    jar: "Jar",
    pack: "Pack",
  };
  return labels[unit];
}

// Supplier type for dropdown
export interface Supplier {
  id: string;
  name: string;
  supplier_number: string;
}

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await listInventorySuppliers();
  return data.map((s) => ({
    id: String(s.id ?? (s as { _id?: string })._id ?? ""),
    name: String(s.name ?? ""),
    supplier_number: String(
      (s as { supplier_number?: string }).supplier_number ??
        (s as { supplierNumber?: string }).supplierNumber ??
        ""
    ),
  }));
}

export { formatCurrency };

// Helper to format quantity
export function formatQuantity(quantity: number): string {
  return quantity.toFixed(3);
}

// ---------------------------------------------------------------------------
// Batch Operations
// ---------------------------------------------------------------------------

export interface BatchUpdateRequest {
  category?: ItemCategory;
  fsa_status?: FSAStatus;
  reorder_level?: number;
  tags?: string[];
  unit_cost?: number;
}

export interface BatchUpdateResponse {
  action: "update";
  success: boolean;
  updated: number;
  updates: BatchUpdateRequest;
}

export interface BatchDeleteResponse {
  action: "delete";
  deleted: number;
  success: boolean;
}

export type BatchResponse = BatchUpdateResponse | BatchDeleteResponse;

// NOTE: Keeping apiFetch for batch update — no generated batch operation exists
/**
 * Batch update inventory items (category, fsa_status, tags, unit_cost, reorder_level)
 */
export async function batchUpdateItems(
  ids: string[],
  updates: BatchUpdateRequest
): Promise<BatchUpdateResponse> {
  const response = await apiFetch("/api/inventory/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", ids, updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to batch update inventory items");
  }

  return response.json();
}

// NOTE: Keeping apiFetch for batch delete — no generated batch operation exists
/**
 * Batch delete inventory items (soft delete)
 */
export async function batchDeleteItems(
  ids: string[]
): Promise<BatchDeleteResponse> {
  const response = await apiFetch("/api/inventory/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", ids }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to batch delete inventory items");
  }

  return response.json();
}

export interface ImportError {
  message: string;
  row: number;
}

export interface ImportResponse {
  errors: ImportError[];
  success: number;
}

// NOTE: Keeping apiFetch for CSV file import — no generated file upload equivalent
/**
 * Import inventory items from a CSV File object
 */
export async function importInventoryItemsFromCSV(
  file: File
): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiFetch("/api/inventory/import", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to import inventory items");
  }

  return response.json();
}
