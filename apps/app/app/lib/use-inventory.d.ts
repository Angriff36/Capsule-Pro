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
export declare function listInventoryItems(params: {
  search?: string;
  category?: string;
  stockStatus?: StockStatus;
  fsaStatus?: FSAStatus;
  tags?: string[];
  page?: number;
  limit?: number;
}): Promise<InventoryItemListResponse>;
export declare function getInventoryItem(
  itemId: string
): Promise<InventoryItemWithStatus>;
export declare function createInventoryItem(
  request: CreateInventoryItemRequest
): Promise<InventoryItemWithStatus>;
export declare function updateInventoryItem(
  itemId: string,
  request: UpdateInventoryItemRequest
): Promise<InventoryItemWithStatus>;
export declare function deleteInventoryItem(itemId: string): Promise<void>;
export declare function getStockStatusColor(status: StockStatus): string;
export declare function getStockStatusLabel(status: StockStatus): string;
export declare function getFSAStatusColor(status: FSAStatus): string;
export declare function getFSAStatusLabel(status: FSAStatus): string;
export declare function getCategoryLabel(category: ItemCategory): string;
export declare function formatCurrency(amount: number): string;
export declare function formatQuantity(quantity: number): string;
//# sourceMappingURL=use-inventory.d.ts.map
