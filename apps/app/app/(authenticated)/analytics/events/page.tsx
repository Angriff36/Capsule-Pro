import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
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
import { Button } from "@repo/design-system/components/ui/button";
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

const formatClientName = (
  client: {
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null
) => {
  if (!client) {
    return "Unassigned";
  }

  if (client.companyName?.trim()) {
    return client.companyName;
  }

  const fullName = [client.firstName, client.lastName]
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
          companyName: true,
          firstName: true,
          lastName: true,
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
        (report) =>
          report.status === "completed" || report.status === "approved"
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">Analytics</MonoLabel>
          <DisplayHeading size="md">Event analytics</DisplayHeading>
          <CommandBandLede>
            Live event budget, invoicing, and report status for the latest 12
            events.
          </CommandBandLede>
        </CommandBandHeader>
        <CommandBandActions>
          <Button asChild size="sm" variant="on-dark">
            <Link href="/analytics/events/advanced">Advanced analytics</Link>
          </Button>
        </CommandBandActions>
      </CommandBand>

      <MetricBand>
        <MetricCell>
          <MetricValue>{events.length}</MetricValue>
          <MetricLabel>
            Tracked events · {summary.confirmedCount} confirmed
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {currencyFormatter.format(summary.totalBudget)}
          </MetricValue>
          <MetricLabel>
            Planned budget · actuals{" "}
            {currencyFormatter.format(summary.totalActual)}
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {currencyFormatter.format(summary.totalPaid)}
          </MetricValue>
          <MetricLabel>
            Paid · {currencyFormatter.format(summary.totalInvoiced)} invoiced
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {currencyFormatter.format(averageBudgetVariance)}
          </MetricValue>
          <MetricLabel>
            Avg budget variance · {summary.completedReports} reports done
          </MetricLabel>
        </MetricCell>
      </MetricBand>

      <PageBody>
        <OperationalColumn>
          <SectionHeader
            actions={
              <Link
                className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                href="/events"
              >
                Open events roster
              </Link>
            }
            description="Budget, settlement, and checklist health from live tenant data."
            title="Recent event performance"
          />

          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={8}
                    >
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
                    const varianceValue = Number(
                      latestBudget?.varianceAmount ?? 0
                    );
                    const clientName = formatClientName(event.client);
                    const budgetStatus = latestBudget?.status ?? "No budget";
                    const reportStatus = latestReport
                      ? `${latestReport.completion}% ${latestReport.status.replaceAll("_", " ")}`
                      : "No report";
                    const paymentProgress =
                      budgetValue > 0
                        ? percentFormatter.format(
                            (paidValue / budgetValue) * 100
                          )
                        : "0.0";

                    return (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div className="font-medium">{event.title}</div>
                          <div className="text-muted-foreground text-xs">
                            {event.eventNumber || "No event number"} ·{" "}
                            {event.guestCount} guests
                          </div>
                        </TableCell>
                        <TableCell>
                          {dateFormatter.format(event.eventDate)}
                        </TableCell>
                        <TableCell>{clientName}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Badge
                              className="w-fit"
                              variant={statusVariant(event.status)}
                            >
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
                          <div className="text-muted-foreground text-xs">
                            {paymentProgress}% funded
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              varianceValue > 0
                                ? "text-amber-600"
                                : varianceValue < 0
                                  ? "text-emerald-600"
                                  : "text-foreground"
                            }
                          >
                            {currencyFormatter.format(varianceValue)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {reportStatus}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
};

export default AnalyticsEventsPage;
