/**
 * Stock Levels Client API Functions
 *
 * Client-side functions for interacting with stock levels API.
 */
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
/**
 * List stock levels with pagination and filters
 */
export declare function listStockLevels(
  filters?: StockLevelFilters
): Promise<StockLevelListResponse>;
/**
 * Create a stock adjustment
 */
export declare function createAdjustment(
  request: CreateAdjustmentRequest
): Promise<CreateAdjustmentResponse>;
/**
 * List transaction history
 */
export declare function listTransactions(
  filters?: TransactionFilters
): Promise<TransactionListResponse>;
/**
 * List storage locations
 */
export declare function listLocations(): Promise<LocationListResponse>;
/**
 * Get CSS class for reorder status badge
 */
export declare function getReorderStatusColor(
  status: StockReorderStatus
): string;
/**
 * Get label for reorder status
 */
export declare function getReorderStatusLabel(
  status: StockReorderStatus
): string;
/**
 * Get CSS class for transaction type badge
 */
export declare function getTransactionTypeColor(type: TransactionType): string;
/**
 * Get label for transaction type
 */
export declare function getTransactionTypeLabel(type: TransactionType): string;
/**
 * Get label for adjustment reason
 */
export declare function getAdjustmentReasonLabel(
  reason: AdjustmentReason
): string;
/**
 * Format currency value
 */
export declare function formatCurrency(value: number): string;
/**
 * Format quantity with fixed decimals
 */
export declare function formatQuantity(
  value: number,
  decimals?: number
): string;
/**
 * Format date for display
 */
export declare function formatDate(date: Date | string): string;
/**
 * Format date for date input (YYYY-MM-DD)
 */
export declare function formatDateForInput(date: Date | string): string;
/**
 * Get all adjustment reasons
 */
export declare function getAdjustmentReasons(): AdjustmentReason[];
/**
 * Get all transaction types
 */
export declare function getTransactionTypes(): TransactionType[];
//# sourceMappingURL=use-stock-levels.d.ts.map
