import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";

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
        <Card key={snapshot.title} className="h-full">
          <CardHeader>
            <CardTitle>{snapshot.title}</CardTitle>
            <CardDescription>{snapshot.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold">{snapshot.value}</p>
            <p className="text-sm text-muted-foreground">{snapshot.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Executive Actions</CardTitle>
        <CardDescription>Top decisions awaiting a sign-off.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        {executiveActions.map((action) => (
          <div key={action.title} className="space-y-1 rounded border border-border/60 p-4">
            <p className="text-sm font-semibold">{action.title}</p>
            <p className="text-xs text-muted-foreground">{action.owner}</p>
            <p className="text-xs text-muted-foreground">{action.eta}</p>
            <Badge variant="secondary">{action.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>

    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Critical Alerts</CardTitle>
          <CardDescription>Issues that need cross-team attention.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {criticalAlerts.map((alert) => (
              <div key={alert.label} className="space-y-1 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{alert.label}</p>
                  <Badge variant="destructive">Action</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Board Health</CardTitle>
          <CardDescription>Freshness of updates across channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Tab updates today</span>
              <span className="font-semibold">18</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>New tasks created</span>
              <span className="font-semibold">11</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span>Average response time</span>
              <span className="font-semibold">12m</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Teams active</span>
              <span className="font-semibold">6</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default AdministrativeOverviewBoardsPage;
