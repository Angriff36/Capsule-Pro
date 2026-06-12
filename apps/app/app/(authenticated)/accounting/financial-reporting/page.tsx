import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { FinancialReportingClient } from "./financial-reporting-client";

export const metadata = {
  title: "Financial Reports",
};

export default async function FinancialReportingPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const [
    revenueAgg,
    expenseInvoicesAgg,
    paidInvoicesCount,
    overdueInvoicesCount,
    collectedPaymentsAgg,
    pendingPaymentsAgg,
  ] = await Promise.all([
    database.invoice.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["PAID", "PARTIALLY_PAID", "SENT", "VIEWED"] },
      },
      _sum: { total: true },
    }),
    database.invoice.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["VOID", "WRITE_OFF"] },
      },
      _sum: { discountAmount: true },
    }),
    database.invoice.count({
      where: { tenantId, deletedAt: null, status: "PAID" },
    }),
    database.invoice.count({
      where: {
        tenantId,
        deletedAt: null,
        dueDate: { lt: new Date() },
        status: { in: ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    database.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: "COMPLETED",
      },
      _sum: { amount: true },
    }),
    database.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.total ?? 0);
  const totalExpenses = Number(expenseInvoicesAgg._sum.discountAmount ?? 0);
  const netIncome = totalRevenue - totalExpenses;
  const collectedPayments = Number(collectedPaymentsAgg._sum.amount ?? 0);
  const pendingPayments = Number(pendingPaymentsAgg._sum.amount ?? 0);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Financial Reports</DisplayHeading>
            <CommandBandLede>
              Generate income statements, balance sheets, and cash flow
              summaries. Drill into revenue by client, track expenses by
              category, and export reports for external accounting.
            </CommandBandLede>
          </div>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Revenue</MetricLabel>
              <MetricValue>{formatCurrency(totalRevenue)}</MetricValue>
              <p className="text-sm text-white/70">
                {paidInvoicesCount} paid invoices
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total Expenses</MetricLabel>
              <MetricValue>{formatCurrency(totalExpenses)}</MetricValue>
              <p className="text-sm text-white/70">
                Write-offs and adjustments
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Net Income</MetricLabel>
              <MetricValue>{formatCurrency(netIncome)}</MetricValue>
              <p className="text-sm text-white/70">Revenue minus expenses</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Outstanding</MetricLabel>
              <MetricValue>{formatCurrency(pendingPayments)}</MetricValue>
              <p className="text-sm text-white/70">
                {overdueInvoicesCount} overdue invoices
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            description="Generate and view financial reports by type and period."
            eyebrow="Financial Reports"
            title="Report Generator"
          />

          <FinancialReportingClient
            initialMetrics={{
              totalRevenue,
              totalExpenses,
              netIncome,
              collectedPayments,
              pendingPayments,
              paidInvoicesCount,
              overdueInvoicesCount,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
