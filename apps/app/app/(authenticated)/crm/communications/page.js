Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
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
const statusVariant = {
  "Awaiting reply": "destructive",
  "Needs follow-up": "destructive",
  "Waiting approval": "secondary",
  Closed: "outline",
};
const CrmCommunicationsPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        CRM
      </p>
      <h1 className="text-2xl font-semibold">Communications Timeline</h1>
      <p className="text-sm text-muted-foreground">
        Maintain a single source of truth for client, venue, and command
        updates.
      </p>
    </div>

    <card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Recent Touchpoints</card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
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
              <badge_1.Badge
                variant={statusVariant[record.status] ?? "outline"}
              >
                {record.status}
              </badge_1.Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {record.summary}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {record.time}
            </p>
          </div>
        ))}
      </card_1.CardContent>
    </card_1.Card>
  </div>
);
exports.default = CrmCommunicationsPage;
