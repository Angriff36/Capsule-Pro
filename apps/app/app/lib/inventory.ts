"use client";

import { formatCurrency } from "@repo/design-system/lib/format-currency";
import { apiFetch } from "@/app/lib/api";
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
  id: string;
  tenant_id: string;
  item_number: string;
  name: string;
  description: string | null;
  category: string;
  unit_of_measure: string;
  barcode: string | null;
  unit_cost: number;
  quantity_on_hand: number;
  par_level: number;
  reorder_level: number;
  supplier_id: string | null;
  tags: string[];
  fsa_status: FSAStatus | null;
  fsa_temp_logged: boolean | null;
  fsa_allergen_info: boolean | null;
  fsa_traceable: boolean | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
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
  item_number: string;
  name: string;
  description?: string;
  category: string;
  unit_of_measure?: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  par_level?: number;
  reorder_level?: number;
  supplier_id?: string;
  tags?: string[];
  fsa_status?: FSAStatus;
  fsa_temp_logged?: boolean;
  fsa_allergen_info?: boolean;
  fsa_traceable?: boolean;
}

export interface UpdateInventoryItemRequest {
  item_number?: string;
  name?: string;
  description?: string;
  category?: string;
  unit_of_measure?: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  par_level?: number;
  reorder_level?: number;
  supplier_id?: string;
  tags?: string[];
  fsa_status?: FSAStatus;
  fsa_temp_logged?: boolean;
  fsa_allergen_info?: boolean;
  fsa_traceable?: boolean;
}

/**
 * Client-side functions for inventory operations
 */

// List inventory items with pagination and filters
export async function listInventoryItems(params: {
  search?: string;
  category?: string;
  supplierId?: string;
  stockStatus?: StockStatus;
  fsaStatus?: FSAStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<InventoryItemListResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) {
    searchParams.set("search", params.search);
  }
  if (params.category) {
    searchParams.set("category", params.category);
  }
  if (params.supplierId) {
    searchParams.set("supplier_id", params.supplierId);
  }
  if (params.stockStatus) {
    searchParams.set("stock_status", params.stockStatus);
  }
  if (params.fsaStatus) {
    searchParams.set("fsa_status", params.fsaStatus);
  }
  if (params.tags?.length) {
    searchParams.set("tags", params.tags.join(","));
  }
  if (params.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  const response = await apiFetch(
    `/api/inventory/items?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list inventory items");
  }

  return response.json();
}

// Get a single inventory item by ID
export async function getInventoryItem(
  itemId: string
): Promise<InventoryItemWithStatus> {
  const response = await apiFetch(`/api/inventory/items/${itemId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get inventory item");
  }

  return response.json();
}

// Create a new inventory item
export async function createInventoryItem(
  request: CreateInventoryItemRequest
): Promise<InventoryItemWithStatus> {
  const response = await apiFetch("/api/inventory/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create inventory item");
  }

  return response.json();
}

// Update an inventory item
export async function updateInventoryItem(
  itemId: string,
  request: UpdateInventoryItemRequest
): Promise<InventoryItemWithStatus> {
  const response = await apiFetch(`/api/inventory/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update inventory item");
  }

  return response.json();
}

// Delete an inventory item (soft delete)
export async function deleteInventoryItem(itemId: string): Promise<void> {
  const response = await apiFetch(`/api/inventory/items/${itemId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete inventory item");
  }
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
  const response = await apiFetch("/api/inventory/suppliers/list?limit=500");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list suppliers");
  }
  const data = await response.json();
  return (data.inventorySuppliers ?? []).map((s: { id: string; name: string; supplier_number: string }) => ({
    id: s.id,
    name: s.name,
    supplier_number: s.supplier_number,
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
  tags?: string[];
  unit_cost?: number;
  reorder_level?: number;
}

export interface BatchUpdateResponse {
  success: boolean;
  action: "update";
  updated: number;
  updates: BatchUpdateRequest;
}

export interface BatchDeleteResponse {
  success: boolean;
  action: "delete";
  deleted: number;
}

export type BatchResponse = BatchUpdateResponse | BatchDeleteResponse;

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
  row: number;
  message: string;
}

export interface ImportResponse {
  success: number;
  errors: ImportError[];
}

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
