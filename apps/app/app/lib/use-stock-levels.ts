import { apiFetch } from "@/app/lib/api";
/**
 * Stock Levels Client API Functions
 *
 * Client-side functions for interacting with stock levels API.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type StockReorderStatus = "below_par" | "at_par" | "above_par";

export type TransactionType =
  | "purchase"
  | "usage"
  | "adjustment"
  | "transfer"
  | "waste"
  | "return"
  | "production";

export type AdjustmentReason =
  | "damage"
  | "expired"
  | "lost"
  | "found"
  | "correction"
  | "physical_count"
  | "theft"
  | "spoilage"
  | "other";

export interface StockLevelWithStatus {
  tenantId: string;
  id: string;
  inventoryItemId: string;
  storageLocationId: string | null;
  quantityOnHand: number;
  reorderLevel: number;
  parLevel: number | null;
  lastCountedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: string;
    itemNumber: string;
    name: string;
    category: string;
    unitCost: number;
    unit: string | null;
  };
  storageLocation: {
    id: string;
    name: string;
  } | null;
  reorderStatus: StockReorderStatus;
  totalValue: number;
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set";
  stockOutRisk: boolean;
}

export interface StockLevelFilters {
  search?: string;
  category?: string;
  locationId?: string;
  reorderStatus?: StockReorderStatus;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
}

export interface StockLevelListResponse {
  data: StockLevelWithStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalItems: number;
    totalValue: number;
    belowParCount: number;
    outOfStockCount: number;
  };
}

export interface CreateAdjustmentRequest {
  inventoryItemId: string;
  storageLocationId: string | null;
  quantity: number;
  adjustmentType: "increase" | "decrease";
  reason: AdjustmentReason;
  notes?: string;
  referenceId?: string;
}

export interface CreateAdjustmentResponse {
  success: boolean;
  message: string;
  adjustment: {
    id: string;
    previousQuantity: number;
    newQuantity: number;
    adjustmentAmount: number;
    transactionId: string;
  };
  stockLevel: StockLevelWithStatus;
}

export interface InventoryTransaction {
  tenantId: string;
  id: string;
  inventoryItemId: string;
  transactionType: TransactionType;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceId: string | null;
  referenceType: string | null;
  storageLocationId: string | null;
  reason: AdjustmentReason | null;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
  item: {
    id: string;
    itemNumber: string;
    name: string;
    category: string;
  } | null;
  storageLocation: {
    id: string;
    name: string;
  } | null;
  performedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface TransactionFilters {
  inventoryItemId?: string;
  transactionType?: TransactionType;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionListResponse {
  data: InventoryTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StorageLocation {
  id: string;
  tenantId: string;
  name: string;
  locationType: string;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationListResponse {
  data: StorageLocation[];
}

// ============================================================================
// Stock Levels API
// ============================================================================

/**
 * List stock levels with pagination and filters
 */
export async function listStockLevels(
  filters: StockLevelFilters = {}
): Promise<StockLevelListResponse> {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }
  if (filters.reorderStatus) {
    params.set("reorderStatus", filters.reorderStatus);
  }
  if (filters.lowStock) {
    params.set("lowStock", "true");
  }
  if (filters.outOfStock) {
    params.set("outOfStock", "true");
  }
  if (filters.page) {
    params.set("page", filters.page.toString());
  }
  if (filters.limit) {
    params.set("limit", filters.limit.toString());
  }

  const response = await apiFetch(
    `/api/inventory/stock-levels?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch stock levels");
  }

  return response.json();
}

/**
 * Create a stock adjustment
 */
export async function createAdjustment(
  request: CreateAdjustmentRequest
): Promise<CreateAdjustmentResponse> {
  const response = await apiFetch("/api/inventory/stock-levels/adjust", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create adjustment");
  }

  return response.json();
}

// ============================================================================
// Transactions API
// ============================================================================

/**
 * List transaction history
 */
export async function listTransactions(
  filters: TransactionFilters = {}
): Promise<TransactionListResponse> {
  const params = new URLSearchParams();

  if (filters.inventoryItemId) {
    params.set("inventoryItemId", filters.inventoryItemId);
  }
  if (filters.transactionType) {
    params.set("transactionType", filters.transactionType);
  }
  if (filters.locationId) {
    params.set("locationId", filters.locationId);
  }
  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }
  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }
  if (filters.page) {
    params.set("page", filters.page.toString());
  }
  if (filters.limit) {
    params.set("limit", filters.limit.toString());
  }

  const response = await apiFetch(
    `/api/inventory/stock-levels/transactions?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch transactions");
  }

  return response.json();
}

// ============================================================================
// Locations API
// ============================================================================

/**
 * List storage locations
 */
export async function listLocations(): Promise<LocationListResponse> {
  const response = await apiFetch("/api/inventory/stock-levels/locations");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch locations");
  }

  return response.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get CSS class for reorder status badge
 */
export function getReorderStatusColor(status: StockReorderStatus): string {
  switch (status) {
    case "below_par":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "at_par":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "above_par":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
}

/**
 * Get label for reorder status
 */
export function getReorderStatusLabel(status: StockReorderStatus): string {
  switch (status) {
    case "below_par":
      return "Below Par";
    case "at_par":
      return "At Par";
    case "above_par":
      return "Above Par";
  }
}

/**
 * Get CSS class for transaction type badge
 */
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case "purchase":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "usage":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "adjustment":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "transfer":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "waste":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "return":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "production":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
  }
}

/**
 * Get label for transaction type
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case "purchase":
      return "Purchase";
    case "usage":
      return "Usage";
    case "adjustment":
      return "Adjustment";
    case "transfer":
      return "Transfer";
    case "waste":
      return "Waste";
    case "return":
      return "Return";
    case "production":
      return "Production";
  }
}

/**
 * Get label for adjustment reason
 */
export function getAdjustmentReasonLabel(reason: AdjustmentReason): string {
  const labels: Record<AdjustmentReason, string> = {
    damage: "Damage",
    expired: "Expired",
    lost: "Lost",
    found: "Found",
    correction: "Correction",
    physical_count: "Physical Count",
    theft: "Theft",
    spoilage: "Spoilage",
    other: "Other",
  };
  return labels[reason] || reason;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format quantity with fixed decimals
 */
export function formatQuantity(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Get all adjustment reasons
 */
export function getAdjustmentReasons(): AdjustmentReason[] {
  return [
    "damage",
    "expired",
    "lost",
    "found",
    "correction",
    "physical_count",
    "theft",
    "spoilage",
    "other",
  ];
}

/**
 * Get all transaction types
 */
export function getTransactionTypes(): TransactionType[] {
  return [
    "purchase",
    "usage",
    "adjustment",
    "transfer",
    "waste",
    "return",
    "production",
  ];
}
