/**
 * Shipments Client API Functions
 *
 * Client-side functions for interacting with warehouse shipment tracking API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_CONDITIONS = exports.SHIPMENT_STATUSES = void 0;
exports.listShipments = listShipments;
exports.getShipment = getShipment;
exports.createShipment = createShipment;
exports.updateShipment = updateShipment;
exports.deleteShipment = deleteShipment;
exports.updateShipmentStatus = updateShipmentStatus;
exports.listShipmentItems = listShipmentItems;
exports.addShipmentItem = addShipmentItem;
exports.updateShipmentItem = updateShipmentItem;
exports.deleteShipmentItem = deleteShipmentItem;
exports.getShipmentStatusColor = getShipmentStatusColor;
exports.getShipmentStatusLabel = getShipmentStatusLabel;
exports.getItemConditionColor = getItemConditionColor;
exports.getItemConditionLabel = getItemConditionLabel;
exports.isValidStatusTransition = isValidStatusTransition;
exports.getAllowedStatusTransitions = getAllowedStatusTransitions;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.formatDateForInput = formatDateForInput;
exports.calculateShipmentProgress = calculateShipmentProgress;
exports.generateShipmentNumber = generateShipmentNumber;
exports.getShipmentStatuses = getShipmentStatuses;
exports.getItemConditions = getItemConditions;
// ============================================================================
// Type Definitions
// ============================================================================
exports.SHIPMENT_STATUSES = [
  "draft",
  "scheduled",
  "preparing",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
];
exports.ITEM_CONDITIONS = ["good", "damaged", "spoiled", "short", "excess"];
// ============================================================================
// Shipments API
// ============================================================================
/**
 * List shipments with pagination and filters
 */
async function listShipments(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.event_id) params.set("event_id", filters.event_id);
  if (filters.supplier_id) params.set("supplier_id", filters.supplier_id);
  if (filters.location_id) params.set("location_id", filters.location_id);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  const response = await fetch(`/api/shipments?${params.toString()}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipments");
  }
  const data = await response.json();
  // Add summary metadata
  const summary = {
    totalShipments: data.pagination.total,
    byStatus: data.data.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {}),
    totalValue: data.data.reduce((sum, s) => sum + (s.total_value || 0), 0),
    inTransitCount: data.data.filter((s) => s.status === "in_transit").length,
    preparingCount: data.data.filter((s) => s.status === "preparing").length,
  };
  return { ...data, summary };
}
/**
 * Get a single shipment with items
 */
async function getShipment(shipmentId) {
  const response = await fetch(`/api/shipments/${shipmentId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipment");
  }
  return response.json();
}
/**
 * Create a new shipment
 */
async function createShipment(request) {
  const response = await fetch("/api/shipments", {
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
async function updateShipment(shipmentId, request) {
  const response = await fetch(`/api/shipments/${shipmentId}`, {
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
async function deleteShipment(shipmentId) {
  const response = await fetch(`/api/shipments/${shipmentId}`, {
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
async function updateShipmentStatus(shipmentId, request) {
  const response = await fetch(`/api/shipments/${shipmentId}/status`, {
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
async function listShipmentItems(shipmentId) {
  const response = await fetch(`/api/shipments/${shipmentId}/items`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch shipment items");
  }
  return response.json();
}
/**
 * Add an item to a shipment
 */
async function addShipmentItem(shipmentId, request) {
  const response = await fetch(`/api/shipments/${shipmentId}/items`, {
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
async function updateShipmentItem(shipmentId, itemId, request) {
  const response = await fetch(`/api/shipments/${shipmentId}/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update shipment item");
  }
  return response.json();
}
/**
 * Delete a shipment item
 */
async function deleteShipmentItem(shipmentId, itemId) {
  const response = await fetch(`/api/shipments/${shipmentId}/items/${itemId}`, {
    method: "DELETE",
  });
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
function getShipmentStatusColor(status) {
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
function getShipmentStatusLabel(status) {
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
function getItemConditionColor(condition) {
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
function getItemConditionLabel(condition) {
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
function isValidStatusTransition(from, to) {
  const validTransitions = {
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
function getAllowedStatusTransitions(status) {
  const transitions = {
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
function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return "-";
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
function formatDateTime(date) {
  if (!date) return "-";
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
function formatDateForInput(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}
/**
 * Calculate completion percentage for shipment items
 */
function calculateShipmentProgress(shipment) {
  if (!shipment.items.length) return 0;
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
function generateShipmentNumber(id) {
  return `SHP-${id.slice(0, 8).toUpperCase()}`;
}
/**
 * Get all shipment statuses
 */
function getShipmentStatuses() {
  return [...exports.SHIPMENT_STATUSES];
}
/**
 * Get all item conditions
 */
function getItemConditions() {
  return [...exports.ITEM_CONDITIONS];
}
