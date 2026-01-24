/**
 * Stock Levels Management Types
 *
 * Types for stock levels, adjustments, and transaction history.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Stock level status based on quantity vs reorder point
 */
export type StockReorderStatus = "below_par" | "at_par" | "above_par";

/**
 * Transaction types for inventory movements
 */
export type TransactionType =
  | "purchase"
  | "usage"
  | "adjustment"
  | "transfer"
  | "waste"
  | "return"
  | "production";

/**
 * Adjustment reasons for manual stock changes
 */
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

/**
 * Status for adjustment requests
 */
export type AdjustmentStatus = "pending" | "approved" | "rejected" | "completed";

// ============================================================================
// Stock Level Types
// ============================================================================

/**
 * Stock level at a specific location
 */
export interface StockLevel {
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
}

/**
 * Stock level with associated item details
 */
export interface StockLevelWithItem extends StockLevel {
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
}

/**
 * Stock level with computed status fields
 */
export interface StockLevelWithStatus extends StockLevelWithItem {
  reorderStatus: StockReorderStatus;
  totalValue: number;
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set";
  stockOutRisk: boolean;
}

/**
 * Filters for listing stock levels
 */
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

/**
 * Response for stock levels list endpoint
 */
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

// ============================================================================
// Adjustment Types
// ============================================================================

/**
 * Request to create a stock adjustment
 */
export interface CreateAdjustmentRequest {
  inventoryItemId: string;
  storageLocationId: string | null;
  quantity: number;
  adjustmentType: "increase" | "decrease";
  reason: AdjustmentReason;
  notes?: string;
  referenceId?: string;
}

/**
 * Response after creating an adjustment
 */
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

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Inventory transaction record
 */
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
}

/**
 * Transaction with associated item details
 */
export interface TransactionWithDetails extends InventoryTransaction {
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

/**
 * Filters for listing transactions
 */
export interface TransactionFilters {
  inventoryItemId?: string;
  transactionType?: TransactionType;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Response for transactions list endpoint
 */
export interface TransactionListResponse {
  data: TransactionWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Location Types
// ============================================================================

/**
 * Storage location for inventory
 */
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

/**
 * Response for locations list endpoint
 */
export interface LocationListResponse {
  data: StorageLocation[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid transaction types
 */
export const TRANSACTION_TYPES: TransactionType[] = [
  "purchase",
  "usage",
  "adjustment",
  "transfer",
  "waste",
  "return",
  "production",
];

/**
 * Valid adjustment reasons
 */
export const ADJUSTMENT_REASONS: AdjustmentReason[] = [
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

/**
 * Valid stock reorder statuses
 */
export const STOCK_REORDER_STATUSES: StockReorderStatus[] = [
  "below_par",
  "at_par",
  "above_par",
];

/**
 * Valid adjustment statuses
 */
export const ADJUSTMENT_STATUSES: AdjustmentStatus[] = [
  "pending",
  "approved",
  "rejected",
  "completed",
];
