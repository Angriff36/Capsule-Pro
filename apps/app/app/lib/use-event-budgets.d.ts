export type EventBudgetStatus =
  | "draft"
  | "approved"
  | "active"
  | "completed"
  | "exceeded";
export type BudgetLineItemCategory =
  | "venue"
  | "catering"
  | "beverages"
  | "labor"
  | "equipment"
  | "other";
export interface BudgetLineItem {
  id: string;
  tenantId: string;
  budgetId: string;
  category: BudgetLineItemCategory;
  name: string;
  description: string | null;
  budgetedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
export interface EventBudget {
  tenantId: string;
  id: string;
  eventId: string;
  version: number;
  status: EventBudgetStatus;
  totalBudgetAmount: number;
  totalActualAmount: number;
  varianceAmount: number;
  variancePercentage: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lineItems?: BudgetLineItem[];
}
export interface CreateEventBudgetInput {
  eventId: string;
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
  notes?: string;
  lineItems?: CreateBudgetLineItemInput[];
}
export interface CreateBudgetLineItemInput {
  category: BudgetLineItemCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  sortOrder?: number;
  notes?: string;
}
export interface UpdateEventBudgetInput {
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
  notes?: string;
}
export interface UpdateBudgetLineItemInput {
  category?: BudgetLineItemCategory;
  name?: string;
  description?: string;
  budgetedAmount?: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}
export interface EventBudgetFilters {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
}
export interface EventBudgetListResponse {
  budgets: EventBudget[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export declare function getStatusColor(status: EventBudgetStatus): string;
export declare function getCategoryColor(
  category: BudgetLineItemCategory
): string;
export declare function formatCurrency(amount: number): string;
export declare function getUtilizationColor(percentage: number): string;
export declare function getBudgets(
  filters?: EventBudgetFilters
): Promise<EventBudget[]>;
export declare function getBudget(budgetId: string): Promise<EventBudget>;
export declare function createBudget(
  input: CreateEventBudgetInput
): Promise<EventBudget>;
export declare function updateBudget(
  budgetId: string,
  input: UpdateEventBudgetInput
): Promise<EventBudget>;
export declare function deleteBudget(budgetId: string): Promise<void>;
export declare function getLineItems(
  budgetId: string
): Promise<BudgetLineItem[]>;
export declare function createLineItem(
  budgetId: string,
  input: CreateBudgetLineItemInput
): Promise<BudgetLineItem>;
export declare function updateLineItem(
  budgetId: string,
  lineItemId: string,
  input: UpdateBudgetLineItemInput
): Promise<BudgetLineItem>;
export declare function deleteLineItem(
  budgetId: string,
  lineItemId: string
): Promise<void>;
export declare function useEventBudgets(filters?: EventBudgetFilters): {
  budgets: EventBudget[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
//# sourceMappingURL=use-event-budgets.d.ts.map
