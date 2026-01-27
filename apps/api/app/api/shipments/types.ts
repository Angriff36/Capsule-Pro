/**
 * Shipment Management API Types
 */

// Shipment Status values from schema
export const SHIPMENT_STATUSES = [
  "draft",
  "scheduled",
  "preparing",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

// Shipment Item condition values
export const ITEM_CONDITIONS = [
  "good",
  "damaged",
  "spoiled",
  "short",
  "excess",
] as const;
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

/**
 * Shipment response shape matching Prisma model
 */
export type Shipment = {
  id: string;
  tenant_id: string;
  shipment_number: string;
  status: ShipmentStatus;

  // Foreign Keys
  event_id: string | null;
  supplier_id: string | null;
  location_id: string | null;

  // Dates
  scheduled_date: Date | null;
  shipped_date: Date | null;
  estimated_delivery_date: Date | null;
  actual_delivery_date: Date | null;

  // Financials
  total_items: number;
  shipping_cost: number | null;
  total_value: number | null;

  // Tracking
  tracking_number: string | null;
  carrier: string | null;
  shipping_method: string | null;

  // Delivery confirmation
  delivered_by: string | null;
  received_by: string | null;
  signature: string | null;

  // Notes
  notes: string | null;
  internal_notes: string | null;
  reference: string | null;

  // Audit fields
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

/**
 * Shipment with items
 */
export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

/**
 * Shipment Item response shape matching Prisma model
 */
export type ShipmentItem = {
  id: string;
  tenant_id: string;
  shipment_id: string;

  // Foreign Keys
  item_id: string;

  // Quantities
  quantity_shipped: number;
  quantity_received: number;
  quantity_damaged: number;

  // Unit Information
  unit_id: number | null;
  unit_cost: number | null;

  // Financials
  total_cost: number;

  // Quality/Condition
  condition: string | null;
  condition_notes: string | null;

  // Lot/Batch Information
  lot_number: string | null;
  expiration_date: Date | null;

  // Audit fields
  created_at: Date;
  updated_at: Date;
};

/**
 * Create shipment request
 */
export type CreateShipmentRequest = {
  shipment_number?: string;
  status?: ShipmentStatus;
  event_id?: string;
  supplier_id?: string;
  location_id?: string;
  scheduled_date?: string;
  estimated_delivery_date?: string;
  shipping_cost?: number;
  tracking_number?: string;
  carrier?: string;
  shipping_method?: string;
  notes?: string;
  internal_notes?: string;
};

/**
 * Update shipment request
 */
export type UpdateShipmentRequest = {
  shipment_number?: string;
  status?: ShipmentStatus;
  event_id?: string;
  supplier_id?: string;
  location_id?: string;
  scheduled_date?: string;
  shipped_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_cost?: number;
  total_value?: number;
  tracking_number?: string;
  carrier?: string;
  shipping_method?: string;
  delivered_by?: string;
  received_by?: string;
  signature?: string;
  notes?: string;
  internal_notes?: string;
  reference?: string;
};

/**
 * Update shipment status request
 */
export type UpdateShipmentStatusRequest = {
  status: ShipmentStatus;
  actual_delivery_date?: string;
  delivered_by?: string;
  received_by?: string;
  signature?: string;
  notes?: string;
};

/**
 * Create shipment item request
 */
export type CreateShipmentItemRequest = {
  item_id: string;
  quantity_shipped: number;
  quantity_received?: number;
  quantity_damaged?: number;
  unit_id?: number;
  unit_cost?: number;
  condition?: string;
  condition_notes?: string;
  lot_number?: string;
  expiration_date?: string;
};

/**
 * Update shipment item request
 */
export type UpdateShipmentItemRequest = {
  quantity_shipped?: number;
  quantity_received?: number;
  quantity_damaged?: number;
  unit_id?: number;
  unit_cost?: number;
  condition?: string;
  condition_notes?: string;
  lot_number?: string;
  expiration_date?: string;
};

/**
 * List filters
 */
export type ShipmentFilters = {
  search?: string;
  status?: ShipmentStatus;
  event_id?: string;
  supplier_id?: string;
  location_id?: string;
  date_from?: string;
  date_to?: string;
};

/**
 * Pagination params
 */
export type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Paginated list response
 */
export type ShipmentListResponse = {
  data: Shipment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
