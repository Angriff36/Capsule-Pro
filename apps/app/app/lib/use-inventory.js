"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_CATEGORIES = exports.FSA_STATUSES = void 0;
exports.listInventoryItems = listInventoryItems;
exports.getInventoryItem = getInventoryItem;
exports.createInventoryItem = createInventoryItem;
exports.updateInventoryItem = updateInventoryItem;
exports.deleteInventoryItem = deleteInventoryItem;
exports.getStockStatusColor = getStockStatusColor;
exports.getStockStatusLabel = getStockStatusLabel;
exports.getFSAStatusColor = getFSAStatusColor;
exports.getFSAStatusLabel = getFSAStatusLabel;
exports.getCategoryLabel = getCategoryLabel;
exports.formatCurrency = formatCurrency;
exports.formatQuantity = formatQuantity;
// Type definitions matching the API response
exports.FSA_STATUSES = [
  "unknown",
  "requires_review",
  "compliant",
  "non_compliant",
  "exempt",
];
exports.ITEM_CATEGORIES = [
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
/**
 * Client-side functions for inventory operations
 */
// List inventory items with pagination and filters
async function listInventoryItems(params) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.stockStatus) searchParams.set("stock_status", params.stockStatus);
  if (params.fsaStatus) searchParams.set("fsa_status", params.fsaStatus);
  if (params.tags?.length) searchParams.set("tags", params.tags.join(","));
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  const response = await fetch(
    `/api/inventory/items?${searchParams.toString()}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list inventory items");
  }
  return response.json();
}
// Get a single inventory item by ID
async function getInventoryItem(itemId) {
  const response = await fetch(`/api/inventory/items/${itemId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get inventory item");
  }
  return response.json();
}
// Create a new inventory item
async function createInventoryItem(request) {
  const response = await fetch("/api/inventory/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create inventory item");
  }
  return response.json();
}
// Update an inventory item
async function updateInventoryItem(itemId, request) {
  const response = await fetch(`/api/inventory/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update inventory item");
  }
  return response.json();
}
// Delete an inventory item (soft delete)
async function deleteInventoryItem(itemId) {
  const response = await fetch(`/api/inventory/items/${itemId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete inventory item");
  }
}
// Helper to get stock status badge color
function getStockStatusColor(status) {
  switch (status) {
    case "in_stock":
      return "bg-green-100 text-green-800 border-green-200";
    case "low_stock":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "out_of_stock":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
// Helper to get stock status label
function getStockStatusLabel(status) {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return "Unknown";
  }
}
// Helper to get FSA status badge color
function getFSAStatusColor(status) {
  switch (status) {
    case "compliant":
      return "bg-green-100 text-green-800 border-green-200";
    case "non_compliant":
      return "bg-red-100 text-red-800 border-red-200";
    case "requires_review":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "exempt":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
// Helper to get FSA status label
function getFSAStatusLabel(status) {
  switch (status) {
    case "compliant":
      return "Compliant";
    case "non_compliant":
      return "Non-Compliant";
    case "requires_review":
      return "Review Required";
    case "exempt":
      return "Exempt";
    default:
      return "Unknown";
  }
}
// Helper to get category label
function getCategoryLabel(category) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
// Helper to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
// Helper to format quantity
function formatQuantity(quantity) {
  return quantity.toFixed(3);
}
