import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
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

import { getTenantIdForOrg } from "../../../lib/tenant";

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

const formatClientName = (client: {
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
} | null) => {
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

  const [
    invoiceSummary,
    completedPaymentSummary,
    overdueSummary,
    budgetSummary,
    revenueAccountCount,
    expenseAccountCount,
    recentInvoices,
    recentPayments,
  ] = await Promise.all([
    database.invoice.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        total: true,
        amountPaid: true,
        amountDue: true,
      },
    }),
    database.payment.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        status: "COMPLETED",
      },
      _count: true,
      _sum: {
        amount: true,
      },
    }),
    database.invoice.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        amountDue: { gt: 0 },
        dueDate: { lt: now },
      },
      _count: true,
      _sum: {
        amountDue: true,
      },
    }),
    database.eventBudget.aggregate({
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: true,
      _sum: {
        totalBudgetAmount: true,
        totalActualAmount: true,
        varianceAmount: true,
      },
    }),
    database.chartOfAccount.count({
      where: {
        tenantId,
        isActive: true,
        accountType: "REVENUE",
      },
    }),
    database.chartOfAccount.count({
      where: {
        tenantId,
        isActive: true,
        accountType: "EXPENSE",
      },
    }),
    database.invoice.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
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
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    }),
    database.payment.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
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
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
        invoice: {
          select: {
            invoiceNumber: true,
          },
        },
        event: {
          select: {
            title: true,
          },
        },
      },
    }),
  ]);

  const invoicedTotal = Number(invoiceSummary._sum.total ?? 0);
  const collectedTotal = Number(completedPaymentSummary._sum.amount ?? 0);
  const outstandingTotal = Number(invoiceSummary._sum.amountDue ?? 0);
  const budgetedTotal = Number(budgetSummary._sum.totalBudgetAmount ?? 0);
  const actualBudgetTotal = Number(budgetSummary._sum.totalActualAmount ?? 0);
  const budgetVarianceTotal = Number(budgetSummary._sum.varianceAmount ?? 0);
  const collectionRate = invoicedTotal > 0 ? (collectedTotal / invoicedTotal) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Finance analytics</h1>
        <p className="text-muted-foreground">
          Live receivables, cash collection, and budget variance for the current tenant.
        </p>
      </div>

      <Separator />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total invoiced</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(invoicedTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {invoiceSummary._count} invoices issued across accounting.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Cash collected</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(collectedTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {completedPaymentSummary._count} completed payments, {collectionRate.toFixed(1)}% collection rate.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Open receivables</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(outstandingTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {overdueSummary._count} overdue invoices totaling{" "}
            {currencyFormatter.format(Number(overdueSummary._sum.amountDue ?? 0))}.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Budget watch</CardDescription>
            <CardTitle className="text-2xl">{currencyFormatter.format(budgetVarianceTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {budgetSummary._count} budgets tracked · {revenueAccountCount} revenue and {expenseAccountCount} expense accounts active.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Budget posture</CardTitle>
            <CardDescription>
              Compare planned event budgets against actual spend captured so far.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Planned budget</div>
              <div className="mt-2 text-2xl font-semibold">
                {currencyFormatter.format(budgetedTotal)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Actual spend</div>
              <div className="mt-2 text-2xl font-semibold">
                {currencyFormatter.format(actualBudgetTotal)}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Variance</div>
              <div
                className={`mt-2 text-2xl font-semibold ${
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
              Jump directly into the operational views that own the underlying records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Link
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
              href="/accounting"
            >
              <div className="font-medium">Accounting overview</div>
              <div className="text-muted-foreground">Invoices, payments, and ledger structure.</div>
            </Link>
            <Link
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
              href="/accounting/payments"
            >
              <div className="font-medium">Payments dashboard</div>
              <div className="text-muted-foreground">Review settlement timing and method mix.</div>
            </Link>
            <Link
              className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
              href="/analytics/events"
            >
              <div className="font-medium">Event analytics</div>
              <div className="text-muted-foreground">Cross-check event-level budgets and settlement health.</div>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Upcoming and open invoices</h2>
            <p className="text-muted-foreground text-sm">
              Sorts by nearest due date so collections risk is visible first.
            </p>
          </div>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/accounting"
          >
            Open accounting
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
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
                  <TableCell className="py-8 text-center text-muted-foreground" colSpan={7}>
                    No invoices found for this tenant yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="font-medium">{invoice.invoiceNumber}</div>
                      <div className="text-muted-foreground text-xs">
                        {titleCase(invoice.invoiceType)} · {currencyFormatter.format(Number(invoice.total ?? 0))}
                      </div>
                    </TableCell>
                    <TableCell>{formatClientName(invoice.client)}</TableCell>
                    <TableCell>{invoice.event.title}</TableCell>
                    <TableCell>
                      <Badge className="w-fit" variant={invoiceStatusVariant(invoice.status)}>
                        {titleCase(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{dateFormatter.format(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      {currencyFormatter.format(Number(invoice.amountPaid ?? 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {currencyFormatter.format(Number(invoice.amountDue ?? 0))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Recent payment activity</h2>
            <p className="text-muted-foreground text-sm">
              Latest payment records tied back to invoices, clients, and events.
            </p>
          </div>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/accounting/payments"
          >
            Open payments dashboard
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
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
                  <TableCell className="py-8 text-center text-muted-foreground" colSpan={6}>
                    No payments found for this tenant yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{titleCase(payment.methodType)}</div>
                      <div className="text-muted-foreground text-xs">
                        Invoice {payment.invoice.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell>{formatClientName(payment.client)}</TableCell>
                    <TableCell>{payment.event.title}</TableCell>
                    <TableCell>
                      <Badge className="w-fit" variant={paymentStatusVariant(payment.status)}>
                        {titleCase(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dateFormatter.format(payment.completedAt ?? payment.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {currencyFormatter.format(Number(payment.amount ?? 0))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsFinancePage;
