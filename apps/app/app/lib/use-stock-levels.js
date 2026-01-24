/**
 * Stock Levels Client API Functions
 *
 * Client-side functions for interacting with stock levels API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStockLevels = listStockLevels;
exports.createAdjustment = createAdjustment;
exports.listTransactions = listTransactions;
exports.listLocations = listLocations;
exports.getReorderStatusColor = getReorderStatusColor;
exports.getReorderStatusLabel = getReorderStatusLabel;
exports.getTransactionTypeColor = getTransactionTypeColor;
exports.getTransactionTypeLabel = getTransactionTypeLabel;
exports.getAdjustmentReasonLabel = getAdjustmentReasonLabel;
exports.formatCurrency = formatCurrency;
exports.formatQuantity = formatQuantity;
exports.formatDate = formatDate;
exports.formatDateForInput = formatDateForInput;
exports.getAdjustmentReasons = getAdjustmentReasons;
exports.getTransactionTypes = getTransactionTypes;
// ============================================================================
// Stock Levels API
// ============================================================================
/**
 * List stock levels with pagination and filters
 */
async function listStockLevels(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.reorderStatus) params.set("reorderStatus", filters.reorderStatus);
  if (filters.lowStock) params.set("lowStock", "true");
  if (filters.outOfStock) params.set("outOfStock", "true");
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  const response = await fetch(
    `/api/inventory/stock-levels?${params.toString()}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch stock levels");
  }
  return response.json();
}
/**
 * Create a stock adjustment
 */
async function createAdjustment(request) {
  const response = await fetch("/api/inventory/stock-levels/adjust", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create adjustment");
  }
  return response.json();
}
// ============================================================================
// Transactions API
// ============================================================================
/**
 * List transaction history
 */
async function listTransactions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.inventoryItemId)
    params.set("inventoryItemId", filters.inventoryItemId);
  if (filters.transactionType)
    params.set("transactionType", filters.transactionType);
  if (filters.locationId) params.set("locationId", filters.locationId);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  const response = await fetch(
    `/api/inventory/stock-levels/transactions?${params.toString()}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch transactions");
  }
  return response.json();
}
// ============================================================================
// Locations API
// ============================================================================
/**
 * List storage locations
 */
async function listLocations() {
  const response = await fetch("/api/inventory/stock-levels/locations");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch locations");
  }
  return response.json();
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Get CSS class for reorder status badge
 */
function getReorderStatusColor(status) {
  switch (status) {
    case "below_par":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "at_par":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "above_par":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
}
/**
 * Get label for reorder status
 */
function getReorderStatusLabel(status) {
  switch (status) {
    case "below_par":
      return "Below Par";
    case "at_par":
      return "At Par";
    case "above_par":
      return "Above Par";
  }
}
/**
 * Get CSS class for transaction type badge
 */
function getTransactionTypeColor(type) {
  switch (type) {
    case "purchase":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "usage":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "adjustment":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "transfer":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "waste":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "return":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "production":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
  }
}
/**
 * Get label for transaction type
 */
function getTransactionTypeLabel(type) {
  switch (type) {
    case "purchase":
      return "Purchase";
    case "usage":
      return "Usage";
    case "adjustment":
      return "Adjustment";
    case "transfer":
      return "Transfer";
    case "waste":
      return "Waste";
    case "return":
      return "Return";
    case "production":
      return "Production";
  }
}
/**
 * Get label for adjustment reason
 */
function getAdjustmentReasonLabel(reason) {
  const labels = {
    damage: "Damage",
    expired: "Expired",
    lost: "Lost",
    found: "Found",
    correction: "Correction",
    physical_count: "Physical Count",
    theft: "Theft",
    spoilage: "Spoilage",
    other: "Other",
  };
  return labels[reason] || reason;
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
 * Format quantity with fixed decimals
 */
function formatQuantity(value, decimals = 2) {
  return value.toFixed(decimals);
}
/**
 * Format date for display
 */
function formatDate(date) {
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
 * Get all adjustment reasons
 */
function getAdjustmentReasons() {
  return [
    "damage",
    "expired",
    "lost",
    "found",
    "correction",
    "physical_count",
    "theft",
    "spoilage",
    "other",
  ];
}
/**
 * Get all transaction types
 */
function getTransactionTypes() {
  return [
    "purchase",
    "usage",
    "adjustment",
    "transfer",
    "waste",
    "return",
    "production",
  ];
}
