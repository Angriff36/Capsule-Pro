import {
  listClients,
  listContractSignatures,
  listEventContracts,
  listEvents,
} from "@/app/lib/manifest-client.generated";
/**
 * @module ContractDetailPage
 * @intent Display full contract details with signatures, document viewer, and actions
 * @responsibility Render contract detail page with server-side data fetching, handle loading/error states
 * @domain Events
 * @tags contracts, events, detail-page
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { ContractDetailClient } from "./contract-detail-client";

interface ContractDetailPageProps {
  params: Promise<{
    contractId: string;
  }>;
}

const ContractDetailPage = async ({ params }: ContractDetailPageProps) => {
  const { contractId: id } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch contract with related event and client data
  let contract: Awaited<ReturnType<typeof listEventContracts>>["data"][number] | null = null;
  try {
    contract =
      (await listEventContracts()).data.find(
        (row) => row.id === id && !row.deletedAt
      ) ?? null;
  } catch {
    notFound();
  }

  if (!contract || contract.deletedAt) {
    notFound();
  }

  // Fetch related event
  let event: Awaited<ReturnType<typeof listEvents>>["data"][number] | null = null;
  try {
    event =
      (await listEvents()).data.find(
        (row) => row.id === contract.eventId && !row.deletedAt
      ) ?? null;
  } catch {
    event = null;
  }

  // Fetch related client
  let client: {
    id: string;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  try {
    client =
      (await listClients()).data.find(
        (row) =>
          row.id === contract.clientId &&
          row.tenantId === tenantId &&
          !row.deletedAt
      ) ?? null;
  } catch {
    client = null;
  }

  // Fetch signatures for this contract
  let signatures: Awaited<ReturnType<typeof listContractSignatures>>["data"];
  try {
    signatures = (await listContractSignatures()).data.filter(
      (row) => row.contractId === id && !row.deletedAt
    );
  } catch {
    signatures = [];
  }

  return (
    <>
      <Header
        page={contract.title}
        pages={[
          { label: "Events", href: "/events" },
          { label: "Contracts", href: "/events/contracts" },
        ]}
      >
        <div className="flex items-center gap-2">
          <a
            className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-hairline bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
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
      </Header>
      <ContractDetailClient
        client={client}
        contract={contract}
        event={event}
        signatures={signatures}
      />
    </>
  );
};

export default ContractDetailPage;
