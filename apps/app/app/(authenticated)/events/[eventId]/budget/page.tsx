import { listEventBudgets, listEvents } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
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

import { getTenantIdForOrg } from "../../../../lib/tenant";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const isEventIdUuid = (value: string): boolean =>
  EVENT_ID_UUID_REGEX.test(value);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const STATUS_TONE: Record<
  string,
  "default" | "secondary" | "success" | "coral" | "outline"
> = {
  draft: "secondary",
  approved: "outline",
  active: "success",
  completed: "default",
  exceeded: "coral",
};

const CATEGORY_LABELS: Record<string, string> = {
  venue: "Venue",
  catering: "Catering",
  beverages: "Beverages",
  labor: "Labor",
  equipment: "Equipment",
  other: "Other",
};

interface EventBudgetPageProps {
  params: Promise<{ eventId: string }>;
}

const EventBudgetPage = async ({ params }: EventBudgetPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = (await listEvents()).data[0] ?? null;

  if (!event) {
    notFound();
  }

  // Most-recent non-deleted budget version for this event.
  const budget = (await listEventBudgets()).data[0] ?? null;

  const eventLabel = event.eventNumber
    ? `${event.eventNumber} — ${event.title}`
    : event.title;
  const eventDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (!budget) {
    return (
      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Events / {eventLabel} / Budget</MonoLabel>
              <DisplayHeading>No budget yet</DisplayHeading>
              <CommandBandLede>
                Create a budget to lock in venue, catering, beverages, labor,
                and equipment line items. Variance will track against actuals
                automatically.
              </CommandBandLede>
            </div>
            <CommandBandActions>
              <Button
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                size="sm"
                variant="outline"
              >
                <Link href={`/events/${eventId}`}>Back to event</Link>
              </Button>
              <Button asChild size="default" variant="on-dark">
                <Link href={`/events/budgets?eventId=${eventId}`}>
                  Create budget
                </Link>
              </Button>
            </CommandBandActions>
          </CommandBandHeader>
        </CommandBand>

        <OperationalColumn>
          <section className="space-y-4">
            <SectionHeader
              description="Budgets capture both planned spend and actuals. Until one exists, this event's variance reporting is empty."
              eyebrow="Empty state"
              title="What a budget gives you"
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Plan by category",
                  body: "Allocate spend across venue, catering, beverages, labor, equipment, and other.",
                },
                {
                  title: "Track actuals",
                  body: "Update line-item actuals as invoices land. Variance recalculates inline.",
                },
                {
                  title: "Approve & lock",
                  body: "Move from draft to approved to active. Exceeded budgets surface in alerts.",
                },
              ].map((item) => (
                <div
                  className="rounded-[22px] border border-hairline bg-canvas p-6"
                  key={item.title}
                >
                  <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                    {item.title}
                  </p>
                  <p className="mt-3 text-ink text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </OperationalColumn>
      </PageCanvas>
    );
  }

  const totalBudget = Number(budget.totalBudgetAmount);
  const totalActual = Number(budget.totalActualAmount);
  const variance = Number(budget.varianceAmount);
  const variancePct = Number(budget.variancePercentage);
  const utilization = totalBudget > 0 ? totalActual / totalBudget : 0;
  const status = budget.status.toLowerCase();
  const statusTone = STATUS_TONE[status] ?? "secondary";

  let varianceNote: string | null = null;
  if (variance > 0) {
    varianceNote = "Over budget";
  } else if (variance < 0) {
    varianceNote = "Under budget";
  }

  const heroStats = [
    {
      label: "Total budget",
      value: currencyFormatter.format(totalBudget),
      delta: `Version ${budget.version}`,
      note: null as string | null,
    },
    {
      label: "Actual spend",
      value: currencyFormatter.format(totalActual),
      delta: `${percentFormatter.format(utilization)} of budget`,
      note: null as string | null,
    },
    {
      label: "Variance",
      value: `${variance >= 0 ? "+" : ""}${currencyFormatter.format(variance)}`,
      delta: `${variancePct >= 0 ? "+" : ""}${variancePct.toFixed(1)}%`,
      note: varianceNote,
    },
    {
      label: "Line items",
      value: String(budget.lineItems.length),
      delta: budget.lineItems.length > 0 ? "Tracked categories" : null,
      note: budget.lineItems.length === 0 ? "Add line items" : null,
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / {eventLabel} / Budget</MonoLabel>
            <DisplayHeading>{eventLabel} budget</DisplayHeading>
            <CommandBandLede>
              {eventDate
                ? `Plan vs. actual for ${eventDate}. Manage line items inline; variance recomputes as actuals are recorded.`
                : "Plan vs. actual for this event. Manage line items inline; variance recomputes as actuals are recorded."}
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href={`/events/${eventId}`}>Back to event</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href={`/events/budgets?eventId=${eventId}`}>
                Manage budget
              </Link>
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
            description={`Status: ${status}. Updated ${new Date(budget.updatedAt).toLocaleDateString()}.`}
            eyebrow="Budget overview"
            title="Plan vs. actual"
          />
          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusTone}>{status}</Badge>
              <span className="text-muted-foreground text-sm">
                Version {budget.version}
              </span>
              {budget.notes ? (
                <p className="basis-full text-ink text-sm leading-relaxed">
                  {budget.notes}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader
            count={`${budget.lineItems.length} items`}
            description="Each line item tracks budgeted vs. actual spend by category."
            eyebrow="Line items"
            title="Categories"
          />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budget.lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        No line items yet.{" "}
                        <Link
                          className="text-ink underline underline-offset-4"
                          href={`/events/budgets?eventId=${eventId}`}
                        >
                          Add the first one
                        </Link>
                        .
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  budget.lineItems.map((item) => {
                    const itemBudgeted = Number(item.budgetedAmount);
                    const itemActual = Number(item.actualAmount);
                    const itemVariance = Number(item.varianceAmount);
                    let varianceTone = "text-muted-foreground";
                    if (itemVariance > 0) {
                      varianceTone = "text-coral";
                    } else if (itemVariance < 0) {
                      varianceTone = "text-success";
                    }
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {CATEGORY_LABELS[item.category] ?? item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-ink">
                          {item.name}
                          {item.description ? (
                            <p className="text-muted-foreground text-xs">
                              {item.description}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right font-medium text-ink">
                          {currencyFormatter.format(itemBudgeted)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {currencyFormatter.format(itemActual)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${varianceTone}`}
                        >
                          {itemVariance >= 0 ? "+" : ""}
                          {currencyFormatter.format(itemVariance)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default EventBudgetPage;
