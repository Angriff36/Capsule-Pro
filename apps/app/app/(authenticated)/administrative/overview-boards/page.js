Object.defineProperty(exports, "__esModule", { value: true });
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const separator_1 = require("@repo/design-system/components/ui/separator");
const boardSnapshots = [
  {
    title: "Event Response Board",
    value: "8 active escalations",
    trend: "+3 vs. last 24h",
    description: "Staffing, menus, and client approvals tracked together.",
  },
  {
    title: "Kitchen Throughput Board",
    value: "62% of tasks complete",
    trend: "On pace for service",
    description: "Prep list syncs, waste logs, and critical recipes.",
  },
  {
    title: "Scheduling Command Board",
    value: "12 shift conflicts",
    trend: "Resolving 6 this hour",
    description: "Availability vs. labor budget live data.",
  },
  {
    title: "Command Board Alerts",
    value: "3 unassigned command cards",
    trend: "Reassign to bring to zero",
    description: "Cross-module incident triage and approvals.",
  },
];
const criticalAlerts = [
  { label: "Power outage drill", detail: "Event 221 needs manual prep plan" },
  { label: "Vendor delay", detail: "Fresh Farms tomatoes arriving 2h late" },
  { label: "Staff time-off", detail: "4 senior cooks pending approval" },
];
const executiveActions = [
  {
    title: "Menu sign-off needed",
    owner: "Executive Chef",
    eta: "Today, 4:00 PM",
    status: "Awaiting approval",
  },
  {
    title: "Labour budget reforecast",
    owner: "Ops Director",
    eta: "Tomorrow, 9:00 AM",
    status: "Drafting scenarios",
  },
  {
    title: "Command board review",
    owner: "Platform team",
    eta: "Jan 28",
    status: "Live sync scheduled",
  },
];
const AdministrativeOverviewBoardsPage = () => (
  <div className="space-y-8">
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Administrative
      </p>
      <h1 className="text-2xl font-semibold">Overview Boards</h1>
      <p className="text-sm text-muted-foreground">
        Strategic snapshots that keep leadership aware of cross-module momentum.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {boardSnapshots.map((snapshot) => (
        <card_1.Card className="h-full" key={snapshot.title}>
          <card_1.CardHeader>
            <card_1.CardTitle>{snapshot.title}</card_1.CardTitle>
            <card_1.CardDescription>
              {snapshot.description}
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent className="space-y-2">
            <p className="text-2xl font-semibold">{snapshot.value}</p>
            <p className="text-sm text-muted-foreground">{snapshot.trend}</p>
          </card_1.CardContent>
        </card_1.Card>
      ))}
    </div>

    <card_1.Card>
      <card_1.CardHeader>
        <card_1.CardTitle>Executive Actions</card_1.CardTitle>
        <card_1.CardDescription>
          Top decisions awaiting a sign-off.
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent className="grid gap-4 md:grid-cols-3">
        {executiveActions.map((action) => (
          <div
            className="space-y-1 rounded border border-border/60 p-4"
            key={action.title}
          >
            <p className="text-sm font-semibold">{action.title}</p>
            <p className="text-xs text-muted-foreground">{action.owner}</p>
            <p className="text-xs text-muted-foreground">{action.eta}</p>
            <badge_1.Badge variant="secondary">{action.status}</badge_1.Badge>
          </div>
        ))}
      </card_1.CardContent>
    </card_1.Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Critical Alerts</card_1.CardTitle>
          <card_1.CardDescription>
            Issues that need cross-team attention.
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="divide-y divide-border">
            {criticalAlerts.map((alert) => (
              <div className="space-y-1 py-3" key={alert.label}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{alert.label}</p>
                  <badge_1.Badge variant="destructive">Action</badge_1.Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </div>
        </card_1.CardContent>
      </card_1.Card>
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Board Health</card_1.CardTitle>
          <card_1.CardDescription>
            Freshness of updates across channels.
          </card_1.CardDescription>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Tab updates today</span>
              <span className="font-semibold">18</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>New tasks created</span>
              <span className="font-semibold">11</span>
            </div>
            <separator_1.Separator />
            <div className="flex items-center justify-between text-sm">
              <span>Average response time</span>
              <span className="font-semibold">12m</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Teams active</span>
              <span className="font-semibold">6</span>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>
  </div>
);
exports.default = AdministrativeOverviewBoardsPage;
