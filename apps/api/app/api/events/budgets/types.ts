/**
 * Event Budget API Types
 */

export type EventBudget = {
  tenantId: string;
  id: string;
  eventId: string;
  version: number;
  status: "draft" | "approved" | "active" | "completed" | "exceeded";
  totalBudgetAmount: number;
  totalActualAmount: number;
  varianceAmount: number;
  variancePercentage: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type BudgetLineItem = {
  tenantId: string;
  id: string;
  budgetId: string;
  category: string;
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
};

export type CreateEventBudgetRequest = {
  eventId: string;
  status?: "draft" | "approved" | "active" | "completed" | "exceeded";
  totalBudgetAmount: number;
  notes?: string;
  lineItems?: CreateBudgetLineItemRequest[];
};

export type UpdateEventBudgetRequest = {
  status?: "draft" | "approved" | "active" | "completed" | "exceeded";
  totalBudgetAmount?: number;
  notes?: string;
};

export type CreateBudgetLineItemRequest = {
  category: string;
  name: string;
  description?: string;
  budgetedAmount: number;
  sortOrder?: number;
  notes?: string;
};

export type UpdateBudgetLineItemRequest = {
  category?: string;
  name?: string;
  description?: string;
  budgetedAmount?: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
};

export type EventBudgetWithLineItems = EventBudget & {
  lineItems: BudgetLineItem[];
};

export type EventBudgetListResponse = {
  budgets: EventBudget[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type BudgetSummary = {
  totalBudgetAmount: number;
  totalActualAmount: number;
  totalVarianceAmount: number;
  totalVariancePercentage: number;
  budgetCount: number;
  byStatus: Record<string, number>;
  byCategory: Record<
    string,
    { budgeted: number; actual: number; variance: number }
  >;
};
