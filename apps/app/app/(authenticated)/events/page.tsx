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
import { Button } from "@repo/design-system/components/ui/button";
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
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";
import { EventsList } from "./components/events-list";
import { EventsPageWithSuggestions } from "./components/events-suggestions";
import { EventsPageClient } from "./events-page-client";

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
      <Header page="Events" pages={[]}>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/events/reports">Reports</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/events/battle-boards">Battle boards</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/events/import">Import</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events/new">New event</Link>
          </Button>
        </div>
      </Header>
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
              <Button asChild size="default" variant="on-dark">
                <Link href="/events/new">New event</Link>
              </Button>
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
              <EventsList
                events={events.map((event) => ({
                  id: event.id,
                  title: event.title,
                  eventNumber: event.eventNumber,
                  status: event.status,
                  eventType: event.eventType ?? "event",
                  eventDate: event.eventDate.toISOString(),
                  guestCount: event.guestCount ?? 0,
                  venueName: event.venueName,
                  tags: event.tags ?? [],
                  hasClient: !!event.clientId,
                  hasMenu: false,
                  hasPrepList: false,
                  hasContract: false,
                }))}
              />
            )}
          </section>
        </OperationalColumn>
      </PageCanvas>
    </>
  );
};

export default EventsPage;
