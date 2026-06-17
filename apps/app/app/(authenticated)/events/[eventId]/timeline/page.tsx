import { listEventTimelineItems, listEvents } from "@/app/lib/manifest-client.generated";
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
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getTenantIdForOrg } from "../../../../lib/tenant";
import { EventTimelineClient } from "./event-timeline-client";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const isEventIdUuid = (value: string): boolean =>
  EVENT_ID_UUID_REGEX.test(value);

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

interface EventTimelinePageProps {
  params: Promise<{ eventId: string }>;
}

const EventTimelinePage = async ({ params }: EventTimelinePageProps) => {
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

  const items = (await listEventTimelineItems()).data;

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

  const total = items.length;
  const completed = items.filter((item) => item.isCompleted).length;
  const pending = total - completed;
  const completionRate = total > 0 ? completed / total : 0;
  const nextItem = items.find((item) => !item.isCompleted) ?? null;
  const nextItemTime = nextItem
    ? formatTimelineTime(nextItem.timelineTime)
    : null;

  const heroStats = [
    {
      label: "Items",
      value: String(total),
      delta: total === 0 ? "Add the first" : "Run-of-show steps",
      note: null as string | null,
    },
    {
      label: "Completed",
      value: String(completed),
      delta: total > 0 ? percentFormatter.format(completionRate) : "—",
      note: null as string | null,
    },
    {
      label: "Pending",
      value: String(pending),
      delta: pending === 0 && total > 0 ? "All done" : null,
      note: null as string | null,
    },
    {
      label: "Up next",
      value: nextItemTime ?? "—",
      delta: nextItem?.responsibleRole ?? null,
      note: nextItem?.description ?? null,
    },
  ];

  const serializedItems = items.map((item) => ({
    id: item.id,
    timelineTime: formatTimelineTime(item.timelineTime),
    description: item.description,
    responsibleRole: item.responsibleRole,
    isCompleted: item.isCompleted,
    completedAt: item.completedAt ? item.completedAt.toISOString() : null,
    notes: item.notes,
    sortOrder: item.sortOrder,
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / {eventLabel} / Timeline</MonoLabel>
            <DisplayHeading>{eventLabel} run-of-show</DisplayHeading>
            <CommandBandLede>
              {eventDate
                ? `Sequenced timeline for ${eventDate}. Add moments, assign roles, mark done as service progresses.`
                : "Sequenced timeline for this event. Add moments, assign roles, mark done as service progresses."}
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
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {heroStats.map((stat) => (
              <MetricCell key={stat.label}>
                <MetricLabel>{stat.label}</MetricLabel>
                <MetricValue>{stat.value}</MetricValue>
                {stat.delta ? <MetricDelta>{stat.delta}</MetricDelta> : null}
                {stat.note ? (
                  <div className="text-white/55 text-xs">{stat.note}</div>
                ) : null}
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} ${total === 1 ? "item" : "items"}`}
            description="Order steps chronologically. Owners see what they're responsible for and check off as they go."
            eyebrow="Timeline"
            title="Run-of-show"
          />
          <EventTimelineClient
            eventId={eventId}
            initialItems={serializedItems}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

function formatTimelineTime(value: Date): string {
  const hours = value.getUTCHours().toString().padStart(2, "0");
  const minutes = value.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default EventTimelinePage;
