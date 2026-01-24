"use client";

// Type definitions and API client functions for Labor Budget Management

export type BudgetType = "event" | "week" | "month";
export type BudgetUnit = "hours" | "cost";
export type BudgetStatus = "active" | "paused" | "archived";
export type AlertType =
  | "threshold_80"
  | "threshold_90"
  | "threshold_100"
  | "exceeded";

export interface LaborBudget {
  id: string;
  tenant_id: string;
  location_id: string | null;
  event_id: string | null;
  name: string;
  description: string | null;
  budget_type: BudgetType;
  period_start: Date | null;
  period_end: Date | null;
  budget_target: number;
  budget_unit: BudgetUnit;
  actual_spend: number | null;
  threshold_80_pct: boolean;
  threshold_90_pct: boolean;
  threshold_100_pct: boolean;
  status: BudgetStatus;
  override_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetUtilization {
  budgetId: string;
  budgetName: string;
  budgetType: string;
  budgetTarget: number;
  budgetUnit: string;
  actualSpend: number;
  utilizationPct: number;
  remainingBudget: number;
  periodStart?: Date;
  periodEnd?: Date;
  status: BudgetStatus;
}

export interface BudgetAlert {
  id: string;
  tenant_id: string;
  budget_id: string;
  alert_type: AlertType;
  utilization: number;
  message: string;
  is_acknowledged: boolean;
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  is_resolved: boolean;
  resolved_at: Date | null;
  created_at: Date;
}

export interface BudgetWithUtilization extends LaborBudget {
  utilization?: BudgetUtilization;
}

export interface CreateBudgetInput {
  name: string;
  description?: string;
  budgetType: BudgetType;
  budgetTarget: number;
  budgetUnit: BudgetUnit;
  locationId?: string;
  eventId?: string;
  periodStart?: string;
  periodEnd?: string;
  threshold80Pct?: boolean;
  threshold90Pct?: boolean;
  threshold100Pct?: boolean;
}

export interface UpdateBudgetInput {
  name?: string;
  description?: string;
  budgetTarget?: number;
  status?: BudgetStatus;
  overrideReason?: string;
  threshold80Pct?: boolean;
  threshold90Pct?: boolean;
  threshold100Pct?: boolean;
}

export interface BudgetFilters {
  locationId?: string;
  eventId?: string;
  budgetType?: BudgetType;
  status?: BudgetStatus;
}

export interface AlertFilters {
  budgetId?: string;
  isAcknowledged?: boolean;
  alertType?: AlertType;
}

// API Client Functions
const API_BASE = "/api/staff/budgets";

/**
 * Get all labor budgets with optional filters
 */
export async function getBudgets(
  filters?: BudgetFilters
): Promise<LaborBudget[]> {
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
export async function getBudgetById(
  id: string
): Promise<BudgetWithUtilization> {
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
export async function createBudget(
  input: CreateBudgetInput
): Promise<LaborBudget> {
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
export async function updateBudget(
  id: string,
  updates: UpdateBudgetInput
): Promise<LaborBudget> {
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
export async function deleteBudget(id: string): Promise<{ success: boolean }> {
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
export async function getBudgetAlerts(
  filters?: AlertFilters
): Promise<BudgetAlert[]> {
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
export async function acknowledgeAlert(
  alertId: string
): Promise<{ success: boolean }> {
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
export async function resolveAlert(
  alertId: string
): Promise<{ success: boolean }> {
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
export function getBudgetTypeName(type: BudgetType): string {
  const names: Record<BudgetType, string> = {
    event: "Event",
    week: "Weekly",
    month: "Monthly",
  };
  return names[type] || type;
}

/**
 * Get budget unit display symbol
 */
export function getBudgetUnitSymbol(unit: BudgetUnit): string {
  return unit === "cost" ? "$" : "hrs";
}

/**
 * Get status badge color
 */
export function getStatusColor(status: BudgetStatus): string {
  const colors: Record<BudgetStatus, string> = {
    active: "bg-green-100 text-green-800 hover:bg-green-200",
    paused: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    archived: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };
  return colors[status] || "";
}

/**
 * Get alert type color
 */
export function getAlertTypeColor(alertType: AlertType): string {
  const colors: Record<AlertType, string> = {
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
export function getUtilizationColor(utilizationPct: number): string {
  if (utilizationPct >= 100) return "text-red-600";
  if (utilizationPct >= 90) return "text-orange-600";
  if (utilizationPct >= 80) return "text-yellow-600";
  return "text-green-600";
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressBarColor(utilizationPct: number): string {
  if (utilizationPct >= 100) return "bg-red-500";
  if (utilizationPct >= 90) return "bg-orange-500";
  if (utilizationPct >= 80) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Format utilization for display
 */
export function formatUtilization(
  actualSpend: number,
  budgetTarget: number,
  budgetUnit: BudgetUnit
): string {
  const symbol = budgetUnit === "cost" ? "$" : "";
  return `${symbol}${actualSpend.toFixed(2)} / ${symbol}${budgetTarget.toFixed(2)}`;
}
