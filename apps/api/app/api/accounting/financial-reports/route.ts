/**
 * Financial Reports API
 *
 * GET /api/accounting/financial-reports
 * Generates financial reports (income statement, balance sheet, cash flow)
 * aggregated from invoices, payments, and chart of accounts data.
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ReportLineItem {
  accountName: string;
  amount: number;
  category: string;
  percentage: number;
}

interface ReportSummary {
  netIncome: number;
  totalExpenses: number;
  totalRevenue: number;
}

interface FinancialReportResponse {
  endDate: string;
  lineItems: ReportLineItem[];
  startDate: string;
  summary: ReportSummary;
  type: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function parseDate(value: string | null, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/* -------------------------------------------------------------------------- */
/*  GET handler                                                               */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const reportType = searchParams.get("type") || "income_statement";
    const startDate = parseDate(
      searchParams.get("startDate"),
      new Date(new Date().getFullYear(), 0, 1)
    );
    const endDate = parseDate(searchParams.get("endDate"), new Date());

    // Fetch all relevant financial data in parallel
    const [
      revenueInvoices,
      voidedInvoices,
      completedPayments,
      pendingPayments,
      chartOfAccounts,
      revenueByStatus,
    ] = await Promise.all([
      // Revenue: all non-void invoices in the period
      database.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          issuedAt: { gte: startDate, lte: endDate },
          status: { notIn: ["VOID", "WRITE_OFF"] },
        },
        _sum: {
          total: true,
          amountPaid: true,
          amountDue: true,
          taxAmount: true,
        },
        _count: true,
      }),
      // Void/write-off invoices in the period
      database.invoice.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          issuedAt: { gte: startDate, lte: endDate },
          status: { in: ["VOID", "WRITE_OFF"] },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Completed payments in the period
      database.payment.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          completedAt: { gte: startDate, lte: endDate },
          status: "COMPLETED",
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Pending/processing payments
      database.payment.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ["PENDING", "PROCESSING"] },
        },
        _sum: { amount: true },
        _count: true,
      }),
      // Chart of accounts for categorization
      database.chartOfAccount.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: { accountNumber: "asc" },
      }),
      // Revenue breakdown by invoice status
      database.invoice.groupBy({
        by: ["status"],
        where: {
          tenantId,
          deletedAt: null,
          issuedAt: { gte: startDate, lte: endDate },
          status: { notIn: ["VOID", "WRITE_OFF"] },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    const totalRevenue = Number(revenueInvoices._sum.total ?? 0);
    const amountDue = Number(revenueInvoices._sum.amountDue ?? 0);
    const taxAmount = Number(revenueInvoices._sum.taxAmount ?? 0);
    const voidedTotal = Number(voidedInvoices._sum.total ?? 0);
    const collectedPayments = Number(completedPayments._sum.amount ?? 0);
    const outstandingPayments = Number(pendingPayments._sum.amount ?? 0);

    // Build line items based on report type
    const lineItems: ReportLineItem[] = [];
    const divisor = totalRevenue > 0 ? totalRevenue : 1;

    if (reportType === "income_statement" || reportType === "custom") {
      // Revenue section
      for (const group of revenueByStatus) {
        const amount = Number(group._sum.total ?? 0);
        lineItems.push({
          category: "Revenue",
          accountName: `Invoices (${formatStatus(group.status)})`,
          amount,
          percentage: (amount / divisor) * 100,
        });
      }

      lineItems.push({
        category: "Revenue",
        accountName: "Tax Collected",
        amount: taxAmount,
        percentage: (taxAmount / divisor) * 100,
      });

      // Expenses section
      lineItems.push({
        category: "Expenses",
        accountName: "Voided / Written Off",
        amount: voidedTotal,
        percentage: (voidedTotal / divisor) * 100,
      });

      // Account for chart of accounts expense entries
      const expenseAccounts = chartOfAccounts.filter(
        (a) => a.accountType === "EXPENSE"
      );
      for (const account of expenseAccounts) {
        // Expense accounts are placeholders for future journal entry data
        lineItems.push({
          category: "Expenses",
          accountName: account.accountName,
          amount: 0,
          percentage: 0,
        });
      }
    } else if (reportType === "balance_sheet") {
      // Assets
      lineItems.push({
        category: "Assets",
        accountName: "Accounts Receivable (Outstanding)",
        amount: amountDue,
        percentage: (amountDue / divisor) * 100,
      });
      lineItems.push({
        category: "Assets",
        accountName: "Cash (Collected Payments)",
        amount: collectedPayments,
        percentage: (collectedPayments / divisor) * 100,
      });

      // Liabilities
      lineItems.push({
        category: "Liabilities",
        accountName: "Pending Payments",
        amount: outstandingPayments,
        percentage: (outstandingPayments / divisor) * 100,
      });

      // Equity
      const retainedEarnings = collectedPayments - voidedTotal;
      lineItems.push({
        category: "Equity",
        accountName: "Retained Earnings (approx.)",
        amount: retainedEarnings,
        percentage: (retainedEarnings / divisor) * 100,
      });
    } else if (reportType === "cash_flow") {
      // Operating
      lineItems.push({
        category: "Operating Activities",
        accountName: "Cash Received from Clients",
        amount: collectedPayments,
        percentage: (collectedPayments / divisor) * 100,
      });
      lineItems.push({
        category: "Operating Activities",
        accountName: "Outstanding Receivables",
        amount: amountDue,
        percentage: (amountDue / divisor) * 100,
      });
      lineItems.push({
        category: "Operating Activities",
        accountName: "Pending Payments In",
        amount: outstandingPayments,
        percentage: (outstandingPayments / divisor) * 100,
      });

      // Adjustments
      lineItems.push({
        category: "Adjustments",
        accountName: "Write-offs",
        amount: voidedTotal,
        percentage: (voidedTotal / divisor) * 100,
      });
    }

    const totalExpenses =
      voidedTotal +
      chartOfAccounts
        .filter((a) => a.accountType === "EXPENSE")
        .reduce(() => 0, 0);
    const netIncome = totalRevenue - totalExpenses;

    const response: FinancialReportResponse = {
      type: reportType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalRevenue,
        totalExpenses,
        netIncome,
      },
      lineItems,
    };

    return NextResponse.json(response);
  } catch (error) {
    captureException(error);
    log.error("Error generating financial report:", error);
    return NextResponse.json(
      { error: "Failed to generate financial report" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Utility                                                                   */
/* -------------------------------------------------------------------------- */

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Draft",
    SENT: "Sent",
    VIEWED: "Viewed",
    OVERDUE: "Overdue",
    PARTIALLY_PAID: "Partially Paid",
    PAID: "Paid",
    VOID: "Void",
    WRITE_OFF: "Write-off",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
