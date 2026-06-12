/**
 * Warehouse Receiving / Purchase Orders API Types
 */

// Purchase Order Status values
export const PO_STATUSES = [
  "draft",
  "submitted",
  "confirmed",
  "partial",
  "received",
  "cancelled",
] as const;
export type POStatus = (typeof PO_STATUSES)[number];

// Quality Status values for receiving items
export const QUALITY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_inspection",
] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

// Discrepancy Type values
export const DISCREPANCY_TYPES = [
  "none",
  "shortage",
  "overage",
  "damaged",
  "wrong_item",
] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];

/**
 * Purchase Order Item response shape
 */
export interface POItem {
  created_at: Date;
  deleted_at: Date | null;
  discrepancy_amount: number | null;
  discrepancy_type: DiscrepancyType | null;
  id: string;
  item_id: string;
  notes: string | null;
  purchase_order_id: string;
  quality_status: QualityStatus;
  quantity_ordered: number;
  quantity_received: number;
  tenant_id: string;
  total_cost: number;
  unit_cost: number;
  unit_id: number;
  updated_at: Date;
}

/**
 * Purchase Order Item with inventory details
 */
export interface POItemWithDetails extends POItem {
  item_name?: string;
  item_number?: string;
}

/**
 * Purchase Order response shape
 */
export interface PurchaseOrder {
  actual_delivery_date: Date | null;
  created_at: Date;
  deleted_at: Date | null;
  expected_delivery_date: Date | null;
  id: string;
  location_id: string;
  notes: string | null;
  order_date: Date;
  po_number: string;
  received_at: Date | null;
  received_by: string | null;
  shipping_amount: number;
  status: POStatus;
  submitted_at: Date | null;
  submitted_by: string | null;
  subtotal: number;
  tax_amount: number;
  tenant_id: string;
  total: number;
  updated_at: Date;
  vendor_id: string;
}

/**
 * Purchase Order with items and vendor details
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: POItemWithDetails[];
  location_name?: string;
  progress?: {
    total_items: number;
    received_items: number;
    percentage: number;
  };
  vendor_name?: string;
}

/**
 * List filters for purchase orders
 */
export interface PurchaseOrderListFilters {
  location_id?: string;
  po_number?: string;
  search?: string;
  status?: POStatus;
  vendor_id?: string;
}

/**
 * Update quantity received request
 */
export interface UpdateQuantityReceivedRequest {
  quantity_received: number;
}

/**
 * Update quality status request
 */
export interface UpdateQualityStatusRequest {
  discrepancy_amount?: number;
  discrepancy_type?: DiscrepancyType;
  notes?: string;
  quality_status: QualityStatus;
}

/**
 * Complete receiving request
 */
export interface CompleteReceivingRequest {
  items: Array<{
    id: string;
    quantity_received: number;
    quality_status: QualityStatus;
    discrepancy_type?: DiscrepancyType;
    discrepancy_amount?: number;
    notes?: string;
  }>;
  notes?: string;
}

/**
 * Paginated list response
 */
export interface PurchaseOrderListResponse {
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
