"use client";

// NOTE: Keeping apiFetch for budget alerts endpoint (custom response shape) and alert acknowledge/resolve actions
import { apiFetch } from "@/app/lib/api";
import {
  getLaborBudget as _getLaborBudget,
  listLaborBudgets as _listLaborBudgets,
  laborBudgetApprove,
  laborBudgetClose,
  laborBudgetCreate,
  laborBudgetSoftDelete,
  laborBudgetUpdate,
} from "@/app/lib/manifest-client.generated";
import type { LaborBudget as GeneratedLaborBudget } from "@/app/lib/manifest-types.generated";

// Type definitions and API client functions for Labor Budget Management.
// Field names and status values mirror the LaborBudget Manifest entity /
// Prisma model (camelCase, statuses draft → approved → closed) — earlier
// versions used a snake_case shape with active/paused/archived statuses that
// never matched the API, so every row rendered blank.

export type BudgetType = "event" | "weekly" | "monthly";
export type BudgetStatus = "draft" | "approved" | "closed";
export type AlertType =
  | "threshold_80"
  | "threshold_90"
  | "threshold_100"
  | "exceeded";

export interface LaborBudget {
  /** Prisma Decimal serialized as string; null when no actuals recorded */
  actualSpend: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  budgetTarget: string;
  budgetType: string;
  createdAt: string;
  description: string | null;
  eventId: string | null;
  id: string;
  locationId: string | null;
  name: string;
  periodEnd: string | null;
  periodStart: string | null;
  status: BudgetStatus;
  tenantId: string;
  updatedAt: string;
}

export interface BudgetAlert {
  acknowledged_at: Date | null;
  acknowledged_by: string | null;
  alert_type: AlertType;
  budget_id: string;
  created_at: Date;
  id: string;
  is_acknowledged: boolean;
  is_resolved: boolean;
  message: string;
  resolved_at: Date | null;
  tenant_id: string;
  utilization: number;
}

export interface CreateBudgetInput {
  budgetTarget: number;
  budgetType: BudgetType;
  description?: string;
  eventId?: string;
  locationId?: string;
  name: string;
  periodEnd?: string;
  periodStart?: string;
}

export interface UpdateBudgetInput {
  budgetTarget?: number;
  budgetType?: BudgetType;
  description?: string;
  locationId?: string;
  periodEnd?: string;
  periodStart?: string;
}

export interface BudgetFilters {
  budgetType?: BudgetType;
  eventId?: string;
  locationId?: string;
  status?: BudgetStatus;
}

export interface AlertFilters {
  alertType?: AlertType;
  budgetId?: string;
  isAcknowledged?: boolean;
}

// API Client Functions
const API_BASE = "/api/staff/budgets";

/**
 * Get all labor budgets with optional filters.
 * The generated list route ignores query params, so filters are applied
 * client-side after fetching the full tenant list.
 */
export async function getBudgets(
  filters?: BudgetFilters
): Promise<LaborBudget[]> {
  const result = await _listLaborBudgets();
  let budgets = result.data as unknown as LaborBudget[];

  if (filters?.status) {
    budgets = budgets.filter((b) => b.status === filters.status);
  }
  if (filters?.budgetType) {
    budgets = budgets.filter((b) => b.budgetType === filters.budgetType);
  }
  if (filters?.locationId) {
    budgets = budgets.filter((b) => b.locationId === filters.locationId);
  }
  if (filters?.eventId) {
    budgets = budgets.filter((b) => b.eventId === filters.eventId);
  }
  return budgets;
}

/**
 * Get a single budget by ID
 */
export async function getBudgetById(id: string): Promise<LaborBudget> {
  const result = await _getLaborBudget(id);
  if (!result) {
    throw new Error("Failed to fetch budget");
  }
  return result as unknown as LaborBudget;
}

/**
 * Create a new labor budget.
 * `name` and `eventId` are not declared command params, but the runtime seeds
 * new instances from the full command body, so they persist.
 */
export async function createBudget(
  input: CreateBudgetInput
): Promise<GeneratedLaborBudget> {
  // name/eventId are not declared command params (hence the cast), but the
  // runtime seeds new instances from the full body, so they persist.
  const result = await laborBudgetCreate({
    name: input.name,
    eventId: input.eventId,
    locationId: input.locationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    budgetTarget: input.budgetTarget,
    budgetType: input.budgetType,
    description: input.description,
  } as Parameters<typeof laborBudgetCreate>[0]);
  if (!result) {
    throw new Error("Failed to create budget");
  }
  return result;
}

/**
 * Update a labor budget (fields the Manifest update command accepts)
 */
export async function updateBudget(
  id: string,
  updates: UpdateBudgetInput
): Promise<GeneratedLaborBudget> {
  const result = await laborBudgetUpdate({
    id,
    locationId: updates.locationId,
    periodStart: updates.periodStart,
    periodEnd: updates.periodEnd,
    budgetTarget: updates.budgetTarget,
    budgetType: updates.budgetType,
    description: updates.description,
  });
  if (!result) {
    throw new Error("Failed to update budget");
  }
  return result;
}

/**
 * Approve a draft budget. `approvedBy` must be the tenant employee id
 * (resolve via GET /api/me).
 */
export async function approveBudget(
  id: string,
  approvedBy: string
): Promise<GeneratedLaborBudget> {
  const result = await laborBudgetApprove({ id, approvedBy });
  if (!result) {
    throw new Error("Failed to approve budget");
  }
  return result;
}

/**
 * Close an approved budget
 */
export async function closeBudget(id: string): Promise<GeneratedLaborBudget> {
  const result = await laborBudgetClose({ id });
  if (!result) {
    throw new Error("Failed to close budget");
  }
  return result;
}

/**
 * Delete (soft delete) a labor budget
 */
export async function deleteBudget(id: string): Promise<{ success: boolean }> {
  await laborBudgetSoftDelete({ id });
  return { success: true };
}

// NOTE: Keeping apiFetch for budget alerts — custom endpoint with non-standard response shape
/**
 * Get budget alerts with optional filters
 */
export async function getBudgetAlerts(
  filters?: AlertFilters
): Promise<BudgetAlert[]> {
  const params = new URLSearchParams();
  if (filters?.budgetId) {
    params.set("budgetId", filters.budgetId);
  }
  if (filters?.isAcknowledged !== undefined) {
    params.set("isAcknowledged", filters.isAcknowledged.toString());
  }
  if (filters?.alertType) {
    params.set("alertType", filters.alertType);
  }

  const response = await apiFetch(`${API_BASE}/alerts?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.alerts;
}

// NOTE: Keeping apiFetch for alert acknowledge — custom action endpoint
/**
 * Acknowledge a budget alert
 */
export async function acknowledgeAlert(
  alertId: string
): Promise<{ success: boolean }> {
  const response = await apiFetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertId, action: "acknowledge" }),
  });

  if (!response.ok) {
    throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
  }

  return { success: true };
}

// NOTE: Keeping apiFetch for alert resolve — custom action endpoint
/**
 * Resolve a budget alert
 */
export async function resolveAlert(
  alertId: string
): Promise<{ success: boolean }> {
  const response = await apiFetch(`${API_BASE}/alerts`, {
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
export function getBudgetTypeName(type: string): string {
  const names: Record<string, string> = {
    event: "Event",
    weekly: "Weekly",
    monthly: "Monthly",
    // Legacy values written before the vocabulary was aligned
    week: "Weekly",
    month: "Monthly",
  };
  return names[type] || type;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: BudgetStatus): string {
  const colors: Record<BudgetStatus, string> = {
    draft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    approved: "bg-green-100 text-green-800 hover:bg-green-200",
    closed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
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
  if (utilizationPct >= 100) {
    return "text-red-600";
  }
  if (utilizationPct >= 90) {
    return "text-orange-600";
  }
  if (utilizationPct >= 80) {
    return "text-yellow-600";
  }
  return "text-green-600";
}

/**
 * Get progress bar color based on percentage
 */
export function getProgressBarColor(utilizationPct: number): string {
  if (utilizationPct >= 100) {
    return "bg-red-500";
  }
  if (utilizationPct >= 90) {
    return "bg-orange-500";
  }
  if (utilizationPct >= 80) {
    return "bg-yellow-500";
  }
  return "bg-green-500";
}

/**
 * Format actual vs target for display (budgets are money-denominated)
 */
export function formatUtilization(
  actualSpend: number,
  budgetTarget: number
): string {
  return `$${actualSpend.toFixed(2)} / $${budgetTarget.toFixed(2)}`;
}
