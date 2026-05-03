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

const percentFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "confirmed":
    case "completed":
    case "approved":
    case "paid":
      return "default" as const;
    case "tentative":
    case "draft":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

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

const AnalyticsEventsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const events = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      eventNumber: true,
      eventDate: true,
      guestCount: true,
      status: true,
      budget: true,
      client: {
        select: {
          company_name: true,
          first_name: true,
          last_name: true,
        },
      },
      budgets: {
        where: { deletedAt: null },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          status: true,
          totalBudgetAmount: true,
          totalActualAmount: true,
          varianceAmount: true,
        },
      },
      reports: {
        where: { deletedAt: null },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          status: true,
          completion: true,
        },
      },
      invoices: {
        where: { deletedAt: null },
        select: {
          total: true,
          status: true,
        },
      },
      payments: {
        where: { deletedAt: null },
        select: {
          amount: true,
          status: true,
        },
      },
    },
  });

  const summary = events.reduce(
    (acc, event) => {
      const latestBudget = event.budgets[0] ?? null;
      const budgetValue = Number(
        latestBudget?.totalBudgetAmount ?? event.budget ?? 0
      );
      const actualValue = Number(latestBudget?.totalActualAmount ?? 0);
      const varianceValue = Number(latestBudget?.varianceAmount ?? 0);
      const invoicedValue = event.invoices.reduce(
        (sum, invoice) => sum + Number(invoice.total ?? 0),
        0
      );
      const paidValue = event.payments.reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0
      );
      const completedReports = event.reports.filter(
        (report) => report.status === "completed" || report.status === "approved"
      ).length;

      acc.totalBudget += budgetValue;
      acc.totalActual += actualValue;
      acc.totalVariance += varianceValue;
      acc.totalInvoiced += invoicedValue;
      acc.totalPaid += paidValue;
      acc.confirmedCount += event.status === "confirmed" ? 1 : 0;
      acc.completedReports += completedReports;
      return acc;
    },
    {
      totalBudget: 0,
      totalActual: 0,
      totalVariance: 0,
      totalInvoiced: 0,
      totalPaid: 0,
      confirmedCount: 0,
      completedReports: 0,
    }
  );

  const averageBudgetVariance =
    events.length > 0 ? summary.totalVariance / events.length : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Event analytics</h1>
        <p className="text-muted-foreground">
          Live event budget, invoicing, and report status for the latest 12
          events.
        </p>
      </div>

      <Separator />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Tracked events</CardDescription>
            <CardTitle className="text-2xl">{events.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {summary.confirmedCount} confirmed and ready to execute.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Planned budget</CardDescription>
            <CardTitle className="text-2xl">
              {currencyFormatter.format(summary.totalBudget)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Actuals logged: {currencyFormatter.format(summary.totalActual)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Invoiced vs paid</CardDescription>
            <CardTitle className="text-2xl">
              {currencyFormatter.format(summary.totalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {currencyFormatter.format(summary.totalInvoiced)} invoiced across
            recent events.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Average budget variance</CardDescription>
            <CardTitle className="text-2xl">
              {currencyFormatter.format(averageBudgetVariance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Completed reports: {summary.completedReports}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              Recent event performance
            </h2>
            <p className="text-muted-foreground text-sm">
              Budget, settlement, and checklist health from live tenant data.
            </p>
          </div>
          <Link
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href="/events"
          >
            Open events roster
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted-foreground" colSpan={8}>
                    No events found for this tenant yet.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => {
                  const latestBudget = event.budgets[0] ?? null;
                  const latestReport = event.reports[0] ?? null;
                  const budgetValue = Number(
                    latestBudget?.totalBudgetAmount ?? event.budget ?? 0
                  );
                  const paidValue = event.payments.reduce(
                    (sum, payment) => sum + Number(payment.amount ?? 0),
                    0
                  );
                  const varianceValue = Number(latestBudget?.varianceAmount ?? 0);
                  const clientName = formatClientName(event.client);
                  const budgetStatus = latestBudget?.status ?? "No budget";
                  const reportStatus = latestReport
                    ? `${latestReport.completion}% ${latestReport.status.replaceAll("_", " ")}`
                    : "No report";
                  const paymentProgress =
                    budgetValue > 0 ? percentFormatter.format((paidValue / budgetValue) * 100) : "0.0";

                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{event.title}</div>
                        <div className="text-muted-foreground text-xs">
                          {event.eventNumber || "No event number"} · {event.guestCount} guests
                        </div>
                      </TableCell>
                      <TableCell>{dateFormatter.format(event.eventDate)}</TableCell>
                      <TableCell>{clientName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Badge className="w-fit" variant={statusVariant(event.status)}>
                            {event.status}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            Budget: {budgetStatus}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {currencyFormatter.format(budgetValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{currencyFormatter.format(paidValue)}</div>
                        <div className="text-muted-foreground text-xs">{paymentProgress}% funded</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={varianceValue > 0 ? "text-amber-600" : varianceValue < 0 ? "text-emerald-600" : "text-foreground"}>
                          {currencyFormatter.format(varianceValue)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {reportStatus}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsEventsPage;
