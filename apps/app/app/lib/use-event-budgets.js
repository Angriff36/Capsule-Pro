"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusColor = getStatusColor;
exports.getCategoryColor = getCategoryColor;
exports.formatCurrency = formatCurrency;
exports.getUtilizationColor = getUtilizationColor;
exports.getBudgets = getBudgets;
exports.getBudget = getBudget;
exports.createBudget = createBudget;
exports.updateBudget = updateBudget;
exports.deleteBudget = deleteBudget;
exports.getLineItems = getLineItems;
exports.createLineItem = createLineItem;
exports.updateLineItem = updateLineItem;
exports.deleteLineItem = deleteLineItem;
exports.useEventBudgets = useEventBudgets;
const sonner_1 = require("sonner");
// API Base URL
const API_BASE = "/api/events/budgets";
// Helper functions
function getStatusColor(status) {
  const colors = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    completed:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    exceeded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };
  return colors[status] || colors.draft;
}
function getCategoryColor(category) {
  const colors = {
    venue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    catering:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    beverages:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    labor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    equipment:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  };
  return colors[category] || colors.other;
}
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
function getUtilizationColor(percentage) {
  if (percentage >= 100) return "text-red-600 dark:text-red-400";
  if (percentage >= 90) return "text-yellow-600 dark:text-yellow-400";
  if (percentage >= 75) return "text-blue-600 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}
// API Functions
async function getBudgets(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.eventId) params.set("eventId", filters.eventId);
    if (filters.status) params.set("status", filters.status);
    params.set("page", String(filters.page || 1));
    params.set("limit", String(filters.limit || 50));
    const response = await fetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch budgets");
    }
    const data = await response.json();
    return data.budgets;
  } catch (error) {
    console.error("Error fetching budgets:", error);
    throw error;
  }
}
async function getBudget(budgetId) {
  try {
    const response = await fetch(`${API_BASE}/${budgetId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch budget");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}
async function createBudget(input) {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create budget");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
  }
}
async function updateBudget(budgetId, input) {
  try {
    const response = await fetch(`${API_BASE}/${budgetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update budget");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}
async function deleteBudget(budgetId) {
  try {
    const response = await fetch(`${API_BASE}/${budgetId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete budget");
    }
  } catch (error) {
    console.error("Error deleting budget:", error);
    throw error;
  }
}
// Line Item Functions
async function getLineItems(budgetId) {
  try {
    const response = await fetch(`${API_BASE}/${budgetId}/line-items`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch line items");
    }
    const data = await response.json();
    return data.lineItems;
  } catch (error) {
    console.error("Error fetching line items:", error);
    throw error;
  }
}
async function createLineItem(budgetId, input) {
  try {
    const response = await fetch(`${API_BASE}/${budgetId}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create line item");
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating line item:", error);
    throw error;
  }
}
async function updateLineItem(budgetId, lineItemId, input) {
  try {
    const response = await fetch(
      `${API_BASE}/${budgetId}/line-items/${lineItemId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update line item");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating line item:", error);
    throw error;
  }
}
async function deleteLineItem(budgetId, lineItemId) {
  try {
    const response = await fetch(
      `${API_BASE}/${budgetId}/line-items/${lineItemId}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete line item");
    }
  } catch (error) {
    console.error("Error deleting line item:", error);
    throw error;
  }
}
// React Hook
function useEventBudgets(filters) {
  const [budgets, setBudgets] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [error, setError] = (0, react_1.useState)(null);
  const fetchBudgets = (0, react_1.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgets(filters);
      setBudgets(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      sonner_1.toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  (0, react_1.useEffect)(() => {
    fetchBudgets();
  }, [fetchBudgets]);
  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
  };
}
const react_1 = require("react");
