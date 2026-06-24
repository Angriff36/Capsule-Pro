import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFinanceOverview,
  getRecentInvoices,
  getRecentPayments,
} from "../../../lib/data/finance";
import { getTenantIdForOrg } from "../../../lib/tenant";

export const dynamic = "force-dynamic";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatClientName = (
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null
) => {
  if (!client) {
    return "Unassigned";
  }

  if (client.company_name?.trim()) {
    return client.company_name;
  }

  const fullName = [client.first_name, client.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Unassigned";
};

const invoiceStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "default" as const;
    case "overdue":
    case "write_off":
    case "void":
      return "destructive" as const;
    case "draft":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const paymentStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "default" as const;
    case "failed":
    case "chargeback":
    case "void":
      return "destructive" as const;
    case "pending":
    case "processing":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const AnalyticsFinancePage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const now = new Date();

  const [overview, recentInvoices, recentPayments] = await Promise.all([
    getFinanceOverview(tenantId, now),
    getRecentInvoices(tenantId),
    getRecentPayments(tenantId),
  ]);

  const {
    invoicedTotal,
    collectedTotal,
    outstandingTotal,
    invoiceCount,
    completedPaymentCount,
    overdueCount,
    overdueTotal,
    budgetedTotal,
    actualBudgetTotal,
    budgetVarianceTotal,
    budgetCount,
    collectionRate,
  } = overview;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">ANALYTICS</MonoLabel>
          <DisplayHeading size="md">Finance analytics</DisplayHeading>
          <CommandBandLede>
            Live receivables, cash collection, and budget variance for the
            current tenant.
          </CommandBandLede>
        </CommandBandHeader>
      </CommandBand>

      <MetricBand>
        <MetricCell>
          <MetricValue>{currencyFormatter.format(invoicedTotal)}</MetricValue>
          <MetricLabel>
            Total invoiced · {invoiceCount} invoices issued
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{currencyFormatter.format(collectedTotal)}</MetricValue>
          <MetricLabel>
            Cash collected · {completedPaymentCount} payments,{" "}
            {collectionRate.toFixed(1)}% rate
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {currencyFormatter.format(outstandingTotal)}
          </MetricValue>
          <MetricLabel>
            Open receivables · {overdueCount} overdue (
            {currencyFormatter.format(overdueTotal)})
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {currencyFormatter.format(budgetVarianceTotal)}
          </MetricValue>
          <MetricLabel>
            Budget variance · {budgetCount} budgets tracked
          </MetricLabel>
        </MetricCell>
      </MetricBand>

      <PageBody>
        <OperationalColumn>
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Budget posture</CardTitle>
                <CardDescription>
                  Compare planned event budgets against actual spend captured so
                  far.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-sm">
                    Planned budget
                  </div>
                  <div className="mt-2 font-bold text-2xl">
                    {currencyFormatter.format(budgetedTotal)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-sm">
                    Actual spend
                  </div>
                  <div className="mt-2 font-bold text-2xl">
                    {currencyFormatter.format(actualBudgetTotal)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-muted-foreground text-sm">Variance</div>
                  <div
                    className={`mt-2 font-bold text-2xl ${
                      budgetVarianceTotal > 0
                        ? "text-amber-600"
                        : budgetVarianceTotal < 0
                          ? "text-emerald-600"
                          : "text-foreground"
                    }`}
                  >
                    {currencyFormatter.format(budgetVarianceTotal)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Finance shortcuts</CardTitle>
                <CardDescription>
                  Jump directly into the operational views that own the
                  underlying records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Link
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  href="/accounting"
                >
                  <div className="font-medium">Accounting overview</div>
                  <div className="text-muted-foreground">
                    Invoices, payments, and ledger structure.
                  </div>
                </Link>
                <Link
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  href="/accounting/payments"
                >
                  <div className="font-medium">Payments dashboard</div>
                  <div className="text-muted-foreground">
                    Review settlement timing and method mix.
                  </div>
                </Link>
                <Link
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  href="/analytics/events"
                >
                  <div className="font-medium">Event analytics</div>
                  <div className="text-muted-foreground">
                    Cross-check event-level budgets and settlement health.
                  </div>
                </Link>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <SectionHeader
              actions={
                <Link
                  className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                  href="/accounting"
                >
                  Open accounting
                </Link>
              }
              title="Upcoming and open invoices"
            />

            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-8 text-center text-muted-foreground"
                        colSpan={7}
                      >
                        No invoices found for this tenant yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {titleCase(invoice.invoiceType)} ·{" "}
                            {currencyFormatter.format(
                              Number(invoice.total ?? 0)
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatClientName(invoice.client)}
                        </TableCell>
                        <TableCell>{invoice.event.title}</TableCell>
                        <TableCell>
                          <Badge
                            className="w-fit"
                            variant={invoiceStatusVariant(invoice.status)}
                          >
                            {titleCase(invoice.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dateFormatter.format(invoice.dueDate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatter.format(
                            Number(invoice.amountPaid ?? 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatter.format(
                            Number(invoice.amountDue ?? 0)
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              actions={
                <Link
                  className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                  href="/accounting/payments"
                >
                  Open payments dashboard
                </Link>
              }
              title="Recent payment activity"
            />

            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-8 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        No payments found for this tenant yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">
                            {titleCase(payment.methodType)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Invoice {payment.invoice.invoiceNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatClientName(payment.client)}
                        </TableCell>
                        <TableCell>{payment.event.title}</TableCell>
                        <TableCell>
                          <Badge
                            className="w-fit"
                            variant={paymentStatusVariant(payment.status)}
                          >
                            {titleCase(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {dateFormatter.format(
                            payment.completedAt ?? payment.createdAt
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {currencyFormatter.format(
                            Number(payment.amount ?? 0)
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
};

export default AnalyticsFinancePage;
