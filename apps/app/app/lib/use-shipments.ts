import { apiFetch } from "@/app/lib/api";
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
  id: string;
  tenant_id: string;
  shipment_number: string;
  status: ShipmentStatus;

  // Foreign Keys
  event_id: string | null;
  supplier_id: string | null;
  location_id: string | null;

  // Dates
  scheduled_date: Date | string | null;
  shipped_date: Date | string | null;
  estimated_delivery_date: Date | string | null;
  actual_delivery_date: Date | string | null;

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
  condition: ItemCondition | null;
  condition_notes: string | null;

  // Lot/Batch Information
  lot_number: string | null;
  expiration_date: Date | string | null;

  // Audit fields
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

// Extended types with computed fields
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

// ============================================================================
// Shipments API
// ============================================================================

/**
 * List shipments with pagination and filters
 */
export async function listShipments(
  filters: ShipmentFilters & { page?: number; limit?: number } = {}
): Promise<ShipmentListResponseWithMeta> {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.event_id) {
    params.set("event_id", filters.event_id);
  }
  if (filters.supplier_id) {
    params.set("supplier_id", filters.supplier_id);
  }
  if (filters.location_id) {
    params.set("location_id", filters.location_id);
  }
  if (filters.date_from) {
    params.set("date_from", filters.date_from);
  }
  if (filters.date_to) {
    params.set("date_to", filters.date_to);
  }
  if (filters.page) {
    params.set("page", filters.page.toString());
  }
  if (filters.limit) {
    params.set("limit", filters.limit.toString());
  }

  const response = await apiFetch(`/api/shipments?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipments");
  }

  const data = await response.json();
  // Add summary metadata
  const summary = {
    totalShipments: data.pagination.total,
    byStatus: data.data.reduce(
      (acc: Record<string, number>, s: Shipment) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) as Record<ShipmentStatus, number>,
    totalValue: data.data.reduce(
      (sum: number, s: Shipment) => sum + (s.total_value || 0),
      0
    ),
    inTransitCount: data.data.filter((s: Shipment) => s.status === "in_transit")
      .length,
    preparingCount: data.data.filter((s: Shipment) => s.status === "preparing")
      .length,
  };

  return { ...data, summary };
}

/**
 * Get a single shipment with items
 */
export async function getShipment(
  shipmentId: string
): Promise<ShipmentWithItems> {
  const response = await apiFetch(`/api/shipments/${shipmentId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipment");
  }

  return response.json();
}

/**
 * Create a new shipment
 */
export async function createShipment(
  request: CreateShipmentRequest
): Promise<Shipment> {
  const response = await apiFetch("/api/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create shipment");
  }

  return response.json();
}

/**
 * Update a shipment
 */
export async function updateShipment(
  shipmentId: string,
  request: UpdateShipmentRequest
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${shipmentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shipment");
  }

  return response.json();
}

/**
 * Delete a shipment (soft delete)
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
 */
export async function updateShipmentStatus(
  shipmentId: string,
  request: UpdateShipmentStatusRequest
): Promise<Shipment> {
  const response = await apiFetch(`/api/shipments/${shipmentId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shipment status");
  }

  return response.json();
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
  const response = await apiFetch(`/api/shipments/${shipmentId}/items`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipment items");
  }

  return response.json();
}

/**
 * Add an item to a shipment
 */
export async function addShipmentItem(
  shipmentId: string,
  request: CreateShipmentItemRequest
): Promise<ShipmentItem> {
  const response = await apiFetch(`/api/shipments/${shipmentId}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add item to shipment");
  }

  return response.json();
}

/**
 * Update a shipment item
 */
export async function updateShipmentItem(
  shipmentId: string,
  itemId: string,
  request: UpdateShipmentItemRequest
): Promise<ShipmentItem> {
  const response = await apiFetch(
    `/api/shipments/${shipmentId}/items/${itemId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shipment item");
  }

  return response.json();
}

/**
 * Delete a shipment item
 */
export async function deleteShipmentItem(
  shipmentId: string,
  itemId: string
): Promise<void> {
  const response = await apiFetch(
    `/api/shipments/${shipmentId}/items/${itemId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete shipment item");
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
    preparing: ["in_transit", "scheduled", "cancelled"],
    in_transit: ["delivered", "returned"],
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
    preparing: ["in_transit", "scheduled", "cancelled"],
    in_transit: ["delivered", "returned"],
    delivered: ["returned"],
    returned: [],
    cancelled: [],
  };

  return transitions[status] ?? [];
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

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
