import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  createAdjustmentFromConvex,
  listLocationsFromConvex,
  listStockLevelsFromConvex,
  listTransactionsFromConvex,
} from "@/app/lib/stock-levels-convex";
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
  createdAt: Date;
  id: string;
  inventoryItemId: string;
  item: {
    id: string;
    itemNumber: string;
    name: string;
    category: string;
    unitCost: number;
    unit: string | null;
  };
  lastCountedAt: Date | null;
  parLevel: number | null;
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set";
  quantityOnHand: number;
  reorderLevel: number;
  reorderStatus: StockReorderStatus;
  stockOutRisk: boolean;
  storageLocation: {
    id: string;
    name: string;
  } | null;
  storageLocationId: string | null;
  tenantId: string;
  totalValue: number;
  updatedAt: Date;
}

export interface StockLevelFilters {
  category?: string;
  limit?: number;
  locationId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  reorderStatus?: StockReorderStatus;
  search?: string;
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
  adjustmentType: "increase" | "decrease";
  inventoryItemId: string;
  notes?: string;
  quantity: number;
  reason: AdjustmentReason;
  referenceId?: string;
  storageLocationId: string | null;
}

export interface CreateAdjustmentResponse {
  adjustment: {
    id: string;
    previousQuantity: number;
    newQuantity: number;
    adjustmentAmount: number;
    transactionId: string;
  };
  message: string;
  stockLevel: StockLevelWithStatus;
  success: boolean;
}

export interface InventoryTransaction {
  createdAt: Date;
  id: string;
  inventoryItemId: string;
  item: {
    id: string;
    itemNumber: string;
    name: string;
    category: string;
  } | null;
  notes: string | null;
  performedBy: string | null;
  performedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  quantity: number;
  reason: AdjustmentReason | null;
  referenceId: string | null;
  referenceType: string | null;
  storageLocation: {
    id: string;
    name: string;
  } | null;
  storageLocationId: string | null;
  tenantId: string;
  totalCost: number | null;
  transactionType: TransactionType;
  unitCost: number | null;
}

export interface TransactionFilters {
  endDate?: string;
  inventoryItemId?: string;
  limit?: number;
  locationId?: string;
  page?: number;
  startDate?: string;
  transactionType?: TransactionType;
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
  address: string | null;
  createdAt: Date;
  id: string;
  isActive: boolean;
  locationType: string;
  name: string;
  tenantId: string;
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
  return listStockLevelsFromConvex(filters);
}

/**
 * Create a stock adjustment
 */
export async function createAdjustment(
  request: CreateAdjustmentRequest
): Promise<CreateAdjustmentResponse> {
  return createAdjustmentFromConvex(request);
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
  return listTransactionsFromConvex(filters);
}

// ============================================================================
// Locations API
// ============================================================================

/**
 * List storage locations
 */
export async function listLocations(): Promise<LocationListResponse> {
  return listLocationsFromConvex();
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

export { formatCurrency };

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
