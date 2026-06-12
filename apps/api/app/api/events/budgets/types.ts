/**
 * Event Budget API Types
 */

export interface EventBudget {
  createdAt: Date;
  deletedAt: Date | null;
  eventId: string;
  id: string;
  notes: string | null;
  status: "draft" | "approved" | "active" | "completed" | "exceeded";
  tenantId: string;
  totalActualAmount: number;
  totalBudgetAmount: number;
  updatedAt: Date;
  varianceAmount: number;
  variancePercentage: number;
  version: number;
}

export interface BudgetLineItem {
  actualAmount: number;
  budgetedAmount: number;
  budgetId: string;
  category: string;
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  name: string;
  notes: string | null;
  sortOrder: number;
  tenantId: string;
  updatedAt: Date;
  varianceAmount: number;
}

export interface CreateEventBudgetRequest {
  eventId: string;
  lineItems?: CreateBudgetLineItemRequest[];
  notes?: string;
  status?: "draft" | "approved" | "active" | "completed" | "exceeded";
  totalBudgetAmount: number;
}

export interface UpdateEventBudgetRequest {
  notes?: string;
  status?: "draft" | "approved" | "active" | "completed" | "exceeded";
  totalBudgetAmount?: number;
}

export interface CreateBudgetLineItemRequest {
  budgetedAmount: number;
  category: string;
  description?: string;
  name: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateBudgetLineItemRequest {
  actualAmount?: number;
  budgetedAmount?: number;
  category?: string;
  description?: string;
  name?: string;
  notes?: string;
  sortOrder?: number;
}

export type EventBudgetWithLineItems = EventBudget & {
  lineItems: BudgetLineItem[];
};

export interface EventBudgetListResponse {
  budgets: EventBudget[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

export interface BudgetSummary {
  budgetCount: number;
  byCategory: Record<
    string,
    { budgeted: number; actual: number; variance: number }
  >;
  byStatus: Record<string, number>;
  totalActualAmount: number;
  totalBudgetAmount: number;
  totalVarianceAmount: number;
  totalVariancePercentage: number;
}
