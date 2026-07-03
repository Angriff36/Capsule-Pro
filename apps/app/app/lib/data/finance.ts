/**
 * Finance analytics domain queries.
 *
 * All functions wrapped with React cache() for per-request deduplication.
 * Tenant-scoped — every query filters by tenantId + deletedAt IS NULL.
 *
 * Uses the extended `db` client (from ./db) so model-level queries get
 * duration logging when PRISMA_LOG_QUERIES=1.
 *
 * 8 Prisma calls → 1 grouped domain function.
 */

import { cache } from "react";
import { db } from "../data/db";

// ============================================================================
// Finance overview — all 8 queries, one call
// ============================================================================

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

export const getFinanceOverview = cache(
  async (tenantId: string, now: Date): Promise<FinanceOverview> => {
    const [
      invoiceSummary,
      completedPaymentSummary,
      overdueSummary,
      budgetSummary,
      revenueAccountCount,
      expenseAccountCount,
    ] = await Promise.all([
      // Total invoiced
      db.invoice.aggregate({
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: { total: true, amountPaid: true, amountDue: true },
      }),
      // Cash collected (completed payments only)
      db.payment.aggregate({
        where: { tenantId, deletedAt: null, status: "COMPLETED" },
        _count: true,
        _sum: { amount: true },
      }),
      // Overdue invoices
      db.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          amountDue: { gt: 0 },
          dueDate: { lt: now },
        },
        _count: true,
        _sum: { amountDue: true },
      }),
      // Budget summary
      db.eventBudget.aggregate({
        where: { tenantId, deletedAt: null },
        _count: true,
        _sum: {
          totalBudgetAmount: true,
          totalActualAmount: true,
          varianceAmount: true,
        },
      }),
      // Active revenue accounts
      db.chartOfAccount.count({
        where: {
          tenantId,
          isActive: true,
          accountType: "REVENUE",
        },
      }),
      // Active expense accounts
      db.chartOfAccount.count({
        where: {
          tenantId,
          isActive: true,
          accountType: "EXPENSE",
        },
      }),
    ]);

    const invoicedTotal = Number(invoiceSummary._sum.total ?? 0);
    const collectedTotal = Number(completedPaymentSummary._sum.amount ?? 0);
    const outstandingTotal = Number(invoiceSummary._sum.amountDue ?? 0);

    return {
      invoicedTotal,
      collectedTotal,
      outstandingTotal,
      invoiceCount: invoiceSummary._count,
      completedPaymentCount: completedPaymentSummary._count,
      overdueCount: overdueSummary._count,
      overdueTotal: Number(overdueSummary._sum.amountDue ?? 0),
      budgetedTotal: Number(budgetSummary._sum.totalBudgetAmount ?? 0),
      actualBudgetTotal: Number(budgetSummary._sum.totalActualAmount ?? 0),
      budgetVarianceTotal: Number(budgetSummary._sum.varianceAmount ?? 0),
      budgetCount: budgetSummary._count,
      revenueAccountCount,
      expenseAccountCount,
      collectionRate:
        invoicedTotal > 0 ? (collectedTotal / invoicedTotal) * 100 : 0,
    };
  }
);

// ============================================================================
// Recent invoices — kept separate (list data for tables)
// ============================================================================

export const getRecentInvoices = cache(async (tenantId: string) => {
  const invoices = await db.invoice.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      invoiceNumber: true,
      invoiceType: true,
      status: true,
      total: true,
      amountPaid: true,
      amountDue: true,
      dueDate: true,
      client: {
        select: {
          companyName: true,
          firstName: true,
          lastName: true,
        },
      },
      linkedEvent: {
        select: { title: true },
      },
    },
  });
  return invoices.map(({ linkedEvent, ...invoice }) => ({
    ...invoice,
    event: linkedEvent,
  }));
});

// ============================================================================
// Recent payments — kept separate (list data for tables)
// ============================================================================

export const getRecentPayments = cache(async (tenantId: string) => {
  const payments = await db.payment.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    take: 8,
    select: {
      id: true,
      amount: true,
      status: true,
      methodType: true,
      completedAt: true,
      createdAt: true,
      client: {
        select: {
          companyName: true,
          firstName: true,
          lastName: true,
        },
      },
      invoice: {
        select: { invoiceNumber: true },
      },
      linkedEvent: {
        select: { title: true },
      },
    },
  });
  return payments.map(({ linkedEvent, ...payment }) => ({
    ...payment,
    event: linkedEvent,
  }));
});
