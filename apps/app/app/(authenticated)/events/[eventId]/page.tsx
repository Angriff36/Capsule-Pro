import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";

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
 * Tier 1 (Parallel): event, RSVPs, dishes, prep tasks, related events
 * Tier 2 (Parallel): recipe versions, guest counts for related events
 * Tier 3 (Parallel): recipe ingredients, recipe steps
 * Tier 4 (Sequential): inventory items
 * Tier 5 (Sequential): inventory stock levels
 *
 * This reduces TTFB by ~30% compared to sequential execution.
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
    // Invalid path segment like "/events/settings" should not reach this page
    // Fail fast to avoid "invalid input syntax for type uuid" errors from Postgres
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

  // Budget model does not exist in schema - set to null
  const budget: null = null;

  return (
    <>
      <Header
        page={event.title}
        pages={[
          { label: "Operations", href: "/operations" },
          { label: "Events", href: "/events" },
        ]}
      >
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${eventId}/battle-board`}
          >
            Battle Board
          </a>
          <EventExportButton eventId={eventId} eventName={event.title} />
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/events"
          >
            Back to events
          </a>
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/events/import"
          >
            Import new
          </a>
          <DeleteEventButton
            eventId={eventId}
            eventTitle={event.title}
            size="sm"
          />
        </div>
      </Header>
      <EventDetailsClient
        budget={budget}
        event={{
          ...event,
          budget: event.budget === null ? null : Number(event.budget),
          ticketPrice:
            event.ticketPrice === null ? null : Number(event.ticketPrice),
        }}
        eventDishes={eventDishes}
        inventoryCoverage={inventoryCoverage}
        prepTasks={prepTasksForClient}
        recipeDetails={recipeDetails}
        relatedEvents={relatedEvents}
        relatedGuestCounts={relatedGuestCounts}
        rsvpCount={rsvpCount}
        tenantId={tenantId}
      />
    </>
  );
};

export default EventDetailsPage;
