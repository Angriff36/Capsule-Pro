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
export interface Shipment {
  actual_delivery_date: Date | null;
  carrier: string | null;

  // Audit fields
  created_at: Date;
  deleted_at: Date | null;

  // Delivery confirmation
  delivered_by: string | null;
  estimated_delivery_date: Date | null;

  // Foreign Keys
  event_id: string | null;
  id: string;
  internal_notes: string | null;
  location_id: string | null;

  // Notes
  notes: string | null;
  received_by: string | null;
  reference: string | null;

  // Dates
  scheduled_date: Date | null;
  shipment_number: string;
  shipped_date: Date | null;
  shipping_cost: number | null;
  shipping_method: string | null;
  signature: string | null;
  status: ShipmentStatus;
  supplier_id: string | null;
  tenant_id: string;

  // Financials
  total_items: number;
  total_value: number | null;

  // Tracking
  tracking_number: string | null;
  updated_at: Date;
}

/**
 * Shipment with items
 */
export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
}

/**
 * Shipment Item response shape matching Prisma model
 */
export interface ShipmentItem {
  // Quality/Condition
  condition: string | null;
  condition_notes: string | null;

  // Audit fields
  created_at: Date;
  expiration_date: Date | null;
  id: string;

  // Foreign Keys
  item_id: string;

  // Lot/Batch Information
  lot_number: string | null;
  quantity_damaged: number;
  quantity_received: number;

  // Quantities
  quantity_shipped: number;
  shipment_id: string;
  tenant_id: string;

  // Financials
  total_cost: number;
  unit_cost: number | null;

  // Unit Information
  unit_id: number | null;
  updated_at: Date;
}

/**
 * Create shipment request
 */
export interface CreateShipmentRequest {
  carrier?: string;
  estimated_delivery_date?: string;
  event_id?: string;
  internal_notes?: string;
  location_id?: string;
  notes?: string;
  scheduled_date?: string;
  shipment_number?: string;
  shipping_cost?: number;
  shipping_method?: string;
  status?: ShipmentStatus;
  supplier_id?: string;
  tracking_number?: string;
}

/**
 * Update shipment request
 */
export interface UpdateShipmentRequest {
  actual_delivery_date?: string;
  carrier?: string;
  delivered_by?: string;
  estimated_delivery_date?: string;
  event_id?: string;
  internal_notes?: string;
  location_id?: string;
  notes?: string;
  received_by?: string;
  reference?: string;
  scheduled_date?: string;
  shipment_number?: string;
  shipped_date?: string;
  shipping_cost?: number;
  shipping_method?: string;
  signature?: string;
  status?: ShipmentStatus;
  supplier_id?: string;
  total_value?: number;
  tracking_number?: string;
}

/**
 * Update shipment status request
 */
export interface UpdateShipmentStatusRequest {
  actual_delivery_date?: string;
  delivered_by?: string;
  notes?: string;
  received_by?: string;
  signature?: string;
  status: ShipmentStatus;
}

/**
 * Create shipment item request
 */
export interface CreateShipmentItemRequest {
  condition?: string;
  condition_notes?: string;
  expiration_date?: string;
  item_id: string;
  lot_number?: string;
  quantity_damaged?: number;
  quantity_received?: number;
  quantity_shipped: number;
  unit_cost?: number;
  unit_id?: number;
}

/**
 * Update shipment item request
 */
export interface UpdateShipmentItemRequest {
  condition?: string;
  condition_notes?: string;
  expiration_date?: string;
  lot_number?: string;
  quantity_damaged?: number;
  quantity_received?: number;
  quantity_shipped?: number;
  unit_cost?: number;
  unit_id?: number;
}

/**
 * List filters
 */
export interface ShipmentFilters {
  date_from?: string;
  date_to?: string;
  event_id?: string;
  location_id?: string;
  search?: string;
  status?: ShipmentStatus;
  supplier_id?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit: number;
  page: number;
}

/**
 * Paginated list response
 */
export interface ShipmentListResponse {
  data: Shipment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
