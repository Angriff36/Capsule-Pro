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
import { EventGuestsClient } from "./event-guests-client";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const isEventIdUuid = (value: string): boolean =>
  EVENT_ID_UUID_REGEX.test(value);

interface EventGuestsPageProps {
  params: Promise<{ eventId: string }>;
}

const EventGuestsPage = async ({ params }: EventGuestsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [event, guests] = await Promise.all([
    database.event.findUnique({
      where: { tenantId_id: { tenantId, id: eventId } },
      select: {
        id: true,
        title: true,
        eventNumber: true,
        eventDate: true,
        status: true,
        maxCapacity: true,
      },
    }),
    database.eventGuest.findMany({
      where: { tenantId, eventId, deletedAt: null },
      orderBy: { guestName: "asc" },
      select: {
        id: true,
        guestName: true,
        guestEmail: true,
        guestPhone: true,
        rsvpStatus: true,
        dietaryRestrictions: true,
        specialMealRequired: true,
        specialMealNotes: true,
        tableAssignment: true,
        mealPreference: true,
        waitlistPosition: true,
        notes: true,
        createdAt: true,
      },
    }),
  ]);

  if (!event) {
    notFound();
  }

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

  const total = guests.length;
  const confirmed = guests.filter((g) =>
    ["confirmed", "attending"].includes(g.rsvpStatus.toLowerCase())
  ).length;
  const declined = guests.filter((g) =>
    ["declined", "not_attending", "cancelled"].includes(
      g.rsvpStatus.toLowerCase()
    )
  ).length;
  const pending = guests.filter(
    (g) => g.rsvpStatus.toLowerCase() === "pending"
  ).length;
  const capacityRemaining =
    event.maxCapacity === null ? null : event.maxCapacity - confirmed;

  const atCapacity =
    event.maxCapacity !== null && confirmed >= event.maxCapacity;

  const heroStats = [
    {
      label: "Total invited",
      value: String(total),
      delta: total === 0 ? "Add the first guest" : "On the list",
      note: null as string | null,
    },
    {
      label: "Confirmed",
      value: String(confirmed),
      delta: total > 0 ? `${Math.round((confirmed / total) * 100)}%` : null,
      note: null as string | null,
    },
    {
      label: "Declined",
      value: String(declined),
      delta: null,
      note: null as string | null,
    },
    {
      label: "Awaiting RSVP",
      value: String(pending),
      delta: null,
      note: null as string | null,
    },
    {
      label: "Capacity left",
      value:
        capacityRemaining === null ? "Unlimited" : String(capacityRemaining),
      delta: atCapacity ? "At capacity" : null,
      note: atCapacity ? "Confirmed guests meet or exceed max capacity" : null,
    },
  ];

  const serializedGuests = guests.map((g) => ({
    id: g.id,
    guestName: g.guestName,
    guestEmail: g.guestEmail,
    guestPhone: g.guestPhone,
    rsvpStatus: g.rsvpStatus,
    dietaryRestrictions: g.dietaryRestrictions,
    specialMealRequired: g.specialMealRequired,
    specialMealNotes: g.specialMealNotes,
    tableAssignment: g.tableAssignment,
    mealPreference: g.mealPreference,
    waitlistPosition: g.waitlistPosition,
    notes: g.notes,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / {eventLabel} / Guests</MonoLabel>
            <DisplayHeading>{eventLabel} guest list</DisplayHeading>
            <CommandBandLede>
              {eventDate
                ? `Manage RSVPs, dietary needs, and seating for ${eventDate}. Status updates sync to the waitlist automatically.`
                : "Manage RSVPs, dietary needs, and seating for this event. Status updates sync to the waitlist automatically."}
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
            count={`${total} ${total === 1 ? "guest" : "guests"}`}
            description="Add guests, track RSVPs, assign tables. Status pills show response at a glance."
            eyebrow="Guest list"
            title="Invited guests"
          />
          <EventGuestsClient
            eventId={eventId}
            initialGuests={serializedGuests}
            maxCapacity={event.maxCapacity}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default EventGuestsPage;
