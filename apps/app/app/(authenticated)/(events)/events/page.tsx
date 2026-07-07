import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
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
  OperationalRow,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Button,
  buttonVariants,
} from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { EventsList } from "./components/events-list";
import { EventsPageWithSuggestions } from "./components/events-suggestions";
import { EventsPageClient } from "./events-page-client";
import { computeDraftCompletion } from "./lib/completion";

interface EventListRow {
  completionPercent: number;
  eventDate: string;
  eventNumber: string | null;
  eventType: string;
  guestCount: number;
  hasClient: boolean;
  id: string;
  status: string;
  tags: string[];
  title: string;
  venueName: string | null;
}

/** Map a persisted event row to the client roster-row shape, deriving the
 * draft completion percent on the read path (constitution §3). */
const toListRow = (event: {
  accessibilityOptions: unknown;
  budget: { toFixed?: (n: number) => string } | null;
  clientId: string | null;
  eventDate: Date;
  eventNumber: string | null;
  eventType: string | null;
  guestCount: number | null;
  id: string;
  notes: string | null;
  status: string;
  tags: unknown;
  ticketPrice: { toFixed?: (n: number) => string } | null;
  title: string;
  venueName: string | null;
}): EventListRow => {
  const tags = (event.tags as string[]) ?? [];
  const completionPercent =
    event.status === "draft"
      ? computeDraftCompletion({
          accessibilityOptions: (event.accessibilityOptions as string[]) ?? [],
          budget: event.budget ? Number(event.budget) : 0,
          eventDate: event.eventDate ? event.eventDate.toISOString() : "",
          eventType: event.eventType ?? "",
          guestCount: event.guestCount ?? 0,
          notes: event.notes ?? "",
          status: event.status,
          tags,
          ticketPrice: event.ticketPrice ? Number(event.ticketPrice) : 0,
          title: event.title,
          venueName: event.venueName ?? "",
        })
      : 100;
  return {
    completionPercent,
    eventDate: event.eventDate.toISOString(),
    eventNumber: event.eventNumber,
    eventType: event.eventType ?? "event",
    guestCount: event.guestCount ?? 0,
    hasClient: !!event.clientId,
    id: event.id,
    status: event.status,
    tags,
    title: event.title,
    venueName: event.venueName,
  };
};

const EventsPage = async () => {
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
    select: {
      tenantId: true,
      id: true,
      title: true,
      eventNumber: true,
      status: true,
      eventType: true,
      eventDate: true,
      guestCount: true,
      venueName: true,
      tags: true,
      createdAt: true,
      clientId: true,
      accessibilityOptions: true,
      budget: true,
      ticketPrice: true,
      notes: true,
    },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = events.filter((event) => event.eventDate >= today);
  const totalGuests = events.reduce(
    (total, event) => total + (event.guestCount ?? 0),
    0
  );
  const confirmedCount = events.filter(
    (event) => event.status === "confirmed"
  ).length;
  const tentativeCount = events.filter(
    (event) => event.status === "tentative"
  ).length;

  const stats = [
    {
      label: "Total events",
      value: String(events.length),
      note: `${upcomingEvents.length} upcoming`,
    },
    {
      label: "Total guests",
      value: String(totalGuests),
      note: "Across all scheduled events",
    },
    {
      label: "Confirmed",
      value: String(confirmedCount),
      note: "Ready to produce",
    },
    {
      label: "Tentative",
      value: String(tentativeCount),
      note: "Needs final approval",
    },
  ];

  return (
    <>
      <EventsPageWithSuggestions tenantId={tenantId} />
      <EventsPageClient />

      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <div className="space-y-4">
              <MonoLabel tone="dark">Operations / Events</MonoLabel>
              <DisplayHeading>Every event, on one canvas</DisplayHeading>
              <CommandBandLede>
                The full event roster — past and upcoming. Filter, plan, and
                hand off to the kitchen and floor teams without losing context.
              </CommandBandLede>
            </div>
            <CommandBandActions>
              <Button
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10"
                size="sm"
                variant="outline"
              >
                <Link href="/events/import">Import</Link>
              </Button>
              <Link
                className={buttonVariants({
                  size: "default",
                  variant: "on-dark",
                })}
                href="/events/new"
              >
                New event
              </Link>
            </CommandBandActions>
          </CommandBandHeader>

          <CommandBandBody>
            <MetricBand>
              {stats.map((item) => (
                <MetricCell key={item.label}>
                  <MetricLabel>{item.label}</MetricLabel>
                  <MetricValue>{item.value}</MetricValue>
                  <div className="text-white/55 text-xs">{item.note}</div>
                </MetricCell>
              ))}
            </MetricBand>
          </CommandBandBody>
        </CommandBand>

        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader
              actions={
                <>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/events/battle-boards">Battle boards</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/events/reports">Reports</Link>
                  </Button>
                </>
              }
              count={`${events.length} total · ${upcomingEvents.length} upcoming`}
              description="Sorted by event date — newest first."
              eyebrow="Roster"
              title="Events"
            />

            {events.length === 0 ? (
              <OperationalRow density="comfortable">
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CalendarDays />
                    </EmptyMedia>
                    <EmptyTitle>No events yet</EmptyTitle>
                    <EmptyDescription>
                      Create your first event to start syncing the events
                      module.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <Link href="/events/new">Create event</Link>
                    </Button>
                  </EmptyContent>
                </Empty>
              </OperationalRow>
            ) : (
              <EventsList events={events.map(toListRow)} />
            )}
          </section>
        </OperationalColumn>
      </PageCanvas>
    </>
  );
};

export default EventsPage;
