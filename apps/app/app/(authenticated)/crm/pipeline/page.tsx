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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { formatCurrency as _formatCurrency } from "@repo/design-system/lib/format-currency";

const formatCurrency = (v: unknown) =>
  _formatCurrency(typeof v === "number" ? v : Number(v ?? 0), { fractionDigits: 0 });

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const stageOrder = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

type DealStage = (typeof stageOrder)[number];

function proposalStatusToStage(
  status: string,
  eventId: string | null
): DealStage {
  switch (status) {
    case "draft":
      return "lead";
    case "sent":
      return "qualified";
    case "viewed":
      return "proposal";
    case "accepted":
      return eventId ? "won" : "negotiation";
    case "rejected":
      return "lost";
    default:
      return "lead";
  }
}

function getClientName(deal: {
  client: {
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  lead: { companyName: string | null; contactName: string | null } | null;
}) {
  if (deal.client?.company_name) return deal.client.company_name;
  if (deal.client) {
    const fullName = [deal.client.first_name, deal.client.last_name]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .trim();
    if (fullName) return fullName;
  }

  if (deal.lead?.companyName) return deal.lead.companyName;
  if (deal.lead?.contactName) return deal.lead.contactName;

  return "Unassigned client";
}


function formatDate(value: Date | null) {
  if (!value) return "—";
  return dateFormatter.format(value);
}

function stageTone(
  stage: DealStage
): "default" | "secondary" | "outline" | "destructive" {
  switch (stage) {
    case "negotiation":
    case "won":
      return "default";
    case "proposal":
      return "outline";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function PipelinePage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const proposals = await database.proposal.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      proposalNumber: true,
      title: true,
      status: true,
      total: true,
      eventDate: true,
      eventId: true,
      guestCount: true,
      client: {
        select: {
          company_name: true,
          first_name: true,
          last_name: true,
        },
      },
      lead: {
        select: {
          companyName: true,
          contactName: true,
        },
      },
    },
  });

  const deals = proposals.map((proposal) => ({
    ...proposal,
    stage: proposalStatusToStage(proposal.status, proposal.eventId),
    clientName: getClientName(proposal),
  }));

  const stageSummary = stageOrder.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      totalValue: stageDeals.reduce(
        (sum, deal) => sum + Number(deal.total ?? 0),
        0
      ),
    };
  });

  const totalPipelineValue = deals.reduce(
    (sum, deal) => sum + Number(deal.total ?? 0),
    0
  );

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / CRM</MonoLabel>
            <DisplayHeading>Deal Pipeline</DisplayHeading>
            <CommandBandLede>
              Live pipeline snapshot from CRM proposals. Review deal stage,
              event timing, guest counts, and pipeline value without relying on
              the broken client-only shell.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm/proposals">View Proposals</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href="/crm/proposals/new">New Proposal</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total deals</MetricLabel>
              <MetricValue>{deals.length}</MetricValue>
              <p className="text-sm text-white/70">Active proposal records</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pipeline value</MetricLabel>
              <MetricValue>{formatCurrency(totalPipelineValue)}</MetricValue>
              <p className="text-sm text-white/70">Across all stages</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Open deals</MetricLabel>
              <MetricValue>
                {stageSummary
                  .filter((item) => !["won", "lost"].includes(item.stage))
                  .reduce((sum, item) => sum + item.count, 0)}
              </MetricValue>
              <p className="text-sm text-white/70">Lead through negotiation</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Closed deals</MetricLabel>
              <MetricValue>
                {stageSummary
                  .filter((item) => ["won", "lost"].includes(item.stage))
                  .reduce((sum, item) => sum + item.count, 0)}
              </MetricValue>
              <p className="text-sm text-white/70">Won or lost outcomes</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {stageSummary.map((item) => (
            <section
              className="rounded-3xl border border-border bg-card p-4"
              key={item.stage}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold capitalize">
                  {item.stage}
                </h2>
                <Badge variant={stageTone(item.stage)}>{item.count}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatCurrency(item.totalValue)} in this stage
              </p>
            </section>
          ))}
        </div>

        <section className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold">Pipeline deals</h2>
              <p className="text-sm text-muted-foreground">
                Server-rendered list of proposals mapped into pipeline stages.
              </p>
            </div>
          </div>

          {deals.length === 0 ? (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              No proposals are available for this tenant yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Deal</th>
                    <th className="px-6 py-3 font-medium">Client</th>
                    <th className="px-6 py-3 font-medium">Stage</th>
                    <th className="px-6 py-3 font-medium">Value</th>
                    <th className="px-6 py-3 font-medium">Event date</th>
                    <th className="px-6 py-3 font-medium">Guests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deals.map((deal) => (
                    <tr className="align-top" key={deal.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {deal.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {deal.proposalNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {deal.clientName}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className="capitalize"
                          variant={stageTone(deal.stage)}
                        >
                          {deal.stage}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatCurrency(deal.total)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatDate(deal.eventDate)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {deal.guestCount?.toLocaleString() ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
