/**
 * Inventory Item Management API Types
 */
export declare const FSA_STATUSES: readonly [
  "unknown",
  "requires_review",
  "compliant",
  "non_compliant",
  "exempt",
];
export type FSAStatus = (typeof FSA_STATUSES)[number];
export declare const ITEM_CATEGORIES: readonly [
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
];
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
/**
 * Inventory Item response shape
 */
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
/**
 * Computed stock status for UI display
 */
export interface InventoryItemWithStatus extends InventoryItem {
  stock_status: StockStatus;
  total_value: number;
}
/**
 * Create inventory item request
 */
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
/**
 * Update inventory item request
 */
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
 * List filters
 */
export interface InventoryItemListFilters {
  search?: string;
  category?: string;
  stock_status?: StockStatus;
  fsa_status?: FSAStatus;
  tags?: string[];
}
/**
 * Paginated list response
 */
export interface InventoryItemListResponse {
  data: InventoryItemWithStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
/**
 * Search parameters
 */
export interface InventoryItemSearchParams {
  query: string;
  categories?: string[];
  tags?: string[];
  limit?: number;
}
//# sourceMappingURL=types.d.ts.map
