"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.listBudgets = listBudgets;
exports.getBudget = getBudget;
exports.createBudget = createBudget;
exports.updateBudget = updateBudget;
exports.deleteBudget = deleteBudget;
exports.getLineItems = getLineItems;
exports.createLineItem = createLineItem;
exports.updateLineItem = updateLineItem;
exports.deleteLineItem = deleteLineItem;
exports.getBudgetStatusColor = getBudgetStatusColor;
exports.getVarianceColor = getVarianceColor;
exports.isBudgetEditable = isBudgetEditable;
exports.getBudgetStatusLabel = getBudgetStatusLabel;
exports.getCategoryLabel = getCategoryLabel;
/**
 * Client-side hooks for budget operations
 */
// List budgets with pagination and filters
async function listBudgets(params) {
  const searchParams = new URLSearchParams();
  if (params.eventId) searchParams.set("eventId", params.eventId);
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());
  const response = await fetch(
    `/api/events/budgets?${searchParams.toString()}`
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list budgets");
  }
  return response.json();
}
// Get a single budget by ID
async function getBudget(budgetId) {
  const response = await fetch(`/api/events/budgets/${budgetId}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get budget");
  }
  const data = await response.json();
  return data.data;
}
// Create a new budget
async function createBudget(request) {
  const response = await fetch("/api/events/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create budget");
  }
  const data = await response.json();
  return data.data;
}
// Update a budget
async function updateBudget(budgetId, request) {
  const response = await fetch(`/api/events/budgets/${budgetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update budget");
  }
  const data = await response.json();
  return data.data;
}
// Delete a budget
async function deleteBudget(budgetId) {
  const response = await fetch(`/api/events/budgets/${budgetId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete budget");
  }
}
// Get line items for a budget
async function getLineItems(budgetId) {
  const response = await fetch(`/api/events/budgets/${budgetId}/line-items`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get line items");
  }
  const data = await response.json();
  return data.data;
}
// Create a line item
async function createLineItem(request) {
  const response = await fetch(
    `/api/events/budgets/${request.budgetId}/line-items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create line item");
  }
  const data = await response.json();
  return data.data;
}
// Update a line item
async function updateLineItem(budgetId, lineItemId, request) {
  const response = await fetch(
    `/api/events/budgets/${budgetId}/line-items/${lineItemId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update line item");
  }
  const data = await response.json();
  return data.data;
}
// Delete a line item
async function deleteLineItem(budgetId, lineItemId) {
  const response = await fetch(
    `/api/events/budgets/${budgetId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete line item");
  }
}
// Helper to get budget status badge color
function getBudgetStatusColor(status) {
  switch (status) {
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "locked":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}
// Helper to get variance color
function getVarianceColor(variance) {
  if (variance < 0) {
    return "text-red-600"; // Over budget
  }
  if (variance === 0) {
    return "text-gray-600"; // On budget
  }
  return "text-green-600"; // Under budget
}
// Helper to check if budget is editable
function isBudgetEditable(status) {
  return status === "draft" || status === "approved";
}
// Helper to get budget status label
function getBudgetStatusLabel(status) {
  switch (status) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "locked":
      return "Locked";
    default:
      return "Unknown";
  }
}
// Helper to get category label
function getCategoryLabel(category) {
  switch (category) {
    case "food":
      return "Food";
    case "labor":
      return "Labor";
    case "rentals":
      return "Rentals";
    case "miscellaneous":
      return "Miscellaneous";
    default:
      return "Unknown";
  }
}
