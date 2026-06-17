"use client";

import {
  budgetAlertAcknowledge,
  budgetAlertMarkResolved,
  getLaborBudget as _getLaborBudget,
  listBudgetAlerts as _listBudgetAlerts,
  listLaborBudgets as _listLaborBudgets,
  laborBudgetCreate,
  laborBudgetSoftDelete,
  laborBudgetUpdate,
} from "@/app/lib/manifest-client.generated";
import type {
  BudgetAlert as GeneratedBudgetAlert,
  LaborBudget as GeneratedLaborBudget,
} from "@/app/lib/manifest-types.generated";

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
  actual_spend: number | null;
  budget_target: number;
  budget_type: BudgetType;
  budget_unit: BudgetUnit;
  created_at: Date;
  description: string | null;
  event_id: string | null;
  id: string;
  location_id: string | null;
  name: string;
  override_reason: string | null;
  period_end: Date | null;
  period_start: Date | null;
  status: BudgetStatus;
  tenant_id: string;
  threshold_80_pct: boolean;
  threshold_90_pct: boolean;
  threshold_100_pct: boolean;
  updated_at: Date;
}

export interface BudgetUtilization {
  actualSpend: number;
  budgetId: string;
  budgetName: string;
  budgetTarget: number;
  budgetType: string;
  budgetUnit: string;
  periodEnd?: Date;
  periodStart?: Date;
  remainingBudget: number;
  status: BudgetStatus;
  utilizationPct: number;
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

export interface BudgetWithUtilization extends LaborBudget {
  utilization?: BudgetUtilization;
}

export interface CreateBudgetInput {
  budgetTarget: number;
  budgetType: BudgetType;
  budgetUnit: BudgetUnit;
  description?: string;
  eventId?: string;
  locationId?: string;
  name: string;
  periodEnd?: string;
  periodStart?: string;
  threshold80Pct?: boolean;
  threshold90Pct?: boolean;
  threshold100Pct?: boolean;
}

export interface UpdateBudgetInput {
  budgetTarget?: number;
  description?: string;
  name?: string;
  overrideReason?: string;
  status?: BudgetStatus;
  threshold80Pct?: boolean;
  threshold90Pct?: boolean;
  threshold100Pct?: boolean;
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

/**
 * Get all labor budgets with optional filters
 */
export async function getBudgets(
  filters?: BudgetFilters
): Promise<LaborBudget[]> {
  const query: Record<string, string | number> = {};
  if (filters?.locationId) {
    query.locationId = filters.locationId;
  }
  if (filters?.eventId) {
    query.eventId = filters.eventId;
  }
  if (filters?.budgetType) {
    query.budgetType = filters.budgetType;
  }
  if (filters?.status) {
    query.status = filters.status;
  }

  const result = await _listLaborBudgets(query);
  return result.data as unknown as LaborBudget[];
}

/**
 * Get a single budget by ID with utilization
 */
export async function getBudgetById(
  id: string
): Promise<BudgetWithUtilization> {
  const result = await _getLaborBudget(id);
  if (!result) {
    throw new Error("Failed to fetch budget");
  }
  return result as unknown as BudgetWithUtilization;
}

/**
 * Create a new labor budget
 */
export async function createBudget(
  input: CreateBudgetInput
): Promise<GeneratedLaborBudget> {
  const result = await laborBudgetCreate({
    locationId: input.locationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    budgetTarget: input.budgetTarget,
    budgetType: input.budgetType,
    description: input.description,
  });
  if (!result) {
    throw new Error("Failed to create budget");
  }
  return result;
}

/**
 * Update a labor budget
 */
export async function updateBudget(
  id: string,
  updates: UpdateBudgetInput
): Promise<GeneratedLaborBudget> {
  const result = await laborBudgetUpdate({
    id,
    description: updates.description,
  });
  if (!result) {
    throw new Error("Failed to update budget");
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

function mapBudgetAlert(row: GeneratedBudgetAlert): BudgetAlert {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    budget_id: row.budgetId ?? "",
    alert_type: (row.alertType ?? "threshold_80") as AlertType,
    utilization: row.utilization ?? 0,
    message: row.message ?? "",
    is_acknowledged: row.isAcknowledged ?? false,
    acknowledged_by: row.acknowledgedBy ?? null,
    acknowledged_at: row.acknowledgedAt ? new Date(row.acknowledgedAt) : null,
    is_resolved: row.resolved ?? false,
    resolved_at: row.resolvedAt ? new Date(row.resolvedAt) : null,
    created_at: new Date(row.createdAt),
  };
}

/**
 * Get budget alerts with optional filters
 */
export async function getBudgetAlerts(
  filters?: AlertFilters
): Promise<BudgetAlert[]> {
  const result = await _listBudgetAlerts();
  let alerts = result.data.map(mapBudgetAlert);

  if (filters?.budgetId) {
    alerts = alerts.filter((a) => a.budget_id === filters.budgetId);
  }
  if (filters?.isAcknowledged !== undefined) {
    alerts = alerts.filter((a) => a.is_acknowledged === filters.isAcknowledged);
  }
  if (filters?.alertType) {
    alerts = alerts.filter((a) => a.alert_type === filters.alertType);
  }

  return alerts;
}

/**
 * Acknowledge a budget alert
 */
export async function acknowledgeAlert(
  alertId: string
): Promise<{ success: boolean }> {
  const result = await budgetAlertAcknowledge({ id: alertId });
  if (!result) {
    throw new Error("Failed to acknowledge alert");
  }
  return { success: true };
}

/**
 * Resolve a budget alert
 */
export async function resolveAlert(
  alertId: string
): Promise<{ success: boolean }> {
  const result = await budgetAlertMarkResolved({ id: alertId });
  if (!result) {
    throw new Error("Failed to resolve alert");
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
