/**
 * @module ContractDetailPage
 * @intent Display full contract details with signatures, document viewer, and actions
 * @responsibility Render contract detail page with server-side data fetching, handle loading/error states
 * @domain Events
 * @tags contracts, events, detail-page
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import { ContractDetailClient } from "./contract-detail-client";

type ContractDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const ContractDetailPage = async ({ params }: ContractDetailPageProps) => {
  const { id } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch contract with related event and client data
  const contract = await database.event_contracts.findFirst({
    where: {
      tenant_id: tenantId,
      id,
    },
  });

  if (!contract || contract.deleted_at) {
    notFound();
  }

  // Fetch related event
  const event = await database.event.findFirst({
    where: {
      tenant_id: tenantId,
      id: contract.event_id,
    },
    select: {
      id: true,
      title: true,
      event_date: true,
      event_number: true,
      venue_name: true,
    },
  });

  // Fetch related client
  const client = await database.$queryRaw<
    Array<{
      id: string;
      company_name: string | null;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    }>
  >`
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
  const signatures = await database.contract_signatures.findMany({
    where: {
      tenant_id: tenantId,
      contract_id: id,
      deleted_at: null,
    },
    orderBy: {
      signed_at: "desc",
    },
  });

  return (
    <>
      <Header
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
      </Header>
      <ContractDetailClient
        client={client[0] || null}
        contract={contract}
        event={event}
        signatures={signatures}
      />
    </>
  );
};

export default ContractDetailPage;
