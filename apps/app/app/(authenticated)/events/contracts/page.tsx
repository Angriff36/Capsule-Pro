import {
  listClients,
  listEventContracts,
  listEvents,
} from "@/app/lib/manifest-client.generated";
/**
 * @module ContractsListPage
 * @intent Display all contracts with filters, search, and expiring alerts
 * @responsibility Server-side data fetching and rendering of contracts list
 * @domain Events
 * @tags contracts, events, crm
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Separator } from "@repo/design-system/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { ContractsPageClient } from "./components/contracts-page-client";

interface ContractWithRelations {
  client?: {
    id: string;
    name: string;
  } | null;
  clientId: string;
  contractNumber: string | null;
  createdAt: Date;
  documentType: string | null;
  documentUrl: string | null;
  event?: {
    id: string;
    title: string;
    eventDate: Date;
  } | null;
  eventId: string;
  expiresAt: Date | null;
  id: string;
  notes: string | null;
  status: string;
  tenantId: string;
  title: string;
  updatedAt: Date;
}

const ContractsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [contractsRaw, eventsRaw, clientsRaw] = await Promise.all([
    listEventContracts(),
    listEvents(),
    listClients(),
  ]);
  const eventById = new Map(
    eventsRaw.data
      .filter((event) => event.tenantId === tenantId && !event.deletedAt)
      .map((event) => [event.id, event])
  );
  const clientById = new Map(
    clientsRaw.data
      .filter((client) => client.tenantId === tenantId && !client.deletedAt)
      .map((client) => [client.id, client])
  );
  const contracts: ContractWithRelations[] = contractsRaw.data
    .filter((contract) => contract.tenantId === tenantId && !contract.deletedAt)
    .map((contract) => {
      const event = eventById.get(contract.eventId);
      const client = clientById.get(contract.clientId);
      return {
        id: contract.id,
        tenantId: contract.tenantId,
        eventId: contract.eventId,
        clientId: contract.clientId,
        contractNumber: contract.contractNumber ?? null,
        title: contract.title ?? "",
        status: contract.status ?? "draft",
        documentUrl: contract.documentUrl ?? null,
        documentType: contract.documentType ?? null,
        notes: contract.notes ?? null,
        expiresAt: contract.expiresAt ? new Date(contract.expiresAt) : null,
        createdAt: new Date(contract.createdAt),
        updatedAt: new Date(contract.updatedAt),
        event: event
          ? {
              id: event.id,
              title: event.title ?? "",
              eventDate: new Date(event.eventDate),
            }
          : null,
        client: client
          ? {
              id: client.id,
              name:
                client.companyName ||
                `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() ||
                "Unknown",
            }
          : null,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
    new Set(
      contracts
        .map((c) => c.client?.name)
        .filter((n): n is string => Boolean(n))
    )
  );
  const uniqueDocumentTypes = Array.from(
    new Set(
      contracts
        .map((c) => c.documentType)
        .filter((t): t is string => Boolean(t))
    )
  );

  // Fetch events for the contract creation dropdown
  const events = eventsRaw.data.filter(
    (event) => event.tenantId === tenantId && !event.deletedAt
  );

  // Fetch clients for the contract creation dropdown
  const rawClients = clientsRaw.data
    .filter((client) => client.tenantId === tenantId && !client.deletedAt)
    .map((client) => ({
      id: client.id,
      name:
        client.companyName ||
        `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() ||
        "Unknown",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 100);

  // Serialize dates for client component
  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    eventDate: e.eventDate.toISOString(),
  }));

  return (
    <>
      <Header page="Contracts" pages={[{ label: "Events", href: "/events" }]}>
        {/* New Contract button is in ContractsPageClient */}
      </Header>

      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">
            Manage event contracts, track signatures, and monitor expiration
            dates
          </p>
        </div>

        <Separator />

        {/* Expiring Contracts Alert */}
        {expiringContracts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>
              {expiringContracts.length} Contract
              {expiringContracts.length > 1 ? "s" : ""} Expiring Soon
            </AlertTitle>
            <AlertDescription>
              The following contracts expire within the next 30 days and need
              attention.
              <ul className="mt-3 space-y-2">
                {expiringContracts.slice(0, 5).map((contract) => (
                  <li
                    className="flex items-center justify-between gap-4 text-sm"
                    key={contract.id}
                  >
                    <span className="font-medium">{contract.title}</span>
                    <span className="text-xs">
                      Expires:{" "}
                      {contract.expiresAt
                        ? new Date(contract.expiresAt).toLocaleDateString()
                        : "--"}
                    </span>
                  </li>
                ))}
                {expiringContracts.length > 5 && (
                  <li className="text-xs">
                    And {expiringContracts.length - 5} more...
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Client Component for Interactivity */}
        <ContractsPageClient
          clientsForCreate={rawClients}
          contracts={contracts}
          events={serializedEvents}
          tenantId={tenantId}
          uniqueClients={uniqueClients}
          uniqueDocumentTypes={uniqueDocumentTypes}
          uniqueStatuses={uniqueStatuses}
        />
      </div>
    </>
  );
};

export default ContractsPage;
