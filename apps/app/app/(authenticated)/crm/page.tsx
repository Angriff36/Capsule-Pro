import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { getClientList } from "../analytics/clients/actions/get-client-ltv";
import { getProposalStats } from "./proposals/actions";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const CrmPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    proposalStats,
    activeClients,
    newClients,
    topClients,
    venuePartnerRows,
    recentCommunications,
  ] = await Promise.all([
    getProposalStats(),
    database.client.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    }),
    database.client.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    getClientList("ltv", 5),
    database.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT DISTINCT venue_id::text AS venue
          FROM tenant_events.events
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND venue_id IS NOT NULL
            AND event_date >= NOW() - INTERVAL '12 months'
          UNION
          SELECT DISTINCT venue_name AS venue
          FROM tenant_events.events
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND venue_id IS NULL
            AND venue_name IS NOT NULL
            AND event_date >= NOW() - INTERVAL '12 months'
        ) venues
      `
    ),
    database.$queryRaw<
      Array<{
        id: string;
        client_name: string;
        interaction_type: string;
        subject: string | null;
        description: string | null;
        follow_up_date: Date | null;
        follow_up_completed: boolean;
        interaction_date: Date;
      }>
    >(
      Prisma.sql`
        SELECT
          ci.id,
          COALESCE(c.company_name, CONCAT(c.first_name, ' ', c.last_name)) AS client_name,
          ci.interaction_type,
          ci.subject,
          ci.description,
          ci.follow_up_date,
          ci.follow_up_completed,
          ci.interaction_date
        FROM tenant_crm.client_interactions ci
        LEFT JOIN tenant_crm.clients c
          ON ci.tenant_id = c.tenant_id AND ci.client_id = c.id
        WHERE ci.tenant_id = ${tenantId}::uuid
          AND ci.deleted_at IS NULL
        ORDER BY ci.interaction_date DESC
        LIMIT 5
      `
    ),
  ]);

  const venuePartners = Number(venuePartnerRows[0]?.count ?? 0);
  const openProposals =
    proposalStats.draft + proposalStats.sent + proposalStats.viewed;
  const awaitingResponses = proposalStats.sent + proposalStats.viewed;

  const stats = [
    {
      label: "Active clients",
      value: activeClients.toLocaleString(),
      note:
        newClients > 0
          ? `+${newClients} this week`
          : "No new clients this week",
    },
    {
      label: "Open proposals",
      value: openProposals.toLocaleString(),
      note:
        awaitingResponses > 0
          ? `${awaitingResponses} awaiting response`
          : "Inbox clear",
    },
    {
      label: "Venue partners",
      value: venuePartners.toLocaleString(),
      note: "Active in last 12 months",
    },
    {
      label: "Top LTV",
      value: currencyFormatter.format(topClients[0]?.lifetimeValue ?? 0),
      note: topClients[0]?.name ?? "No client revenue",
    },
  ];

  const topClientRows = topClients.map((client) => ({
    id: client.id,
    name: client.name,
    proposals: client.orderCount,
    ltv: client.lifetimeValue,
    lastActivity: client.lastOrderDate
      ? dateFormatter.format(new Date(client.lastOrderDate))
      : "—",
  }));

  const communications = recentCommunications.map((note) => {
    const followUpDue =
      note.follow_up_date &&
      !note.follow_up_completed &&
      note.follow_up_date <= now;
    const status = note.follow_up_completed
      ? "Resolved"
      : followUpDue
        ? "Needs follow-up"
        : "Waiting reply";

    return {
      id: note.id,
      client: note.client_name || "Unknown client",
      channel: note.interaction_type,
      summary: note.subject || note.description || "Interaction logged.",
      status,
    };
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / CRM</MonoLabel>
            <DisplayHeading>
              Accounts, pipeline, and conversations
            </DisplayHeading>
            <CommandBandLede>
              Centralize relationship health, open proposals, and recent
              communications. Spot the conversations to chase before they go
              cold.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm/proposals">View proposals</Link>
            </Button>
            <Button asChild size="default" variant="on-dark">
              <Link href="/crm/clients/new">New client</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {stats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
                <div className="text-white/55 text-xs">{item.note}</div>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <SectionHeader
              count={`${topClientRows.length} clients`}
              description="Track who drives repeat business and lifetime value."
              eyebrow="Top accounts"
              title="Lifetime value"
            />
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">LTV</TableHead>
                    <TableHead>Last activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClientRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <div className="py-6 text-center text-muted-foreground text-sm">
                          No client revenue yet.
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    topClientRows.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium text-ink">
                          {client.name}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {client.proposals}
                        </TableCell>
                        <TableCell className="text-right font-medium text-ink">
                          {currencyFormatter.format(client.ltv)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.lastActivity}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              count={`${communications.length} entries`}
              description="High-touch conversations this week."
              eyebrow="Communications"
              title="Recent activity"
            />
            <div className="space-y-3">
              {communications.length === 0 ? (
                <div className="rounded-[22px] border border-hairline border-dashed bg-canvas px-4 py-10 text-center text-muted-foreground text-sm">
                  No recent communications logged.
                </div>
              ) : (
                communications.map((note) => (
                  <div
                    className="rounded-[22px] border border-hairline bg-canvas px-5 py-4"
                    key={note.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink text-sm">
                        {note.client}
                      </p>
                      <Badge
                        variant={
                          note.status === "Resolved"
                            ? "success"
                            : note.status === "Needs follow-up"
                              ? "coral"
                              : "secondary"
                        }
                      >
                        {note.status}
                      </Badge>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
                      {note.channel}
                    </p>
                    <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                      {note.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default CrmPage;
