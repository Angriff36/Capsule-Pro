import { apiFetch } from "@/app/lib/api";
import {
  getShipment as _getShipment,
  listShipmentItems as _listShipmentItems,
  listShipments as _listShipments,
  shipmentCancel,
  shipmentCreate,
  shipmentItemCreate,
  shipmentItemSoftDelete,
  shipmentItemUpdate,
  shipmentMarkDelivered,
  shipmentSchedule,
  shipmentShip,
  shipmentStartPreparing,
  shipmentUpdate,
} from "@/app/lib/manifest-client.generated";
/**
 * Shipments Client API Functions
 *
 * Client-side functions for interacting with warehouse shipment tracking API.
 */

// ============================================================================
// Type Definitions
// ============================================================================

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
  actual_delivery_date: Date | string | null;
  carrier: string | null;

  // Audit fields
  created_at: Date | string;
  deleted_at: Date | string | null;

  // Delivery confirmation
  delivered_by: string | null;
  estimated_delivery_date: Date | string | null;

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
  scheduled_date: Date | string | null;
  shipment_number: string;
  shipped_date: Date | string | null;
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
  updated_at: Date | string;
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
  condition: ItemCondition | null;
  condition_notes: string | null;

  // Audit fields
  created_at: Date | string;
  expiration_date: Date | string | null;
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
  updated_at: Date | string;
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

// Extended types with computed fields
export interface ShipmentWithComputed extends Shipment {
  event?: {
    id: string;
    name: string;
    eventDate: Date;
  } | null;
  items?: ShipmentItem[];
  location?: {
    id: string;
    name: string;
  } | null;
  supplier?: {
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

// ============================================================================
// Shipments API
// ============================================================================

/**
 * List shipments with pagination and filters
 */
export async function listShipments(
  filters: ShipmentFilters & { page?: number; limit?: number } = {}
): Promise<ShipmentListResponseWithMeta> {
  const query: Record<string, string | number> = {};
  if (filters.search) {
    query.search = filters.search;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.event_id) {
    query.event_id = filters.event_id;
  }
  if (filters.supplier_id) {
    query.supplier_id = filters.supplier_id;
  }
  if (filters.location_id) {
    query.location_id = filters.location_id;
  }
  if (filters.date_from) {
    query.date_from = filters.date_from;
  }
  if (filters.date_to) {
    query.date_to = filters.date_to;
  }
  if (filters.page) {
    query.page = filters.page;
  }
  if (filters.limit) {
    query.limit = filters.limit;
  }

  const data = await _listShipments(query);

  // Add summary metadata — cast through unknown since generated Shipment type differs from local
  const rawItems = data.data as unknown as Record<string, unknown>[];
  const summary = {
    totalShipments: data.pagination.total,
    byStatus: rawItems.reduce(
      (acc: Record<string, number>, s) => {
        const status = s.status as ShipmentStatus;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) as Record<ShipmentStatus, number>,
    totalValue: rawItems.reduce(
      (sum, s) => sum + ((s.total_value as number) || 0),
      0
    ),
    inTransitCount: rawItems.filter((s) => s.status === "in_transit").length,
    preparingCount: rawItems.filter((s) => s.status === "preparing").length,
  };

  return { ...data, summary } as unknown as ShipmentListResponseWithMeta;
}

/**
 * Get a single shipment with items
 */
export async function getShipment(
  shipmentId: string
): Promise<ShipmentWithItems> {
  const result = await _getShipment(shipmentId);
  if (!result) {
    throw new Error("Failed to fetch shipment");
  }
  return result as unknown as ShipmentWithItems;
}

/**
 * Create a new shipment
 */
export async function createShipment(
  request: CreateShipmentRequest
): Promise<Shipment> {
  const result = await shipmentCreate({
    shipmentNumber: request.shipment_number,
    supplierId: request.supplier_id,
    eventId: request.event_id,
    scheduledDate: request.scheduled_date,
    carrier: request.carrier,
    shippingMethod: request.shipping_method,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to create shipment");
  }
  return result as unknown as Shipment;
}

/**
 * Update a shipment
 */
export async function updateShipment(
  _shipmentId: string,
  request: UpdateShipmentRequest
): Promise<Shipment> {
  const result = await shipmentUpdate({
    trackingNumber: request.tracking_number,
    carrier: request.carrier,
    shippingMethod: request.shipping_method,
    estimatedDeliveryDate: request.estimated_delivery_date,
    shippingCost: request.shipping_cost,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to update shipment");
  }
  return result as unknown as Shipment;
}

/**
 * Delete a shipment (soft delete)
 * NOTE: Keeping apiFetch — no generated shipmentSoftDelete command; cancel is a status transition, not delete
 */
export async function deleteShipment(shipmentId: string): Promise<void> {
  const response = await apiFetch(`/api/shipments/${shipmentId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete shipment");
  }
}

// ============================================================================
// Shipment Status API
// ============================================================================

/**
 * Update shipment status with validation
 * Maps status string to the appropriate generated command
 */
export async function updateShipmentStatus(
  _shipmentId: string,
  request: UpdateShipmentStatusRequest
): Promise<Shipment> {
  let result: unknown;
  switch (request.status) {
    case "scheduled":
      result = await shipmentSchedule({
        scheduledDate: request.actual_delivery_date,
      });
      break;
    case "preparing":
      result = await shipmentStartPreparing({});
      break;
    case "in_transit":
      result = await shipmentShip({});
      break;
    case "delivered":
      result = await shipmentMarkDelivered({
        receivedBy: request.received_by,
        signatureData: request.signature,
      });
      break;
    case "cancelled":
      result = await shipmentCancel({ reason: request.notes });
      break;
    default:
      throw new Error(`Unsupported status transition: ${request.status}`);
  }
  if (!result) {
    throw new Error("Failed to update shipment status");
  }
  return result as Shipment;
}

// ============================================================================
// Shipment Items API
// ============================================================================

/**
 * List items for a shipment
 */
export async function listShipmentItems(
  shipmentId: string
): Promise<ShipmentItem[]> {
  const result = await _listShipmentItems({ shipment_id: shipmentId });
  return result.data as unknown as ShipmentItem[];
}

/**
 * Add an item to a shipment
 */
export async function addShipmentItem(
  shipmentId: string,
  request: CreateShipmentItemRequest
): Promise<ShipmentItem> {
  const result = await shipmentItemCreate({
    shipmentId,
    itemId: request.item_id,
    quantityShipped: request.quantity_shipped,
    unitId: request.unit_id,
    unitCost: request.unit_cost,
    lotNumber: request.lot_number,
    expirationDate: request.expiration_date,
  });
  if (!result) {
    throw new Error("Failed to add item to shipment");
  }
  return result as unknown as ShipmentItem;
}

/**
 * Update a shipment item
 */
export async function updateShipmentItem(
  _shipmentId: string,
  _itemId: string,
  request: UpdateShipmentItemRequest
): Promise<ShipmentItem> {
  // Use updateReceived if quantity_received or condition fields are present, otherwise general update
  const result = await shipmentItemUpdate({
    quantityShipped: request.quantity_shipped,
    unitId: request.unit_id,
    unitCost: request.unit_cost,
    condition: request.condition,
    conditionNotes: request.condition_notes,
    lotNumber: request.lot_number,
    expirationDate: request.expiration_date,
  });
  if (!result) {
    throw new Error("Failed to update shipment item");
  }
  return result as unknown as ShipmentItem;
}

/**
 * Delete a shipment item
 */
export async function deleteShipmentItem(
  _shipmentId: string,
  _itemId: string
): Promise<void> {
  const result = await shipmentItemSoftDelete({});
  if (!result) {
    throw new Error("Failed to delete shipment item");
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get CSS classes for shipment status badge
 */
export function getShipmentStatusColor(status: ShipmentStatus): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "scheduled":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "preparing":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "in_transit":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "returned":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get label for shipment status
 */
export function getShipmentStatusLabel(status: ShipmentStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "scheduled":
      return "Scheduled";
    case "preparing":
      return "Preparing";
    case "in_transit":
      return "In Transit";
    case "delivered":
      return "Delivered";
    case "returned":
      return "Returned";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Get CSS classes for item condition badge
 */
export function getItemConditionColor(condition: ItemCondition): string {
  switch (condition) {
    case "good":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "damaged":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "spoiled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "short":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "excess":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

/**
 * Get label for item condition
 */
export function getItemConditionLabel(condition: ItemCondition): string {
  switch (condition) {
    case "good":
      return "Good";
    case "damaged":
      return "Damaged";
    case "spoiled":
      return "Spoiled";
    case "short":
      return "Short";
    case "excess":
      return "Excess";
    default:
      return condition;
  }
}

/**
 * Check if status transition is valid
 */
export function isValidStatusTransition(
  from: ShipmentStatus,
  to: ShipmentStatus
): boolean {
  const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    draft: ["scheduled", "cancelled"],
    scheduled: ["preparing", "cancelled"],
    preparing: ["in_transit", "cancelled"],
    in_transit: ["delivered"],
    delivered: ["returned"],
    returned: [],
    cancelled: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Get allowed next statuses for a given status
 */
export function getAllowedStatusTransitions(
  status: ShipmentStatus
): ShipmentStatus[] {
  const transitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    draft: ["scheduled", "cancelled"],
    scheduled: ["preparing", "cancelled"],
    preparing: ["in_transit", "cancelled"],
    in_transit: ["delivered"],
    delivered: ["returned"],
    returned: [],
    cancelled: [],
  };

  return transitions[status] ?? [];
}

export { formatCurrency } from "@repo/design-system/lib/format-currency";

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null): string {
  if (!date) {
    return "-";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) {
    return "-";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format date for date input (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Calculate completion percentage for shipment items
 */
export function calculateShipmentProgress(shipment: {
  items: { quantity_shipped: number; quantity_received: number }[];
}): number {
  if (!shipment.items.length) {
    return 0;
  }

  const totalShipped = shipment.items.reduce(
    (sum, item) => sum + item.quantity_shipped,
    0
  );
  const totalReceived = shipment.items.reduce(
    (sum, item) => sum + (item.quantity_received || 0),
    0
  );

  return totalShipped > 0
    ? Math.round((totalReceived / totalShipped) * 100)
    : 0;
}

/**
 * Generate shipment number from ID
 */
export function generateShipmentNumber(id: string): string {
  return `SHP-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Get all shipment statuses
 */
export function getShipmentStatuses(): ShipmentStatus[] {
  return [...SHIPMENT_STATUSES];
}

/**
 * Get all item conditions
 */
export function getItemConditions(): ItemCondition[] {
  return [...ITEM_CONDITIONS];
}
