import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
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
import { getTenantIdForOrg } from "../../lib/tenant";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

const Unavailable = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Operations / Analytics</MonoLabel>
          <DisplayHeading>Analytics unavailable</DisplayHeading>
          <CommandBandLede>
            Unable to load analytics data right now. Please try again later.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>
  </PageCanvas>
);

const AnalyticsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  let tenantId: string;
  try {
    tenantId = await getTenantIdForOrg(orgId);
  } catch {
    return <Unavailable />;
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const previousWeekStart = new Date(now);
  previousWeekStart.setDate(previousWeekStart.getDate() - 14);
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  let currentRevenueRows: Array<{ total_revenue: string | null }>;
  let previousRevenueRows: Array<{ total_revenue: string | null }>;
  let currentLaborRows: Array<{
    budgeted_labor: string | null;
    actual_labor: string | null;
  }>;
  let previousLaborRows: Array<{
    budgeted_labor: string | null;
    actual_labor: string | null;
  }>;
  let currentWasteRows: Array<{ waste_cost: string | null }>;
  let previousWasteRows: Array<{ waste_cost: string | null }>;
  let marginRows: Array<{ avg_margin: string | null }>;
  let completionRows: Array<{ total_events: bigint; completed_events: bigint }>;
  let followUpRows: Array<{
    total_followups: bigint;
    completed_followups: bigint;
  }>;
  let topEvents: Array<{
    id: string;
    title: string;
    status: string;
    revenue: string | null;
    margin_pct: string | null;
  }>;

  try {
    [
      currentRevenueRows,
      previousRevenueRows,
      currentLaborRows,
      previousLaborRows,
      currentWasteRows,
      previousWasteRows,
      marginRows,
      completionRows,
      followUpRows,
      topEvents,
    ] = await Promise.all([
      database.$queryRaw<Array<{ total_revenue: string | null }>>(
        Prisma.sql`
        SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
        FROM tenant_events.catering_orders
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND order_date >= ${weekStart}
          AND order_date < ${now}
      `
      ),
      database.$queryRaw<Array<{ total_revenue: string | null }>>(
        Prisma.sql`
        SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
        FROM tenant_events.catering_orders
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND order_date >= ${previousWeekStart}
          AND order_date < ${weekStart}
      `
      ),
      database.$queryRaw<
        Array<{ budgeted_labor: string | null; actual_labor: string | null }>
      >(
        Prisma.sql`
        SELECT
          COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
          COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
        FROM tenant_events.event_profitability
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND calculated_at >= ${thirtyDaysAgo}
          AND calculated_at < ${now}
      `
      ),
      database.$queryRaw<
        Array<{ budgeted_labor: string | null; actual_labor: string | null }>
      >(
        Prisma.sql`
        SELECT
          COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
          COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
        FROM tenant_events.event_profitability
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND calculated_at >= ${sixtyDaysAgo}
          AND calculated_at < ${thirtyDaysAgo}
      `
      ),
      database.$queryRaw<Array<{ waste_cost: string | null }>>(
        Prisma.sql`
        SELECT COALESCE(SUM("totalCost"), 0)::numeric AS waste_cost
        FROM tenant_kitchen.waste_entries
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND logged_at >= ${thirtyDaysAgo}
          AND logged_at < ${now}
      `
      ),
      database.$queryRaw<Array<{ waste_cost: string | null }>>(
        Prisma.sql`
        SELECT COALESCE(SUM("totalCost"), 0)::numeric AS waste_cost
        FROM tenant_kitchen.waste_entries
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND logged_at >= ${sixtyDaysAgo}
          AND logged_at < ${thirtyDaysAgo}
      `
      ),
      database.$queryRaw<Array<{ avg_margin: string | null }>>(
        Prisma.sql`
        SELECT COALESCE(AVG(actual_gross_margin_pct), 0)::numeric AS avg_margin
        FROM tenant_events.event_profitability
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND calculated_at >= ${thirtyDaysAgo}
          AND calculated_at < ${now}
      `
      ),
      database.$queryRaw<
        Array<{ total_events: bigint; completed_events: bigint }>
      >(
        Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total_events,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::bigint AS completed_events
        FROM tenant_events.events
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND event_date >= ${thirtyDaysAgo}
          AND event_date <= ${now}
      `
      ),
      database.$queryRaw<
        Array<{ total_followups: bigint; completed_followups: bigint }>
      >(
        Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total_followups,
          SUM(CASE WHEN follow_up_completed THEN 1 ELSE 0 END)::bigint AS completed_followups
        FROM tenant_crm.client_interactions
        WHERE tenant_id = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND interaction_date >= ${thirtyDaysAgo}
          AND interaction_date < ${now}
      `
      ),
      database.$queryRaw<
        Array<{
          id: string;
          title: string;
          status: string;
          revenue: string | null;
          margin_pct: string | null;
        }>
      >(
        Prisma.sql`
        SELECT
          e.id,
          e.title,
          e.status,
          COALESCE(ep.actual_revenue, e.budget, 0)::numeric AS revenue,
          COALESCE(ep.actual_gross_margin_pct, ep.budgeted_gross_margin_pct)::numeric AS margin_pct
        FROM tenant_events.events e
        LEFT JOIN tenant_events.event_profitability ep
          ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
        WHERE e.tenant_id = ${tenantId}::uuid
          AND e.deleted_at IS NULL
          AND e.event_date >= ${startOfWeek}
          AND e.event_date <= ${endOfWeek}
        ORDER BY revenue DESC, e.event_date ASC
        LIMIT 5
      `
      ),
    ]);
  } catch {
    return <Unavailable />;
  }

  const currentRevenue = Number(currentRevenueRows[0]?.total_revenue ?? 0);
  const previousRevenue = Number(previousRevenueRows[0]?.total_revenue ?? 0);
  const revenueChangePct =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

  const currentLabor = currentLaborRows[0];
  const previousLabor = previousLaborRows[0];
  const currentLaborBudget = Number(currentLabor?.budgeted_labor ?? 0);
  const currentLaborActual = Number(currentLabor?.actual_labor ?? 0);
  const previousLaborBudget = Number(previousLabor?.budgeted_labor ?? 0);
  const previousLaborActual = Number(previousLabor?.actual_labor ?? 0);

  const laborUtilization =
    currentLaborBudget > 0
      ? (currentLaborActual / currentLaborBudget) * 100
      : 0;
  const previousLaborUtilization =
    previousLaborBudget > 0
      ? (previousLaborActual / previousLaborBudget) * 100
      : 0;
  const laborChangePct = laborUtilization - previousLaborUtilization;

  const currentWasteCost = Number(currentWasteRows[0]?.waste_cost ?? 0);
  const previousWasteCost = Number(previousWasteRows[0]?.waste_cost ?? 0);
  const wasteChangePct =
    previousWasteCost > 0
      ? ((currentWasteCost - previousWasteCost) / previousWasteCost) * 100
      : 0;

  const avgMarginPct = Number(marginRows[0]?.avg_margin ?? 0);
  const completionData = completionRows[0] || {
    total_events: 0n,
    completed_events: 0n,
  };
  const totalEvents = Number(completionData.total_events ?? 0);
  const completedEvents = Number(completionData.completed_events ?? 0);
  const completionRate = totalEvents > 0 ? completedEvents / totalEvents : 0;

  const followUpData = followUpRows[0] || {
    total_followups: 0n,
    completed_followups: 0n,
  };
  const followUpTotal = Number(followUpData.total_followups ?? 0);
  const followUpCompleted = Number(followUpData.completed_followups ?? 0);
  const followUpCompletionRate =
    followUpTotal > 0 ? followUpCompleted / followUpTotal : 0;

  const heroStats = [
    {
      label: "Weekly revenue",
      value: currencyFormatter.format(currentRevenue),
      delta:
        previousRevenue > 0
          ? `${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct.toFixed(1)}% vs. last week`
          : null,
      note: previousRevenue > 0 ? null : "No prior week data",
    },
    {
      label: "Labor utilization",
      value: `${laborUtilization.toFixed(0)}%`,
      delta:
        previousLaborBudget > 0
          ? `${laborChangePct >= 0 ? "+" : ""}${laborChangePct.toFixed(1)} pts vs. prior`
          : null,
      note: previousLaborBudget > 0 ? null : "No prior data",
    },
    {
      label: "Waste cost change",
      value: `${wasteChangePct >= 0 ? "+" : ""}${wasteChangePct.toFixed(0)}%`,
      delta: previousWasteCost > 0 ? "30-day window" : null,
      note: previousWasteCost > 0 ? null : "No prior data",
    },
    {
      label: "Avg gross margin",
      value: `${avgMarginPct.toFixed(1)}%`,
      delta: "Last 30 days",
      note: null as string | null,
    },
  ];

  const focusMetrics = [
    {
      title: "Service completion",
      value: percentFormatter.format(completionRate),
      description: `${completedEvents} of ${totalEvents} events in last 30 days.`,
    },
    {
      title: "Follow-up completion",
      value: percentFormatter.format(followUpCompletionRate),
      description: `${followUpCompleted} of ${followUpTotal} CRM follow-ups closed.`,
    },
    {
      title: "Avg gross margin",
      value: `${avgMarginPct.toFixed(1)}%`,
      description: "Across event profitability rows in the last 30 days.",
    },
  ];

  const statusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "completed" || normalized === "confirmed") {
      return <Badge variant="success">{status}</Badge>;
    }
    if (normalized === "canceled" || normalized === "cancelled") {
      return <Badge variant="coral">{status}</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Analytics</MonoLabel>
            <DisplayHeading>The numbers that move the operation</DisplayHeading>
            <CommandBandLede>
              Revenue, labor, waste, and margin in one cockpit. Pivot from a
              weekly trend to the events driving it without losing context.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/analytics/clients">Client analytics</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href="/analytics/finance">Financial detail</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {heroStats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
                {item.delta ? <MetricDelta>{item.delta}</MetricDelta> : null}
                {item.note ? (
                  <div className="text-white/55 text-xs">{item.note}</div>
                ) : null}
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            description="Trailing 30-day operating health, tracked against prior periods."
            eyebrow="Focus metrics"
            title="Operational pulse"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {focusMetrics.map((metric) => (
              <div
                className="rounded-[22px] border border-hairline bg-canvas p-6"
                key={metric.title}
              >
                <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                  {metric.title}
                </p>
                <p className="mt-3 font-medium text-2xl text-ink tracking-[-0.01em]">
                  {metric.value}
                </p>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  {metric.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${topEvents.length} events`}
            description="Sorted by revenue. Click through for full profitability detail."
            eyebrow="This week"
            title="Top events"
          />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        No events scheduled this week.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  topEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium text-ink">
                        {event.title}
                      </TableCell>
                      <TableCell className="text-right font-medium text-ink">
                        {currencyFormatter.format(Number(event.revenue ?? 0))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {event.margin_pct === null
                          ? "—"
                          : `${Number(event.margin_pct).toFixed(0)}%`}
                      </TableCell>
                      <TableCell>{statusBadge(event.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default AnalyticsPage;
