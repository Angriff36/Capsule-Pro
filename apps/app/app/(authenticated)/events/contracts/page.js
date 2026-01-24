/**
 * @module ContractsListPage
 * @intent Display all contracts with filters, search, and expiring alerts
 * @responsibility Server-side data fetching and rendering of contracts list
 * @domain Events
 * @tags contracts, events, crm
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const contracts_page_client_1 = require("./components/contracts-page-client");
const ContractsPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Fetch all contracts with related event and client data
  const contracts = await database_1.database.$queryRaw`
    SELECT
      ec.id,
      ec.tenant_id,
      ec.event_id,
      ec.client_id,
      ec.contract_number,
      ec.title,
      ec.status,
      ec.document_url,
      ec.document_type,
      ec.notes,
      ec.expires_at,
      ec.created_at,
      ec.updated_at,
      jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'eventDate', e.event_date
      ) as event,
      jsonb_build_object(
        'id', c.id,
        'name', c.name
      ) as client
    FROM tenant_events.event_contracts ec
    LEFT JOIN tenant_events.events e ON e.tenant_id = ec.tenant_id AND e.id = ec.event_id
    LEFT JOIN tenant_crm.clients c ON c.tenant_id = ec.tenant_id AND c.id = ec.client_id
    WHERE ec.tenant_id = ${tenantId}
      AND ec.deleted_at IS NULL
    ORDER BY ec.created_at DESC
  `;
  // Calculate expiring contracts (within 30 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringContracts = contracts.filter((contract) => {
    if (
      !contract.expiresAt ||
      contract.status === "signed" ||
      contract.status === "canceled"
    ) {
      return false;
    }
    const expiresAt = new Date(contract.expiresAt);
    return expiresAt >= today && expiresAt <= thirtyDaysFromNow;
  });
  // Get unique values for filters
  const uniqueStatuses = Array.from(new Set(contracts.map((c) => c.status)));
  const uniqueClients = Array.from(
    new Set(contracts.map((c) => c.client?.name).filter((n) => Boolean(n)))
  );
  const uniqueDocumentTypes = Array.from(
    new Set(contracts.map((c) => c.documentType).filter((t) => Boolean(t)))
  );
  return (
    <>
      <header_1.Header page="Contracts" pages={["Operations", "Events"]}>
        {/* Add action buttons here if needed */}
      </header_1.Header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Expiring Contracts Alert */}
        {expiringContracts.length > 0 && (
          <div className="border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <lucide_react_1.AlertTriangleIcon className="text-amber-600 dark:text-amber-500 mt-0.5 size-5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                  {expiringContracts.length} Contract
                  {expiringContracts.length > 1 ? "s" : ""} Expiring Soon
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-1 text-sm">
                  The following contracts expire within the next 30 days and
                  need attention.
                </p>
                <ul className="mt-3 space-y-2">
                  {expiringContracts.slice(0, 5).map((contract) => (
                    <li
                      className="text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between"
                      key={contract.id}
                    >
                      <span className="font-medium">{contract.title}</span>
                      <span className="text-amber-600 dark:text-amber-400 text-xs">
                        Expires:{" "}
                        {contract.expiresAt
                          ? new Date(contract.expiresAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </li>
                  ))}
                  {expiringContracts.length > 5 && (
                    <li className="text-amber-700 dark:text-amber-300 text-xs">
                      And {expiringContracts.length - 5} more...
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Client Component for Interactivity */}
        <contracts_page_client_1.ContractsPageClient
          contracts={contracts}
          tenantId={tenantId}
          uniqueClients={uniqueClients}
          uniqueDocumentTypes={uniqueDocumentTypes}
          uniqueStatuses={uniqueStatuses}
        />
      </div>
    </>
  );
};
exports.default = ContractsPage;
