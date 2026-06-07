import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface InteractionRow {
  id: string;
  client_name: string | null;
  interaction_type: string;
  subject: string | null;
  description: string | null;
  interaction_date: Date;
  follow_up_date: Date | null;
  follow_up_completed: boolean;
}

const statusVariant: Record<string, "destructive" | "secondary" | "outline"> = {
  "Awaiting reply": "destructive",
  Overdue: "destructive",
  Logged: "secondary",
  Closed: "outline",
};

const deriveStatus = (
  followUpDate: Date | null,
  followUpCompleted: boolean
): string => {
  if (followUpCompleted) {
    return "Closed";
  }

  if (followUpDate) {
    const now = new Date();
    return followUpDate < now ? "Overdue" : "Awaiting reply";
  }

  return "Logged";
};

const formatChannel = (interactionType: string): string => {
  const channelMap: Record<string, string> = {
    email: "Email",
    phone: "Phone",
    meeting: "Meeting",
    note: "In-app note",
  };

  return (
    channelMap[interactionType] ??
    interactionType.charAt(0).toUpperCase() + interactionType.slice(1)
  );
};

const formatInteractionDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const interactionDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (interactionDay.getTime() === today.getTime()) {
    return `Today \u00b7 ${timeStr}`;
  }

  if (interactionDay.getTime() === yesterday.getTime()) {
    return `Yesterday \u00b7 ${timeStr}`;
  }

  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  return `${dateStr} \u00b7 ${timeStr}`;
};

const CrmCommunicationsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const interactionRecords = await database.clientInteraction.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { interactionDate: "desc" },
    take: 50,
  });
  const clients = await database.client.findMany({
    where: {
      tenantId,
      id: {
        in: interactionRecords
          .map((interaction) => interaction.clientId)
          .filter((clientId): clientId is string => Boolean(clientId)),
      },
      deletedAt: null,
    },
    select: { id: true, company_name: true, first_name: true, last_name: true },
  });
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const interactions: InteractionRow[] = interactionRecords.map((interaction) => {
    const client = interaction.clientId
      ? clientsById.get(interaction.clientId)
      : undefined;
    const clientName =
      client?.company_name ||
      [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
      null;
    return {
      id: interaction.id,
      client_name: clientName,
      interaction_type: interaction.interactionType,
      subject: interaction.subject,
      description: interaction.description,
      interaction_date: interaction.interactionDate,
      follow_up_date: interaction.followUpDate,
      follow_up_completed: interaction.followUpCompleted,
    };
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">Operations / CRM</MonoLabel>
          <DisplayHeading size="md">Communications Timeline</DisplayHeading>
          <CommandBandLede>
            Maintain a single source of truth for client, venue, and command
            updates.
          </CommandBandLede>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader title="Recent Touchpoints" />
        <Card tone="canvas">
          <CardContent className="space-y-4 pt-6">
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No communications recorded yet
              </p>
            ) : (
              interactions.map((record) => {
                const status = deriveStatus(
                  record.follow_up_date,
                  record.follow_up_completed
                );
                const channel = formatChannel(record.interaction_type);
                const time = formatInteractionDate(record.interaction_date);
                const summary = record.subject ?? record.description ?? "";
                const client = record.client_name ?? "Unknown client";

                return (
                  <div
                    className="rounded-lg border border-border/60 px-4 py-3"
                    key={record.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{client}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel}
                        </p>
                      </div>
                      <Badge variant={statusVariant[status] ?? "outline"}>
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {summary}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {time}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default CrmCommunicationsPage;
