"use client";

import { invariant } from "./invariant";

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

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_number: string;
  name: string;
  category: string;
  unit_cost: number;
  quantity_on_hand: number;
  reorder_level: number;
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
  category: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  reorder_level?: number;
  tags?: string[];
  fsa_status?: FSAStatus;
  fsa_temp_logged?: boolean;
  fsa_allergen_info?: boolean;
  fsa_traceable?: boolean;
}

export interface UpdateInventoryItemRequest {
  item_number?: string;
  name?: string;
  category?: string;
  unit_cost?: number;
  quantity_on_hand?: number;
  reorder_level?: number;
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
  stockStatus?: StockStatus;
  fsaStatus?: FSAStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<InventoryItemListResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.stockStatus) searchParams.set("stock_status", params.stockStatus);
  if (params.fsaStatus) searchParams.set("fsa_status", params.fsaStatus);
  if (params.tags?.length) searchParams.set("tags", params.tags.join(","));
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const response = await fetch(`/api/inventory/items?${searchParams.toString()}`);

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
  const response = await fetch(`/api/inventory/items/${itemId}`);

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
  const response = await fetch("/api/inventory/items", {
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
  const response = await fetch(`/api/inventory/items/${itemId}`, {
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
  const response = await fetch(`/api/inventory/items/${itemId}`, {
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

// Helper to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Helper to format quantity
export function formatQuantity(quantity: number): string {
  return quantity.toFixed(3);
}
