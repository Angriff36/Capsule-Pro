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
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    {/* Page Header */}
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Overview Boards</h1>
      <p className="text-muted-foreground">
        Strategic snapshots that keep leadership aware of cross-module momentum.
      </p>
    </div>

    <Separator />

    {/* Board Snapshots Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Board Snapshots
      </h2>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {boardSnapshots.map((snapshot) => (
          <Card className="h-full" key={snapshot.title}>
            <CardHeader>
              <CardDescription>{snapshot.description}</CardDescription>
              <CardTitle>{snapshot.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-bold">{snapshot.value}</p>
              <p className="text-sm text-muted-foreground">{snapshot.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    {/* Executive Actions Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Executive Actions
      </h2>
      <Card>
        <CardHeader>
          <CardDescription>Top decisions awaiting a sign-off.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {executiveActions.map((action) => (
            <div
              className="space-y-3 rounded border border-border/60 p-4"
              key={action.title}
            >
              <p className="text-sm font-medium">{action.title}</p>
              <p className="text-xs text-muted-foreground">{action.owner}</p>
              <p className="text-xs text-muted-foreground">{action.eta}</p>
              <Badge variant="secondary">{action.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>

    {/* Alerts & Board Health Section */}
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        Alerts & Board Health
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Issues that need cross-team attention.</CardDescription>
            <CardTitle>Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalAlerts.map((alert, index) => (
                <div key={alert.label}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{alert.label}</p>
                    <Badge variant="destructive">Action</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.detail}</p>
                  {index < criticalAlerts.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Freshness of updates across channels.</CardDescription>
            <CardTitle>Board Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tab updates today</span>
                <span className="font-medium">18</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New tasks created</span>
                <span className="font-medium">11</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Average response time</span>
                <span className="font-medium">12m</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Teams active</span>
                <span className="font-medium">6</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
);

export default AdministrativeOverviewBoardsPage;
