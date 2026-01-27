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
export type POItem = {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_id: number;
  unit_cost: number;
  total_cost: number;
  quality_status: QualityStatus;
  discrepancy_type: DiscrepancyType | null;
  discrepancy_amount: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

/**
 * Purchase Order Item with inventory details
 */
export interface POItemWithDetails extends POItem {
  item_number?: string;
  item_name?: string;
}

/**
 * Purchase Order response shape
 */
export type PurchaseOrder = {
  id: string;
  tenant_id: string;
  po_number: string;
  vendor_id: string;
  location_id: string;
  order_date: Date;
  expected_delivery_date: Date | null;
  actual_delivery_date: Date | null;
  status: POStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  notes: string | null;
  submitted_by: string | null;
  submitted_at: Date | null;
  received_by: string | null;
  received_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

/**
 * Purchase Order with items and vendor details
 */
export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: POItemWithDetails[];
  vendor_name?: string;
  location_name?: string;
  progress?: {
    total_items: number;
    received_items: number;
    percentage: number;
  };
}

/**
 * List filters for purchase orders
 */
export type PurchaseOrderListFilters = {
  search?: string;
  status?: POStatus;
  vendor_id?: string;
  location_id?: string;
  po_number?: string;
};

/**
 * Update quantity received request
 */
export type UpdateQuantityReceivedRequest = {
  quantity_received: number;
};

/**
 * Update quality status request
 */
export type UpdateQualityStatusRequest = {
  quality_status: QualityStatus;
  discrepancy_type?: DiscrepancyType;
  discrepancy_amount?: number;
  notes?: string;
};

/**
 * Complete receiving request
 */
export type CompleteReceivingRequest = {
  items: Array<{
    id: string;
    quantity_received: number;
    quality_status: QualityStatus;
    discrepancy_type?: DiscrepancyType;
    discrepancy_amount?: number;
    notes?: string;
  }>;
  notes?: string;
};

/**
 * Paginated list response
 */
export type PurchaseOrderListResponse = {
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
