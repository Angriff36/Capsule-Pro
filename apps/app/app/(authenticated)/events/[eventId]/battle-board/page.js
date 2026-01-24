Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../lib/tenant");
const header_1 = require("../../../components/header");
const tasks_1 = require("./actions/tasks");
const timeline_1 = require("./components/timeline");
const BattleBoardPage = async ({ params }) => {
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
  const [tasks, staff] = await Promise.all([
    (0, tasks_1.getTimelineTasks)(eventId),
    (0, tasks_1.getEventStaff)(eventId),
  ]);
  return (
    <>
      <header_1.Header
        page={event.title}
        pages={["Operations", "Events", "Battle Board"]}
      >
        <a
          className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          href={`/events/${eventId}`}
        >
          Back to Event
        </a>
      </header_1.Header>
      <timeline_1.Timeline
        eventDate={event.eventDate}
        eventId={eventId}
        initialStaff={staff}
        initialTasks={tasks}
      />
    </>
  );
};
exports.default = BattleBoardPage;
