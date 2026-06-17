import { listClients, listLeads } from "@/app/lib/manifest-client.generated";
/**
 * @module marketing/leads
 * @intent Marketing leads listing — server component that fetches leads and
 *   renders a Cohere-aligned page shell with summary metrics
 * @responsibility Auth guard, tenant resolution, Prisma data fetch, metric
 *   aggregation, and page-shell composition
 * @domain Marketing / CRM
 * @tags leads, marketing, server-component
 * @canonical true
 */

import { auth } from "@repo/auth/server";
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
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { LeadsPageClient } from "./leads-page-client";

export const metadata: Metadata = {
  title: "Leads — Marketing",
  description:
    "Track and qualify inbound leads from events, referrals, and outreach.",
};

// ---------------------------------------------------------------------------
// Decimal serializer — Prisma Decimal is not JSON-serializable as-is
// ---------------------------------------------------------------------------

function serializeLead<T extends { estimatedValue: unknown }>(lead: T) {
  return {
    ...lead,
    estimatedValue:
      lead.estimatedValue == null ? null : Number(lead.estimatedValue),
  } as Omit<T, "estimatedValue"> & { estimatedValue: number | null };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MarketingLeadsPage() {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/sign-in");
  }

  // Parallel data fetch: leads + aggregate metrics
  const leads = (await listLeads()).data;

  // Build summary from grouped counts
  const countByStatus: Record<string, number> = {};
  for (const lead of leads) {
    const status = lead.status || "unknown";
    countByStatus[status] = (countByStatus[status] ?? 0) + 1;
  }

  const summary = {
    totalCount: leads.length,
    newCount: countByStatus.new ?? 0,
    contactedCount: countByStatus.contacted ?? 0,
    qualifiedCount: countByStatus.qualified ?? 0,
    convertedCount: countByStatus.converted ?? 0,
    disqualifiedCount: countByStatus.disqualified ?? 0,
    totalEstimatedValue: leads.reduce(
      (sum, lead) => sum + Number(lead.estimatedValue ?? 0),
      0
    ),
  };

  // Spec FR-129: annotate leads whose contactEmail matches an existing Client
  // or another Lead with a possibleDuplicate flag so the row can render
  // MonoLabel "POSSIBLE DUPLICATE". Computed in a single query each to avoid N+1.
  const leadEmails = Array.from(
    new Set(
      leads
        .map((l) => l.contactEmail?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );

  let clientEmailSet = new Set<string>();
  let leadEmailCounts = new Map<string, number>();
  if (leadEmails.length > 0) {
    const [matchingClients, matchingLeads] = await Promise.all([
      (await listClients()).data,
      (await listLeads()).data,
    ]);
    clientEmailSet = new Set(
      matchingClients
        .map((c) => c.email?.toLowerCase())
        .filter((e): e is string => Boolean(e))
    );
    leadEmailCounts = matchingLeads.reduce((acc, l) => {
      const e = l.contactEmail?.toLowerCase();
      if (e) {
        acc.set(e, (acc.get(e) ?? 0) + 1);
      }
      return acc;
    }, new Map<string, number>());
  }

  const serializedLeads = leads.map((lead) => {
    const serialized = serializeLead(lead);
    const email = lead.contactEmail?.trim().toLowerCase();
    if (!email) {
      return serialized;
    }
    const clientHit = clientEmailSet.has(email);
    const leadHit = (leadEmailCounts.get(email) ?? 0) > 1;
    return { ...serialized, possibleDuplicate: clientHit || leadHit };
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel>Operations / Marketing / Leads</MonoLabel>
          <DisplayHeading>Leads</DisplayHeading>
          <CommandBandLede>
            {summary.totalCount} lead{summary.totalCount === 1 ? "" : "s"}{" "}
            tracked
            {summary.totalEstimatedValue > 0 &&
              ` — ${new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(summary.totalEstimatedValue)} pipeline value`}
          </CommandBandLede>
          <CommandBandActions>
            <Button asChild size="sm">
              <a href="/marketing/leads/new">New lead</a>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>{summary.totalCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>New</MetricLabel>
              <MetricValue>{summary.newCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Qualified</MetricLabel>
              <MetricValue>{summary.qualifiedCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Converted</MetricLabel>
              <MetricValue>{summary.convertedCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pipeline value</MetricLabel>
              <MetricValue>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(summary.totalEstimatedValue)}
              </MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>
      <OperationalColumn>
        <SectionHeader title="All leads" />
        <LeadsPageClient leads={serializedLeads} summary={summary} />
      </OperationalColumn>
    </PageCanvas>
  );
}
