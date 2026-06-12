/**
 * @module ProposalsPage
 * @intent Server-rendered proposals list with summary metrics
 * @responsibility Fetch all proposals with client relations, compute summary
 *   statistics, and delegate rendering to the client component
 * @domain CRM
 * @tags proposals, crm, server-page
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
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { serializeDecimals } from "@/app/lib/decimal";
import type { Proposal } from "@/app/lib/proposals";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ProposalsPageClient } from "./proposals-page-client";

export const metadata: Metadata = {
  title: "Proposals",
  description: "Manage client proposals and event estimates",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function ProposalsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [allProposalsRaw, acceptedCount, pendingCount, totalValueAggregate] =
    await Promise.all([
      database.proposal.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          tenantId: true,
          proposalNumber: true,
          title: true,
          status: true,
          eventDate: true,
          eventType: true,
          guestCount: true,
          venueName: true,
          total: true,
          discountAmount: true,
          subtotal: true,
          taxRate: true,
          taxAmount: true,
          publicToken: true,
          validUntil: true,
          sentAt: true,
          viewedAt: true,
          acceptedAt: true,
          rejectedAt: true,
          notes: true,
          termsAndConditions: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          clientId: true,
          leadId: true,
          eventId: true,
          templateId: true,
          venueAddress: true,
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
            },
          },
          lead: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
            },
          },
        },
      }),
      database.proposal.count({
        where: {
          tenantId,
          deletedAt: null,
          status: "accepted",
        },
      }),
      database.proposal.count({
        where: {
          tenantId,
          deletedAt: null,
          status: { in: ["draft", "sent", "viewed"] },
        },
      }),
      database.proposal.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { total: true },
      }),
    ]);

  const proposals = allProposalsRaw.map((p) => {
    const serialized = serializeDecimals(p);
    return {
      ...serialized,
      clientName:
        serialized.client?.company_name ||
        (serialized.client
          ? [serialized.client.first_name, serialized.client.last_name]
              .filter(Boolean)
              .join(" ")
              .trim()
          : null),
    };
  }) as unknown as Proposal[];

  const totalCount = proposals.length;
  const totalValue = Number(totalValueAggregate._sum.total ?? 0);
  const formattedTotalValue = currencyFormatter.format(totalValue);

  const summary = {
    totalCount,
    totalValue,
    formattedTotalValue,
    acceptedCount,
    pendingCount,
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / CRM</MonoLabel>
            <DisplayHeading>Proposals</DisplayHeading>
            <CommandBandLede>
              Track estimates and formal quotes from draft through acceptance.
              Spot stale deals, follow up on viewed proposals, and keep the
              pipeline moving.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm/pipeline">Pipeline</Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm/proposals/templates">Templates</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href="/crm/proposals/new">
                <Plus className="mr-2 h-4 w-4" />
                New Proposal
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total proposals</MetricLabel>
              <MetricValue>{totalCount}</MetricValue>
              <p className="text-sm text-white/70">All active records</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total value</MetricLabel>
              <MetricValue>{formattedTotalValue}</MetricValue>
              <p className="text-sm text-white/70">Across all statuses</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Accepted</MetricLabel>
              <MetricValue>{acceptedCount}</MetricValue>
              <p className="text-sm text-white/70">
                {totalCount > 0
                  ? `${Math.round((acceptedCount / totalCount) * 100)}% close rate`
                  : "No proposals yet"}
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pending review</MetricLabel>
              <MetricValue>{pendingCount}</MetricValue>
              <p className="text-sm text-white/70">Draft, sent, or viewed</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <ProposalsPageClient proposals={proposals} summary={summary} />
      </OperationalColumn>
    </PageCanvas>
  );
}
