import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

import { resolveEventBattleBoardHref } from "../../../lib/battle-boards/resolve-event-board-href";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { DeleteEventButton } from "../components/delete-event-button";
import { EventExportButton } from "./components/export-button";
import { EventDetailsClient } from "./event-details-client";
import { fetchAllEventDetailsData } from "./event-details-data";
import { serializePrepTasks, validatePrepTasks } from "./prep-task-contract";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function isEventIdUuid(value: string): boolean {
  return EVENT_ID_UUID_REGEX.test(value);
}

interface EventDetailsPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

/**
 * Event Details Page
 *
 * Server component that fetches all event data using parallel queries
 * via the centralized data module. The data fetching is organized into tiers:
 *
 * Tier 1 (Parallel): event, RSVPs, dishes, prep tasks, related events, contract, staff, budget
 * Tier 2 (Parallel): recipe versions, guest counts for related events
 * Tier 3 (Parallel): recipe ingredients, recipe steps
 * Tier 4 (Sequential): inventory items
 * Tier 5 (Sequential): inventory stock levels
 *
 * @see event-details-data.ts for query implementation details
 */
const EventDetailsPage = async ({ params }: EventDetailsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch all event details data using parallel queries
  const data = await fetchAllEventDetailsData(tenantId, eventId);

  if (!data.event) {
    notFound();
  }

  const {
    event,
    rsvpCount,
    eventDishes,
    rawPrepTasks,
    relatedEvents,
    relatedGuestCounts,
    recipeDetails,
    inventoryCoverage,
    hasContract,
    staffCount,
    prepLists,
    hasBudget,
  } = data;

  // Normalize and validate prep tasks
  const normalizedPrepTasks = rawPrepTasks.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    quantityTotal: row.quantityTotal,
    servingsTotal: row.servingsTotal ?? null,
    dueByDate:
      row.dueByDate instanceof Date
        ? row.dueByDate
        : new Date(row.dueByDate as string | number),
    isEventFinish: Boolean(row.isEventFinish),
  }));

  const prepTasks = validatePrepTasks(normalizedPrepTasks);
  const prepTasksForClient: Awaited<ReturnType<typeof serializePrepTasks>> =
    serializePrepTasks(prepTasks);

  const battleBoardHref = await resolveEventBattleBoardHref(
    database,
    tenantId,
    eventId
  );

  return (
    <>
      <Header
        page={
          event.eventNumber
            ? `${event.eventNumber} — ${event.title}`
            : event.title
        }
        pages={[{ label: "Events", href: "/events" }]}
      >
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${eventId}/waitlist`}>Waitlist</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${eventId}/budget`}>Budget</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${eventId}/battle-board`}>Event Timeline</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={battleBoardHref}>Battle Board</Link>
          </Button>
          <EventExportButton eventId={eventId} eventName={event.title} />
          <Button asChild size="sm" variant="ghost">
            <Link href="/events">Back to events</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/events/import">Import new</Link>
          </Button>
          <DeleteEventButton
            eventId={eventId}
            eventTitle={event.title}
            size="sm"
          />
        </div>
      </Header>
      <EventDetailsClient
        allEventData={data}
        battleBoardHref={battleBoardHref}
        budget={null}
        event={{
          ...event,
          budget: event.budget === null ? null : Number(event.budget),
          ticketPrice:
            event.ticketPrice === null ? null : Number(event.ticketPrice),
        }}
        eventDishes={eventDishes}
        hasBudget={hasBudget}
        hasContract={hasContract}
        inventoryCoverage={inventoryCoverage}
        prepLists={prepLists}
        prepTasks={prepTasksForClient}
        recipeDetails={recipeDetails}
        relatedEvents={relatedEvents}
        relatedGuestCounts={relatedGuestCounts}
        rsvpCount={rsvpCount}
        staffCount={staffCount}
        tenantId={tenantId}
      />
    </>
  );
};

export default EventDetailsPage;
