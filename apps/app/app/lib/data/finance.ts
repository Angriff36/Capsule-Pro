/** Finance analytics — Prisma removed; stub until Convex aggregation wired. */
import { cache } from "react";

export interface FinanceOverview {
  actualBudgetTotal: number;
  budgetCount: number;
  budgetedTotal: number;
  budgetVarianceTotal: number;
  collectedTotal: number;
  collectionRate: number;
  completedPaymentCount: number;
  expenseAccountCount: number;
  invoiceCount: number;
  invoicedTotal: number;
  outstandingTotal: number;
  overdueCount: number;
  overdueTotal: number;
  revenueAccountCount: number;
}

const emptyOverview: FinanceOverview = {
  actualBudgetTotal: 0,
  budgetCount: 0,
  budgetedTotal: 0,
  budgetVarianceTotal: 0,
  collectedTotal: 0,
  collectionRate: 0,
  completedPaymentCount: 0,
  expenseAccountCount: 0,
  invoiceCount: 0,
  invoicedTotal: 0,
  outstandingTotal: 0,
  overdueCount: 0,
  overdueTotal: 0,
  revenueAccountCount: 0,
};

export const getFinanceOverview = cache(
  async (_tenantId: string, _now: Date): Promise<FinanceOverview> => emptyOverview
);

export const getRecentInvoices = cache(async (_tenantId: string) => []);

export const getRecentPayments = cache(async (_tenantId: string) => []);
