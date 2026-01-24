/**
 * Shipments Client API Functions
 *
 * Client-side functions for interacting with warehouse shipment tracking API.
 */
export declare const SHIPMENT_STATUSES: readonly [
  "draft",
  "scheduled",
  "preparing",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
];
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];
export declare const ITEM_CONDITIONS: readonly [
  "good",
  "damaged",
  "spoiled",
  "short",
  "excess",
];
export type ItemCondition = (typeof ITEM_CONDITIONS)[number];
/**
 * Shipment response shape matching Prisma model
 */
export interface Shipment {
  id: string;
  tenant_id: string;
  shipment_number: string;
  status: ShipmentStatus;
  event_id: string | null;
  supplier_id: string | null;
  location_id: string | null;
  scheduled_date: Date | string | null;
  shipped_date: Date | string | null;
  estimated_delivery_date: Date | string | null;
  actual_delivery_date: Date | string | null;
  total_items: number;
  shipping_cost: number | null;
  total_value: number | null;
  tracking_number: string | null;
  carrier: string | null;
  shipping_method: string | null;
  delivered_by: string | null;
  received_by: string | null;
  signature: string | null;
  notes: string | null;
  internal_notes: string | null;
  reference: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
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
  id: string;
  tenant_id: string;
  shipment_id: string;
  item_id: string;
  quantity_shipped: number;
  quantity_received: number;
  quantity_damaged: number;
  unit_id: number | null;
  unit_cost: number | null;
  total_cost: number;
  condition: string | null;
  condition_notes: string | null;
  lot_number: string | null;
  expiration_date: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}
/**
 * Create shipment request
 */
export interface CreateShipmentRequest {
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
}
/**
 * Update shipment request
 */
export interface UpdateShipmentRequest {
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
}
/**
 * Update shipment status request
 */
export interface UpdateShipmentStatusRequest {
  status: ShipmentStatus;
  actual_delivery_date?: string;
  delivered_by?: string;
  received_by?: string;
  signature?: string;
  notes?: string;
}
/**
 * Create shipment item request
 */
export interface CreateShipmentItemRequest {
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
}
/**
 * Update shipment item request
 */
export interface UpdateShipmentItemRequest {
  quantity_shipped?: number;
  quantity_received?: number;
  quantity_damaged?: number;
  unit_id?: number;
  unit_cost?: number;
  condition?: string;
  condition_notes?: string;
  lot_number?: string;
  expiration_date?: string;
}
/**
 * List filters
 */
export interface ShipmentFilters {
  search?: string;
  status?: ShipmentStatus;
  event_id?: string;
  supplier_id?: string;
  location_id?: string;
  date_from?: string;
  date_to?: string;
}
/**
 * Pagination params
 */
export interface PaginationParams {
  page: number;
  limit: number;
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
export interface ShipmentWithComputed extends Shipment {
  items?: ShipmentItem[];
  event?: {
    id: string;
    name: string;
    eventDate: Date;
  } | null;
  supplier?: {
    id: string;
    name: string;
  } | null;
  location?: {
    id: string;
    name: string;
  } | null;
}
export interface ShipmentListResponseWithMeta {
  data: ShipmentWithComputed[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalShipments: number;
    byStatus: Record<ShipmentStatus, number>;
    totalValue: number;
    inTransitCount: number;
    preparingCount: number;
  };
}
/**
 * List shipments with pagination and filters
 */
export declare function listShipments(
  filters?: ShipmentFilters & {
    page?: number;
    limit?: number;
  }
): Promise<ShipmentListResponseWithMeta>;
/**
 * Get a single shipment with items
 */
export declare function getShipment(
  shipmentId: string
): Promise<ShipmentWithItems>;
/**
 * Create a new shipment
 */
export declare function createShipment(
  request: CreateShipmentRequest
): Promise<Shipment>;
/**
 * Update a shipment
 */
export declare function updateShipment(
  shipmentId: string,
  request: UpdateShipmentRequest
): Promise<Shipment>;
/**
 * Delete a shipment (soft delete)
 */
export declare function deleteShipment(shipmentId: string): Promise<void>;
/**
 * Update shipment status with validation
 */
export declare function updateShipmentStatus(
  shipmentId: string,
  request: UpdateShipmentStatusRequest
): Promise<Shipment>;
/**
 * List items for a shipment
 */
export declare function listShipmentItems(
  shipmentId: string
): Promise<ShipmentItem[]>;
/**
 * Add an item to a shipment
 */
export declare function addShipmentItem(
  shipmentId: string,
  request: CreateShipmentItemRequest
): Promise<ShipmentItem>;
/**
 * Update a shipment item
 */
export declare function updateShipmentItem(
  shipmentId: string,
  itemId: string,
  request: UpdateShipmentItemRequest
): Promise<ShipmentItem>;
/**
 * Delete a shipment item
 */
export declare function deleteShipmentItem(
  shipmentId: string,
  itemId: string
): Promise<void>;
/**
 * Get CSS classes for shipment status badge
 */
export declare function getShipmentStatusColor(status: ShipmentStatus): string;
/**
 * Get label for shipment status
 */
export declare function getShipmentStatusLabel(status: ShipmentStatus): string;
/**
 * Get CSS classes for item condition badge
 */
export declare function getItemConditionColor(condition: ItemCondition): string;
/**
 * Get label for item condition
 */
export declare function getItemConditionLabel(condition: ItemCondition): string;
/**
 * Check if status transition is valid
 */
export declare function isValidStatusTransition(
  from: ShipmentStatus,
  to: ShipmentStatus
): boolean;
/**
 * Get allowed next statuses for a given status
 */
export declare function getAllowedStatusTransitions(
  status: ShipmentStatus
): ShipmentStatus[];
/**
 * Format currency value
 */
export declare function formatCurrency(value: number): string;
/**
 * Format date for display
 */
export declare function formatDate(date: Date | string | null): string;
/**
 * Format date and time for display
 */
export declare function formatDateTime(date: Date | string | null): string;
/**
 * Format date for date input (YYYY-MM-DD)
 */
export declare function formatDateForInput(date: Date | string): string;
/**
 * Calculate completion percentage for shipment items
 */
export declare function calculateShipmentProgress(shipment: {
  items: {
    quantity_shipped: number;
    quantity_received: number;
  }[];
}): number;
/**
 * Generate shipment number from ID
 */
export declare function generateShipmentNumber(id: string): string;
/**
 * Get all shipment statuses
 */
export declare function getShipmentStatuses(): ShipmentStatus[];
/**
 * Get all item conditions
 */
export declare function getItemConditions(): ItemCondition[];
//# sourceMappingURL=use-shipments.d.ts.map
