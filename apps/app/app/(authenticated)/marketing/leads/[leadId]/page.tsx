/**
 * @module marketing/leads/[leadId]
 * @intent Lead detail page — displays full lead information with actions
 *   (convert to client, disqualify, archive)
 * @responsibility Fetch single lead via Prisma, render Cohere page shell,
 *   delegate interactivity to client component
 * @domain Marketing / CRM
 * @tags leads, marketing, detail-page
 * @canonical true
 */

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
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { notFound, redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { LeadDetailClient } from "./lead-detail-client";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/sign-in");
  }

  const { leadId } = await params;

  // Fetch lead with interactions
  const [lead, interactions] = await Promise.all([
    database.lead.findUnique({
      where: { id: leadId, tenantId, deletedAt: null },
    }),
    database.clientInteraction.findMany({
      where: { tenantId, leadId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!lead) {
    notFound();
  }

  // Serialize Decimal fields
  const serializedLead = {
    ...lead,
    estimatedValue:
      lead.estimatedValue != null ? Number(lead.estimatedValue) : null,
  };

  const serializedInteractions = interactions.map((i) => ({
    ...i,
    leadId: i.leadId ?? undefined,
  }));

  // Compute derived metrics
  const eventDate = lead.eventDate
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(lead.eventDate))
    : null;

  const daysUntil = lead.eventDate
    ? Math.ceil(
        (new Date(lead.eventDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel>Operations / Marketing / Leads</MonoLabel>
          <DisplayHeading>{lead.contactName}</DisplayHeading>
          <CommandBandLede>
            {lead.companyName && `${lead.companyName} · `}
            {lead.status} lead{lead.source ? ` via ${lead.source}` : ""}
          </CommandBandLede>
          <CommandBandActions>
            <Button asChild size="sm" variant="outline">
              <a href="/marketing/leads">Back to leads</a>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Estimated value</MetricLabel>
              <MetricValue>
                {lead.estimatedValue != null
                  ? new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Number(lead.estimatedValue))
                  : "\u2014"}
              </MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Guests</MetricLabel>
              <MetricValue>{lead.estimatedGuests ?? "\u2014"}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Event date</MetricLabel>
              <MetricValue>{eventDate ?? "\u2014"}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Days until event</MetricLabel>
              <MetricValue>
                {daysUntil != null
                  ? daysUntil > 0
                    ? `${daysUntil}d`
                    : daysUntil === 0
                      ? "Today"
                      : "Past"
                  : "\u2014"}
              </MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Interactions</MetricLabel>
              <MetricValue>{interactions.length}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>
      <OperationalColumn>
        <LeadDetailClient
          interactions={serializedInteractions}
          lead={
            serializedLead as Parameters<typeof LeadDetailClient>[0]["lead"]
          }
        />
      </OperationalColumn>
    </PageCanvas>
  );
}
