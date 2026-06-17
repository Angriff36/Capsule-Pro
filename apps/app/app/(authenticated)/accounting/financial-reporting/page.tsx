import { listInvoices, listPayments } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
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

  const [invoices, payments] = await Promise.all([
    (await listInvoices()).data,
    (await listPayments()).data,
  ]);

  const paidInvoicesCount = invoices.filter((invoice) =>
    ["PAID", "PARTIALLY_PAID"].includes(String(invoice.status))
  ).length;
  const overdueInvoicesCount = invoices.filter(
    (invoice) =>
      Number(invoice.amountDue ?? 0) > 0 &&
      invoice.dueDate < new Date() &&
      !["VOID", "PAID"].includes(String(invoice.status))
  ).length;
  const totalRevenue = invoices
    .filter((invoice) =>
      ["PAID", "PARTIALLY_PAID", "SENT", "VIEWED"].includes(
        String(invoice.status)
      )
    )
    .reduce((sum, invoice) => sum + Number(invoice.total ?? 0), 0);
  const totalExpenses = invoices
    .filter((invoice) => ["VOID", "WRITE_OFF"].includes(String(invoice.status)))
    .reduce((sum, invoice) => sum + Number(invoice.discountAmount ?? 0), 0);
  const netIncome = totalRevenue - totalExpenses;
  const collectedPayments = payments
    .filter((payment) => String(payment.status) === "COMPLETED")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const pendingPayments = payments
    .filter((payment) => ["PENDING", "PROCESSING"].includes(String(payment.status)))
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

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
