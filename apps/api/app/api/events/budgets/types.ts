/**
 * Event Budget API Types
 */

/**
 * Budget status values
 */
export const EVENT_BUDGET_STATUSES = ["draft", "approved", "locked"] as const;

export type EventBudgetStatus = (typeof EVENT_BUDGET_STATUSES)[number];

/**
 * Budget line item categories
 */
export const BUDGET_CATEGORIES = [
  "food",
  "labor",
  "rentals",
  "miscellaneous",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

/**
 * Budget line item type
 */
export interface BudgetLineItem {
  id: string;
  tenant_id: string;
  budget_id: string;
  category: BudgetCategory;
  name: string;
  description: string | null;
  budgeted_amount: number;
  actual_amount: number;
  variance_amount: number;
  sort_order: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Event budget type
 */
export interface EventBudget {
  id: string;
  tenant_id: string;
  event_id: string;
  version: number;
  status: EventBudgetStatus;
  total_budget_amount: number;
  total_actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;

  // Joined data
  line_items?: BudgetLineItem[];
  event?: {
    id: string;
    title: string;
    event_date: Date;
    client_name?: string;
  };
}

/**
 * Budget list response with pagination
 */
export interface BudgetListResponse {
  data: EventBudget[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create budget request
 */
export interface CreateBudgetRequest {
  eventId: string;
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
  lineItems?: CreateBudgetLineItemRequest[];
}

/**
 * Create budget line item request (uses camelCase for API input)
 */
export interface CreateBudgetLineItemRequest {
  category: BudgetCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

/**
 * Update budget request
 */
export interface UpdateBudgetRequest {
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
}

/**
 * Create line item request
 */
export interface CreateLineItemRequest {
  budgetId: string;
  category: BudgetCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

/**
 * Update line item request
 */
export interface UpdateLineItemRequest {
  category?: BudgetCategory;
  name?: string;
  description?: string;
  budgetedAmount?: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

/**
 * Budget summary for display
 */
export interface BudgetSummary {
  budgetId: string;
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercentage: number;
  status: EventBudgetStatus;
  lineItemCount: number;
  overBudget: boolean;
  onBudget: boolean;
  underBudget: boolean;
}

/**
 * Budget variance by category
 */
export interface CategoryVariance {
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  variance: number;
  variancePercentage: number;
  itemCount: number;
}
