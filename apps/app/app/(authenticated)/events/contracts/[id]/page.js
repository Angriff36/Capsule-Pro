/**
 * @module ContractDetailPage
 * @intent Display full contract details with signatures, document viewer, and actions
 * @responsibility Render contract detail page with server-side data fetching, handle loading/error states
 * @domain Events
 * @tags contracts, events, detail-page
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../../lib/tenant");
const header_1 = require("../../../components/header");
const contract_detail_client_1 = require("./contract-detail-client");
const ContractDetailPage = async ({ params }) => {
  const { id } = await params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Fetch contract with related event and client data
  const contract = await database_1.database.eventContract.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id,
      },
    },
  });
  if (!contract || contract.deletedAt) {
    (0, navigation_1.notFound)();
  }
  // Fetch related event
  const event = await database_1.database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: contract.eventId,
      },
    },
    select: {
      id: true,
      title: true,
      eventDate: true,
      eventNumber: true,
      venueName: true,
    },
  });
  // Fetch related client
  const client = await database_1.database.$queryRaw`
    SELECT c.id,
           c.company_name,
           c.first_name,
           c.last_name,
           c.email,
           c.phone
    FROM tenant_crm.clients AS c
    WHERE c.tenant_id = ${tenantId}
      AND c.id = ${contract.clientId}
      AND c.deleted_at IS NULL
  `;
  // Fetch signatures for this contract
  const signatures = await database_1.database.contractSignature.findMany({
    where: {
      tenantId,
      contractId: id,
      deletedAt: null,
    },
    orderBy: {
      signedAt: "desc",
    },
  });
  return (
    <>
      <header_1.Header
        page={contract.title}
        pages={["Operations", "Events", "Contracts"]}
      >
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 font-medium text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href={`/events/${contract.eventId}`}
          >
            Back to Event
          </a>
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            href="/events"
          >
            All Events
          </a>
        </div>
      </header_1.Header>
      <contract_detail_client_1.ContractDetailClient
        client={client[0] || null}
        contract={contract}
        event={event}
        signatures={signatures}
      />
    </>
  );
};
exports.default = ContractDetailPage;
