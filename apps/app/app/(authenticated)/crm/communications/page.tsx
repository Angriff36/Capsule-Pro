import { Badge } from "@repo/design-system/components/ui/badge";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

const communications = [
  {
    client: "Harmonic Events",
    channel: "Email",
    summary: "Shared updated proposal with tiered beverage pairings.",
    time: "Today · 09:12",
    status: "Awaiting reply",
  },
  {
    client: "Field & Feast",
    channel: "Phone",
    summary: "Confirmed mobile kitchen drop-off timing.",
    time: "Today · 08:40",
    status: "Closed",
  },
  {
    client: "Windward Hospitality",
    channel: "Slack",
    summary: "Request for additional staffing in VIP suite.",
    time: "Yesterday · 15:21",
    status: "Needs follow-up",
  },
  {
    client: "Harbor Ventures",
    channel: "In-app note",
    summary: "Venue tour blocked until layout diagram approved.",
    time: "Yesterday · 11:00",
    status: "Waiting approval",
  },
];

const statusVariant: Record<string, "destructive" | "secondary" | "outline"> = {
  "Awaiting reply": "destructive",
  "Needs follow-up": "destructive",
  "Waiting approval": "secondary",
  Closed: "outline",
};

const CrmCommunicationsPage = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">
        Communications Timeline
      </h1>
      <p className="text-muted-foreground">
        Maintain a single source of truth for client, venue, and command
        updates.
      </p>
    </div>

    <Separator />

    {/* Recent Touchpoints Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Recent Touchpoints
      </h2>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {communications.map((record) => (
            <div
              className="rounded-lg border border-border/60 px-4 py-3"
              key={`${record.client}-${record.time}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{record.client}</p>
                  <p className="text-xs text-muted-foreground">
                    {record.channel}
                  </p>
                </div>
                <Badge variant={statusVariant[record.status] ?? "outline"}>
                  {record.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {record.summary}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {record.time}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  </div>
);

export default CrmCommunicationsPage;
