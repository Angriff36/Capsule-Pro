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
export type AdjustmentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed";

// ============================================================================
// Stock Level Types
// ============================================================================

/**
 * Stock level at a specific location
 */
export interface StockLevel {
  createdAt: Date;
  id: string;
  inventoryItemId: string;
  lastCountedAt: Date | null;
  parLevel: number | null;
  quantityOnHand: number;
  reorderLevel: number;
  storageLocationId: string | null;
  tenantId: string;
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
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set";
  reorderStatus: StockReorderStatus;
  stockOutRisk: boolean;
  totalValue: number;
}

/**
 * Filters for listing stock levels
 */
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
  adjustmentType: "increase" | "decrease";
  inventoryItemId: string;
  notes?: string;
  quantity: number;
  reason: AdjustmentReason;
  referenceId?: string;
  storageLocationId: string | null;
}

/**
 * Response after creating an adjustment
 */
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

// ============================================================================
// Transaction Types
// ============================================================================

/**
 * Inventory transaction record
 */
export interface InventoryTransaction {
  createdAt: Date;
  id: string;
  inventoryItemId: string;
  notes: string | null;
  performedBy: string | null;
  quantity: number;
  reason: AdjustmentReason | null;
  referenceId: string | null;
  referenceType: string | null;
  storageLocationId: string | null;
  tenantId: string;
  totalCost: number | null;
  transactionType: TransactionType;
  unitCost: number | null;
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
  performedByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  storageLocation: {
    id: string;
    name: string;
  } | null;
}

/**
 * Filters for listing transactions
 */
export interface TransactionFilters {
  endDate?: string;
  inventoryItemId?: string;
  limit?: number;
  locationId?: string;
  page?: number;
  startDate?: string;
  transactionType?: TransactionType;
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
  address: string | null;
  createdAt: Date;
  id: string;
  isActive: boolean;
  locationType: string;
  name: string;
  tenantId: string;
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
