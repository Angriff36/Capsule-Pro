import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { EventContractsClient } from "./event-contracts-client";

const EVENT_ID_UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

const isEventIdUuid = (value: string): boolean =>
  EVENT_ID_UUID_REGEX.test(value);

interface ContractRow {
  client_id: string;
  client_name: string | null;
  contract_number: string | null;
  created_at: Date;
  document_type: string | null;
  document_url: string | null;
  expires_at: Date | null;
  id: string;
  notes: string | null;
  status: string;
  title: string;
  updated_at: Date;
}

interface EventContractsPageProps {
  params: Promise<{ eventId: string }>;
}

const EventContractsPage = async ({ params }: EventContractsPageProps) => {
  const { eventId } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  if (!isEventIdUuid(eventId)) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [event, contracts] = await Promise.all([
    database.event.findUnique({
      where: { tenantId_id: { tenantId, id: eventId } },
      select: {
        id: true,
        title: true,
        eventNumber: true,
        eventDate: true,
      },
    }),
    database.$queryRaw<ContractRow[]>`
      SELECT
        ec.id,
        ec.title,
        ec.status,
        ec.contract_number,
        ec.document_url,
        ec.document_type,
        ec.notes,
        ec.expires_at,
        ec.created_at,
        ec.updated_at,
        ec.client_id,
        COALESCE(c.company_name, NULLIF(TRIM(CONCAT(c.first_name, ' ', c.last_name)), ''), 'Unknown') AS client_name
      FROM tenant_events.event_contracts ec
      LEFT JOIN tenant_crm.clients c ON c.tenant_id = ec.tenant_id AND c.id = ec.client_id
      WHERE ec.tenant_id = ${tenantId}
        AND ec.event_id = ${eventId}
        AND ec.deleted_at IS NULL
      ORDER BY ec.created_at DESC
    `,
  ]);

  if (!event) {
    notFound();
  }

  const eventLabel = event.eventNumber
    ? `${event.eventNumber} — ${event.title}`
    : event.title;

  const total = contracts.length;

  const statusCounts = contracts.reduce(
    (acc, c) => {
      const key = c.status.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const heroStats = [
    {
      label: "Total Contracts",
      value: String(total),
      delta: total === 0 ? "No contracts yet" : null,
    },
    {
      label: "Active",
      value: String(statusCounts.active || 0),
      delta: null,
    },
    {
      label: "Draft",
      value: String(statusCounts.draft || 0),
      delta: null,
    },
    {
      label: "Signed",
      value: String(statusCounts.signed || 0),
      delta: null,
    },
    {
      label: "Expired",
      value: String(statusCounts.expired || 0),
      delta: null,
    },
  ];

  const serializedContracts = contracts.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    contractNumber: c.contract_number,
    documentUrl: c.document_url,
    documentType: c.document_type,
    notes: c.notes,
    expiresAt: c.expires_at?.toISOString() ?? null,
    createdAt: c.created_at.toISOString(),
    updatedAt: c.updated_at.toISOString(),
    client: c.client_name ? { id: c.client_id, name: c.client_name } : null,
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / {eventLabel} / Contracts</MonoLabel>
            <DisplayHeading>Contracts</DisplayHeading>
            <CommandBandLede>
              {eventLabel} &mdash; {total}{" "}
              {total === 1 ? "contract" : "contracts"}
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href={`/events/${eventId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back to Event
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/events/contracts?eventId=${eventId}`}>
                View All Contracts
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {heroStats.map((stat) => (
              <MetricCell key={stat.label}>
                <MetricLabel>{stat.label}</MetricLabel>
                <MetricValue>{stat.value}</MetricValue>
                {stat.delta ? <MetricDelta>{stat.delta}</MetricDelta> : null}
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} ${total === 1 ? "contract" : "contracts"}`}
            description="Contracts linked to this event. Click to view details, signing status, and expiration."
            eyebrow="Event contracts"
            title="Contracts"
          />
          <EventContractsClient
            contracts={serializedContracts}
            eventId={eventId}
            eventLabel={eventLabel}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default EventContractsPage;
