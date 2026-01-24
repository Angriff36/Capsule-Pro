export type EventBudgetStatus = "draft" | "approved" | "locked";
export type BudgetCategory = "food" | "labor" | "rentals" | "miscellaneous";
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
  line_items?: BudgetLineItem[];
  event?: {
    id: string;
    title: string;
    event_date: Date;
    client_name?: string;
  };
}
export interface BudgetListResponse {
  data: EventBudget[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
export interface CreateBudgetRequest {
  eventId: string;
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
  lineItems?: CreateBudgetLineItemRequest[];
}
export interface CreateBudgetLineItemRequest {
  category: BudgetCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}
export interface UpdateBudgetRequest {
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
}
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
 * Client-side hooks for budget operations
 */
export declare function listBudgets(params: {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
}): Promise<BudgetListResponse>;
export declare function getBudget(budgetId: string): Promise<EventBudget>;
export declare function createBudget(
  request: CreateBudgetRequest
): Promise<EventBudget>;
export declare function updateBudget(
  budgetId: string,
  request: UpdateBudgetRequest
): Promise<EventBudget>;
export declare function deleteBudget(budgetId: string): Promise<void>;
export declare function getLineItems(
  budgetId: string
): Promise<BudgetLineItem[]>;
export declare function createLineItem(
  request: CreateLineItemRequest
): Promise<BudgetLineItem>;
export declare function updateLineItem(
  budgetId: string,
  lineItemId: string,
  request: UpdateLineItemRequest
): Promise<BudgetLineItem>;
export declare function deleteLineItem(
  budgetId: string,
  lineItemId: string
): Promise<void>;
export declare function getBudgetStatusColor(status: EventBudgetStatus): string;
export declare function getVarianceColor(variance: number): string;
export declare function isBudgetEditable(status: EventBudgetStatus): boolean;
export declare function getBudgetStatusLabel(status: EventBudgetStatus): string;
export declare function getCategoryLabel(category: BudgetCategory): string;
//# sourceMappingURL=use-budgets.d.ts.map
