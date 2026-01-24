Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const actions_1 = require("./actions");
const prep_list_client_1 = require("./prep-list-client");
const KitchenPrepListsPage = async ({ searchParams }) => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return null;
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const params = searchParams ? await searchParams : {};
  const eventId = params.eventId;
  const availableEvents = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT 
        e.id,
        e.title,
        e.event_date,
        e.guest_count
      FROM tenant_events.events e
      WHERE e.tenant_id = ${tenantId}
        AND e.deleted_at IS NULL
        AND e.event_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY e.event_date ASC
      LIMIT 20
    `);
  let initialPrepList = null;
  if (eventId) {
    try {
      initialPrepList = await (0, actions_1.generatePrepList)({ eventId });
    } catch (error) {
      console.error("Error generating prep list:", error);
    }
  }
  return (
    <>
      <header_1.Header page="Prep Lists" pages={["Kitchen Ops"]} />
      <prep_list_client_1.PrepListClient
        availableEvents={availableEvents.map((e) => ({
          id: e.id,
          title: e.title,
          eventDate: e.event_date,
          guestCount: e.guest_count,
        }))}
        eventId={eventId ?? availableEvents[0]?.id ?? ""}
        initialPrepList={initialPrepList}
      />
    </>
  );
};
exports.default = KitchenPrepListsPage;
