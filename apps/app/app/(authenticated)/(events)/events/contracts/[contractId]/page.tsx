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
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { Header } from "../../../../components/header";
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
  let contract: Awaited<ReturnType<typeof database.eventContract.findFirst>>;
  try {
    contract = await database.eventContract.findFirst({
      where: {
        tenantId,
        id,
      },
    });
  } catch {
    notFound();
  }

  if (!contract || contract.deletedAt) {
    notFound();
  }

  // Fetch related event, client, and signatures in parallel. Each read is keyed
  // on independent data (event ← contract.eventId, client ← contract.clientId,
  // signatures ← the route id) and each swallows its own errors to a default, so
  // they have no inter-dependency and a failure in one never affects the others.
  // Collapses the prior 3-read serial waterfall into one concurrent batch.
  interface ContractClientRow {
    company_name: string | null;
    email: string | null;
    first_name: string | null;
    id: string;
    last_name: string | null;
    phone: string | null;
  }

  const [event, client, signatures] = await Promise.all([
    database.event
      .findFirst({
        where: {
          tenantId,
          id: contract.eventId,
        },
        select: {
          id: true,
          title: true,
          eventDate: true,
          eventNumber: true,
          venueName: true,
        },
      })
      .catch(() => null),
    database.$queryRaw<ContractClientRow[]>`
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
    `.catch(() => [] as ContractClientRow[]),
    database.contractSignature
      .findMany({
        where: {
          tenantId,
          contractId: id,
          deletedAt: null,
        },
        orderBy: {
          signedAt: "desc",
        },
      })
      .catch(() => []),
  ]);

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
        client={client[0] || null}
        contract={contract}
        event={event}
        signatures={signatures}
      />
    </>
  );
};

export default ContractDetailPage;
