import { listClientInteractions, listClients, listEvents } from "@/app/lib/manifest-client.generated";
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
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Button,
  buttonVariants,
} from "@repo/design-system/components/ui/button";
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

  await getTenantIdForOrg(orgId);
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [proposalStats, allClients, allInteractions, allEvents, topClients] =
    await Promise.all([
    getProposalStats(),
    (await listClients()).data,
    (await listClientInteractions()).data,
    (await listEvents()).data,
    getClientList("ltv", 5),
  ]);

  const activeClients = allClients.length;
  const newClients = allClients.filter((client) => {
    if (!client.createdAt) {
      return false;
    }
    return new Date(client.createdAt) >= sevenDaysAgo;
  }).length;

  const venuePartners = new Set(
    allEvents
      .filter((event) => {
        if (!event.eventDate) {
          return false;
        }
        return new Date(event.eventDate) >= new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      })
      .map((event) => event.venueId || event.venueName)
      .filter((venue): venue is string => Boolean(venue))
  ).size;

  const clientNameById = new Map(
    allClients.map((client) => [
      client.id,
      client.company_name ||
        `${client.first_name || ""} ${client.last_name || ""}`.trim() ||
        "Unknown client",
    ])
  );
  const recentCommunications = allInteractions
    .slice()
    .sort((a, b) => {
      const left = a.interactionDate ? new Date(a.interactionDate).getTime() : 0;
      const right = b.interactionDate ? new Date(b.interactionDate).getTime() : 0;
      return right - left;
    })
    .slice(0, 5)
    .map((interaction) => ({
      id: interaction.id,
      client_name: clientNameById.get(interaction.clientId || "") || "Unknown client",
      interaction_type: interaction.interactionType,
      subject: interaction.subject,
      description: interaction.description,
      follow_up_date: interaction.followUpDate ?? null,
      follow_up_completed: interaction.followUpCompleted ?? false,
      interaction_date: interaction.interactionDate ?? null,
    }));
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

  const resolveCommStatus = (note: {
    follow_up_completed: boolean;
    follow_up_date: Date | null;
  }): "Resolved" | "Needs follow-up" | "Waiting reply" => {
    if (note.follow_up_completed) {
      return "Resolved";
    }
    if (note.follow_up_date && note.follow_up_date <= now) {
      return "Needs follow-up";
    }
    return "Waiting reply";
  };

  const communications = recentCommunications.map((note) => ({
    id: note.id,
    client: note.client_name || "Unknown client",
    channel: note.interaction_type,
    summary: note.subject || note.description || "Interaction logged.",
    status: resolveCommStatus(note),
  }));

  const commStatusVariant = (
    status: "Resolved" | "Needs follow-up" | "Waiting reply"
  ): "success" | "coral" | "secondary" => {
    if (status === "Resolved") {
      return "success";
    }
    if (status === "Needs follow-up") {
      return "coral";
    }
    return "secondary";
  };

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
              <Link href="/crm/segmentation">Segments</Link>
            </Button>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/crm/proposals">View proposals</Link>
            </Button>
            <Link
              className={buttonVariants({
                size: "default",
                variant: "on-dark",
              })}
              href="/crm/clients/new"
            >
              New client
            </Link>
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
                      <Badge variant={commStatusVariant(note.status)}>
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
