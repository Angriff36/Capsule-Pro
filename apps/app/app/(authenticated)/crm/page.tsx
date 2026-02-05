import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
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

  const clientMetrics = [
    {
      label: "Active clients",
      value: activeClients.toLocaleString(),
      detail:
        newClients > 0
          ? `+${newClients} added this week`
          : "No new clients this week",
    },
    {
      label: "Open proposals",
      value: openProposals.toLocaleString(),
      detail:
        awaitingResponses > 0
          ? `${awaitingResponses} awaiting response`
          : "No proposals awaiting response",
    },
    {
      label: "Venue partners",
      value: venuePartners.toLocaleString(),
      detail: "Active venues in the last 12 months",
    },
  ];

  const topClientRows = topClients.map((client) => ({
    id: client.id,
    name: client.name,
    proposals: client.orderCount,
    ltv: client.lifetimeValue,
    lastActivity: client.lastOrderDate
      ? dateFormatter.format(new Date(client.lastOrderDate))
      : "N/A",
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
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">CRM Overview</h1>
        <p className="text-muted-foreground">
          Centralize account health, pipeline, and communications in one place.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {clientMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle>{metric.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {metric.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Clients & Communications
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients (by LTV)</CardTitle>
              <CardDescription>Track who drives repeat business.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">LTV</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClientRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            No client revenue yet.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      topClientRows.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>{client.name}</TableCell>
                          <TableCell className="text-right">
                            {client.proposals}
                          </TableCell>
                          <TableCell className="text-right">
                            {currencyFormatter.format(client.ltv)}
                          </TableCell>
                          <TableCell>{client.lastActivity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Communications</CardTitle>
              <CardDescription>
                High-touch conversations this week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {communications.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                  No recent communications logged.
                </div>
              ) : (
                communications.map((note) => (
                  <div
                    className="rounded-lg border border-border/70 px-4 py-3"
                    key={note.id}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{note.client}</p>
                      <Badge
                        variant={
                          note.status === "Resolved" ? "secondary" : "outline"
                        }
                      >
                        {note.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {note.channel}
                    </p>
                    <p className="text-sm text-muted-foreground">{note.summary}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default CrmPage;
