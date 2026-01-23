import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { notFound } from "next/navigation";

import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { EventDetailsClient } from "./event-details-client";
import { validatePrepTasks } from "./prep-task-contract";

type EventDetailsPageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

const EventDetailsPage = async ({ params }: EventDetailsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event || event.deletedAt) {
    notFound();
  }

  const prepTasks = validatePrepTasks(
    await database.$queryRaw<unknown>(
      Prisma.sql`
      SELECT id,
             name,
             status,
             quantity_total AS "quantityTotal",
             servings_total AS "servingsTotal",
             due_by_date AS "dueByDate",
             is_event_finish AS "isEventFinish"
      FROM tenant_kitchen.prep_tasks
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY due_by_date ASC, created_at ASC
    `
    )
  );

  // Fetch budget for this event
  const budget = await database.eventBudget.findFirst({
    where: {
      AND: [
        { tenantId },
        { eventId },
        { status: { in: ["draft", "approved"] } },
        { deletedAt: null },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header page={event.title} pages={["Operations", "Events"]}>
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${eventId}/battle-board`}
          >
            Battle Board
          </a>
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
        </div>
      </Header>
      <EventDetailsClient
        budget={budget}
        event={event}
        prepTasks={prepTasks}
      />
    </>
  );
};

export default EventDetailsPage;
