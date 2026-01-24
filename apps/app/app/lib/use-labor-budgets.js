"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgets = getBudgets;
exports.getBudgetById = getBudgetById;
exports.createBudget = createBudget;
exports.updateBudget = updateBudget;
exports.deleteBudget = deleteBudget;
exports.getBudgetAlerts = getBudgetAlerts;
exports.acknowledgeAlert = acknowledgeAlert;
exports.resolveAlert = resolveAlert;
exports.getBudgetTypeName = getBudgetTypeName;
exports.getBudgetUnitSymbol = getBudgetUnitSymbol;
exports.getStatusColor = getStatusColor;
exports.getAlertTypeColor = getAlertTypeColor;
exports.getUtilizationColor = getUtilizationColor;
exports.getProgressBarColor = getProgressBarColor;
exports.formatUtilization = formatUtilization;
// API Client Functions
const API_BASE = "/api/staff/budgets";
/**
 * Get all labor budgets with optional filters
 */
async function getBudgets(filters) {
  const params = new URLSearchParams();
  if (filters?.locationId) params.set("locationId", filters.locationId);
  if (filters?.eventId) params.set("eventId", filters.eventId);
  if (filters?.budgetType) params.set("budgetType", filters.budgetType);
  if (filters?.status) params.set("status", filters.status);
  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budgets: ${response.statusText}`);
  }
  const data = await response.json();
  return data.budgets;
}
/**
 * Get a single budget by ID with utilization
 */
async function getBudgetById(id) {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget: ${response.statusText}`);
  }
  const data = await response.json();
  return data.budget;
}
/**
 * Create a new labor budget
 */
async function createBudget(input) {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create budget");
  }
  const data = await response.json();
  return data.budget;
}
/**
 * Update a labor budget
 */
async function updateBudget(id, updates) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update budget");
  }
  const data = await response.json();
  return data.budget;
}
/**
 * Delete (soft delete) a labor budget
 */
async function deleteBudget(id) {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete budget: ${response.statusText}`);
  }
  return { success: true };
}
/**
 * Get budget alerts with optional filters
 */
async function getBudgetAlerts(filters) {
  const params = new URLSearchParams();
  if (filters?.budgetId) params.set("budgetId", filters.budgetId);
  if (filters?.isAcknowledged !== undefined) {
    params.set("isAcknowledged", filters.isAcknowledged.toString());
  }
  if (filters?.alertType) params.set("alertType", filters.alertType);
  const response = await fetch(`${API_BASE}/alerts?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }
  const data = await response.json();
  return data.alerts;
}
/**
 * Acknowledge a budget alert
 */
async function acknowledgeAlert(alertId) {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, action: "acknowledge" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
  }
  return { success: true };
}
/**
 * Resolve a budget alert
 */
async function resolveAlert(alertId) {
  const response = await fetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, action: "resolve" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to resolve alert: ${response.statusText}`);
  }
  return { success: true };
}
// Helper functions
/**
 * Get budget type display name
 */
function getBudgetTypeName(type) {
  const names = {
    event: "Event",
    week: "Weekly",
    month: "Monthly",
  };
  return names[type] || type;
}
/**
 * Get budget unit display symbol
 */
function getBudgetUnitSymbol(unit) {
  return unit === "cost" ? "$" : "hrs";
}
/**
 * Get status badge color
 */
function getStatusColor(status) {
  const colors = {
    active: "bg-green-100 text-green-800 hover:bg-green-200",
    paused: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    archived: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };
  return colors[status] || "";
}
/**
 * Get alert type color
 */
function getAlertTypeColor(alertType) {
  const colors = {
    threshold_80: "bg-blue-100 text-blue-800",
    threshold_90: "bg-orange-100 text-orange-800",
    threshold_100: "bg-red-100 text-red-800",
    exceeded: "bg-red-200 text-red-900",
  };
  return colors[alertType] || "";
}
/**
 * Get utilization color based on percentage
 */
function getUtilizationColor(utilizationPct) {
  if (utilizationPct >= 100) return "text-red-600";
  if (utilizationPct >= 90) return "text-orange-600";
  if (utilizationPct >= 80) return "text-yellow-600";
  return "text-green-600";
}
/**
 * Get progress bar color based on percentage
 */
function getProgressBarColor(utilizationPct) {
  if (utilizationPct >= 100) return "bg-red-500";
  if (utilizationPct >= 90) return "bg-orange-500";
  if (utilizationPct >= 80) return "bg-yellow-500";
  return "bg-green-500";
}
/**
 * Format utilization for display
 */
function formatUtilization(actualSpend, budgetTarget, budgetUnit) {
  const symbol = budgetUnit === "cost" ? "$" : "";
  return `${symbol}${actualSpend.toFixed(2)} / ${symbol}${budgetTarget.toFixed(2)}`;
}
