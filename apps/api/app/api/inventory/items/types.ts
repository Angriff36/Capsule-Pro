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

/**
 * Update inventory item request
 */
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
 * List filters
 */
export interface InventoryItemListFilters {
  category?: string;
  fsa_status?: FSAStatus;
  search?: string;
  stock_status?: StockStatus;
  supplier_id?: string;
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
  categories?: string[];
  limit?: number;
  query: string;
  tags?: string[];
}
