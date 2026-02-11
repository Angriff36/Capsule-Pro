/**
 * Inventory Item Management API Types
 */

// FSA Status values for food safety compliance
export const FSA_STATUSES = [
  "unknown",
  "requires_review",
  "compliant",
  "non_compliant",
  "exempt",
] as const;
export type FSAStatus = (typeof FSA_STATUSES)[number];

// Item categories for organization
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

// Units of measure for inventory items
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

// Stock status based on quantity vs reorder level
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * Inventory Item response shape
 */
export interface InventoryItem {
  id: string;
  tenant_id: string;
  item_number: string;
  name: string;
  description: string | null;
  category: string;
  unit_of_measure: string;
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

/**
 * Update inventory item request
 */
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
 * List filters
 */
export interface InventoryItemListFilters {
  search?: string;
  category?: string;
  supplier_id?: string;
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
