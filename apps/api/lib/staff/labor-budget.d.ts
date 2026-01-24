/**
 * Labor Budget Service
 *
 * This service handles labor budget tracking, utilization calculation,
 * and alert generation for staff scheduling.
 */
export interface LaborBudgetInput {
  tenantId: string;
  locationId?: string;
  eventId?: string;
  name: string;
  description?: string;
  budgetType: "event" | "week" | "month";
  periodStart?: Date;
  periodEnd?: Date;
  budgetTarget: number;
  budgetUnit: "hours" | "cost";
  threshold80Pct?: boolean;
  threshold90Pct?: boolean;
  threshold100Pct?: boolean;
  status?: "active" | "paused" | "archived";
  overrideReason?: string;
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
  status: "active" | "paused" | "archived";
}
export interface BudgetAlertInput {
  tenantId: string;
  budgetId: string;
  alertType: "threshold_80" | "threshold_90" | "threshold_100" | "exceeded";
  utilization: number;
  message: string;
}
export interface ShiftCostCalculation {
  shiftId: string;
  employeeId: string;
  hourlyRate: number | null;
  shiftHours: number;
  cost: number;
}
/**
 * Get all budgets for a tenant with optional filtering
 */
export declare function getLaborBudgets(
  tenantId: string,
  filters?: {
    locationId?: string;
    eventId?: string;
    budgetType?: string;
    status?: string;
  }
): Promise<
  {
    tenant_id: string;
    id: string;
    location_id: string | null;
    event_id: string | null;
    name: string;
    description: string | null;
    budget_type: string;
    period_start: Date | null;
    period_end: Date | null;
    budget_target: number;
    budget_unit: string;
    actual_spend: number | null;
    threshold_80_pct: boolean;
    threshold_90_pct: boolean;
    threshold_100_pct: boolean;
    status: string;
    override_reason: string | null;
    created_at: Date;
    updated_at: Date;
  }[]
>;
/**
 * Get a single budget by ID with current utilization
 */
export declare function getLaborBudgetById(
  tenantId: string,
  budgetId: string
): Promise<{
  utilization: BudgetUtilization | null;
  tenant_id: string;
  id: string;
  location_id: string | null;
  event_id: string | null;
  name: string;
  description: string | null;
  budget_type: string;
  period_start: Date | null;
  period_end: Date | null;
  budget_target: number;
  budget_unit: string;
  actual_spend: number | null;
  threshold_80_pct: boolean;
  threshold_90_pct: boolean;
  threshold_100_pct: boolean;
  status: string;
  override_reason: string | null;
  created_at: Date;
  updated_at: Date;
} | null>;
/**
 * Create a new labor budget
 */
export declare function createLaborBudget(input: LaborBudgetInput): Promise<{
  id: string;
  name: string;
}>;
/**
 * Update a labor budget
 */
export declare function updateLaborBudget(
  tenantId: string,
  budgetId: string,
  updates: Partial<Omit<LaborBudgetInput, "tenantId">>
): Promise<{
  id: string;
  name: string;
} | null>;
/**
 * Delete (soft delete) a labor budget
 */
export declare function deleteLaborBudget(
  tenantId: string,
  budgetId: string
): Promise<{
  success: boolean;
}>;
/**
 * Calculate budget utilization for a specific budget
 */
export declare function calculateBudgetUtilization(
  tenantId: string,
  budgetId: string
): Promise<BudgetUtilization | null>;
/**
 * Check if assigning a shift would exceed budget
 */
export declare function checkBudgetForShift(
  tenantId: string,
  shiftRequirement: {
    locationId: string;
    eventId?: string;
    shiftStart: Date;
    shiftEnd: Date;
    hourlyRate?: number;
  }
): Promise<{
  withinBudget: boolean;
  budgetWarning?: string;
  utilizationAfter?: number;
}>;
/**
 * Create a budget alert
 */
export declare function createBudgetAlert(input: BudgetAlertInput): Promise<{
  success: boolean;
}>;
/**
 * Get budget alerts for a tenant
 */
export declare function getBudgetAlerts(
  tenantId: string,
  filters?: {
    budgetId?: string;
    isAcknowledged?: boolean;
    alertType?: string;
  }
): Promise<
  {
    id: string;
    budget_id: string;
    alert_type: string;
    utilization: number;
    message: string;
    is_acknowledged: boolean;
    acknowledged_by: string | null;
    acknowledged_at: Date | null;
    resolved: boolean;
    resolved_at: Date | null;
    created_at: Date;
  }[]
>;
/**
 * Acknowledge a budget alert
 */
export declare function acknowledgeBudgetAlert(
  tenantId: string,
  alertId: string,
  acknowledgedBy: string
): Promise<{
  success: boolean;
}>;
/**
 * Resolve a budget alert
 */
export declare function resolveBudgetAlert(
  tenantId: string,
  alertId: string
): Promise<{
  success: boolean;
}>;
//# sourceMappingURL=labor-budget.d.ts.map
