Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const table_1 = require("@repo/design-system/components/ui/table");
const clientMetrics = [
  {
    label: "Active clients",
    value: "128",
    detail: "+5 since last week",
  },
  {
    label: "Open proposals",
    value: "34",
    detail: "12 awaiting signatures",
  },
  {
    label: "Venue partners",
    value: "42",
    detail: "New tours scheduled this week",
  },
];
const topClients = [
  {
    name: "Harmonic Events",
    ltv: 248_000,
    proposals: 6,
    lastActivity: "Jan 22",
  },
  {
    name: "Grove & Co.",
    ltv: 193_500,
    proposals: 4,
    lastActivity: "Jan 21",
  },
  {
    name: "Windward Hospitality",
    ltv: 171_200,
    proposals: 3,
    lastActivity: "Jan 20",
  },
];
const recentCommunications = [
  {
    client: "Harmonic Events",
    channel: "Email",
    summary: "Shared revised proposal and menu add-ons.",
    status: "Waiting reply",
  },
  {
    client: "Field & Feast",
    channel: "Call",
    summary: "Confirmed mid-service breaks and beverage schedule.",
    status: "Resolved",
  },
  {
    client: "Harbor Ventures",
    channel: "Slack",
    summary: "Requested additional staffing for VIP lounge.",
    status: "Needs follow-up",
  },
];
const CrmPage = () => (
  <div className="space-y-6">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        CRM
      </p>
      <h1 className="text-2xl font-semibold">Client & Venue Overview</h1>
      <p className="text-sm text-muted-foreground">
        Centralize account health, pipeline, and communications in one place.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {clientMetrics.map((metric) => (
        <card_1.Card key={metric.label}>
          <card_1.CardHeader>
            <card_1.CardTitle>{metric.value}</card_1.CardTitle>
            <card_1.CardDescription>{metric.label}</card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-muted-foreground">{metric.detail}</p>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Top Clients (by LTV)</card_1.CardTitle>
          <card_1.CardDescription>
            Track who drives repeat business.
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent className="overflow-x-auto">
          <div className="rounded-md border">
            <table_1.Table>
              <table_1.TableHeader>
                <table_1.TableRow>
                  <table_1.TableHead>Client</table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    Proposals
                  </table_1.TableHead>
                  <table_1.TableHead className="text-right">
                    LTV
                  </table_1.TableHead>
                  <table_1.TableHead>Last Activity</table_1.TableHead>
                </table_1.TableRow>
              </table_1.TableHeader>
              <table_1.TableBody>
                {topClients.map((client) => (
                  <table_1.TableRow key={client.name}>
                    <table_1.TableCell>{client.name}</table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      {client.proposals}
                    </table_1.TableCell>
                    <table_1.TableCell className="text-right">
                      ${client.ltv.toLocaleString()}
                    </table_1.TableCell>
                    <table_1.TableCell>{client.lastActivity}</table_1.TableCell>
                  </table_1.TableRow>
                ))}
              </table_1.TableBody>
            </table_1.Table>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Recent Communications</card_1.CardTitle>
          <card_1.CardDescription>
            High-touch conversations this week.
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-3">
          {recentCommunications.map((note) => (
            <div
              className="rounded-lg border border-border/70 px-4 py-3"
              key={note.client}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{note.client}</p>
                <badge_1.Badge
                  variant={note.status === "Resolved" ? "secondary" : "outline"}
                >
                  {note.status}
                </badge_1.Badge>
              </div>
              <p className="text-xs text-muted-foreground">{note.channel}</p>
              <p className="text-sm text-muted-foreground">{note.summary}</p>
            </div>
          ))}
        </card_1.CardContent>
      </card_1.Card>
    </div>
  </div>
);
exports.default = CrmPage;
