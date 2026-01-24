Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const event_details_client_1 = require("./event-details-client");
const export_button_1 = require("./components/export-button");
const prep_task_contract_1 = require("./prep-task-contract");
const EventDetailsPage = async ({ params }) => {
  const { eventId } = await params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const event = await database_1.database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });
  if (!event || event.deletedAt) {
    (0, navigation_1.notFound)();
  }
  const prepTasks = (0, prep_task_contract_1.validatePrepTasks)(
    await database_1.database.$queryRaw(database_1.Prisma.sql`
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
    `)
  );
  // Budget model does not exist in schema - set to null
  const budget = null;
  return (
    <>
      <header_1.Header page={event.title} pages={["Operations", "Events"]}>
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${eventId}/battle-board`}
          >
            Battle Board
          </a>
          <export_button_1.EventExportButton
            eventId={eventId}
            eventName={event.title}
          />
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
      </header_1.Header>
      <event_details_client_1.EventDetailsClient
        budget={budget}
        event={event}
        prepTasks={prepTasks}
        tenantId={tenantId}
      />
    </>
  );
};
exports.default = EventDetailsPage;
