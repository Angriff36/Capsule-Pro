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
/**
 * Get all labor budgets with optional filters
 */
export declare function getBudgets(
  filters?: BudgetFilters
): Promise<LaborBudget[]>;
/**
 * Get a single budget by ID with utilization
 */
export declare function getBudgetById(
  id: string
): Promise<BudgetWithUtilization>;
/**
 * Create a new labor budget
 */
export declare function createBudget(
  input: CreateBudgetInput
): Promise<LaborBudget>;
/**
 * Update a labor budget
 */
export declare function updateBudget(
  id: string,
  updates: UpdateBudgetInput
): Promise<LaborBudget>;
/**
 * Delete (soft delete) a labor budget
 */
export declare function deleteBudget(id: string): Promise<{
  success: boolean;
}>;
/**
 * Get budget alerts with optional filters
 */
export declare function getBudgetAlerts(
  filters?: AlertFilters
): Promise<BudgetAlert[]>;
/**
 * Acknowledge a budget alert
 */
export declare function acknowledgeAlert(alertId: string): Promise<{
  success: boolean;
}>;
/**
 * Resolve a budget alert
 */
export declare function resolveAlert(alertId: string): Promise<{
  success: boolean;
}>;
/**
 * Get budget type display name
 */
export declare function getBudgetTypeName(type: BudgetType): string;
/**
 * Get budget unit display symbol
 */
export declare function getBudgetUnitSymbol(unit: BudgetUnit): string;
/**
 * Get status badge color
 */
export declare function getStatusColor(status: BudgetStatus): string;
/**
 * Get alert type color
 */
export declare function getAlertTypeColor(alertType: AlertType): string;
/**
 * Get utilization color based on percentage
 */
export declare function getUtilizationColor(utilizationPct: number): string;
/**
 * Get progress bar color based on percentage
 */
export declare function getProgressBarColor(utilizationPct: number): string;
/**
 * Format utilization for display
 */
export declare function formatUtilization(
  actualSpend: number,
  budgetTarget: number,
  budgetUnit: BudgetUnit
): string;
//# sourceMappingURL=use-labor-budgets.d.ts.map
