import { listAdminTasks, listBudgetAlerts, listEvents, listEventStaffs, listKitchenTasks, listOpenShifts, listUsers } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { getEventValidationStatus, getWeekDateRange } from "../lib/validation";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const adminStatusLabels: Record<string, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

function getDateRanges(now: Date) {
  const week = getWeekDateRange(0);
  const lastWeek = getWeekDateRange(-1);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return {
    week,
    lastWeek,
    startOfToday,
    threeDaysFromNow,
    fourteenDaysAgo,
    sevenDaysAgo,
    now,
  };
}

async function fetchEventsWithStaff(
  tenantId: string,
  week: { start: Date; end: Date }
) {
  const [events, eventStaffs] = await Promise.all([
    (await listEvents()).data,
    (await listEventStaffs()).data,
  ]);
  const staffCounts = eventStaffs.reduce<Record<string, number>>((acc, staff) => {
    acc[staff.eventId] = (acc[staff.eventId] ?? 0) + 1;
    return acc;
  }, {});
  return events
    .filter((event) => {
      if (!event.eventDate) {
        return false;
      }
      const eventDate = new Date(event.eventDate);
      return eventDate >= week.start && eventDate <= week.end;
    })
    .map((event) => ({
      id: event.id,
      title: event.title,
      event_date: event.eventDate ? new Date(event.eventDate) : new Date(),
      guest_count: event.guestCount ?? 0,
      venue_name: event.venueName,
      staff_count: BigInt(staffCounts[event.id] ?? 0),
    }));
}

async function fetchKitchenTasks(
  tenantId: string,
  week: { start: Date; end: Date }
) {
  const tasks = (await listKitchenTasks()).data.filter((task) => {
    if (!task.createdAt) {
      return false;
    }
    const createdAt = new Date(task.createdAt);
    return createdAt >= week.start && createdAt <= week.end;
  });
  return [
    {
      total_tasks: BigInt(tasks.length),
      completed_tasks: BigInt(tasks.filter((task) => task.status === "completed").length),
    },
  ];
}

async function fetchOpenShifts(tenantId: string) {
  const openShifts = (await listOpenShifts()).data.filter((shift) => shift.status === "open");
  return [{ open_shifts: BigInt(openShifts.length) }];
}

async function fetchBudgetAlerts(tenantId: string) {
  const budgetAlerts = (await listBudgetAlerts()).data.filter(
    (alert) => !alert.resolved
  );
  return [{ alerts: BigInt(budgetAlerts.length) }];
}

async function fetchExecutiveTasks(tenantId: string) {
  return (await listAdminTasks()).data;
}

async function fetchOverdueTasks(tenantId: string) {
  const now = new Date();
  const overdue = (await listAdminTasks()).data.filter(
    (task) =>
      task.status !== "done" &&
      task.dueDate &&
      new Date(task.dueDate).getTime() < now.getTime()
  ).length;
  return [{ overdue: BigInt(overdue) }];
}

async function fetchUpcomingOpenShifts(
  tenantId: string,
  now: Date,
  threeDaysFromNow: Date
) {
  const upcomingCount = (await listOpenShifts()).data.filter((shift) => {
    if (shift.status !== "open" || !shift.shift_start) {
      return false;
    }
    const shiftStart = new Date(shift.shift_start);
    return shiftStart >= now && shiftStart < threeDaysFromNow;
  }).length;
  return [{ count: BigInt(upcomingCount) }];
}

async function fetchTasksUpdatedToday(tenantId: string, startOfToday: Date) {
  const count = (await listAdminTasks()).data.filter((task) => {
    if (!task.updatedAt) {
      return false;
    }
    return new Date(task.updatedAt) >= startOfToday;
  }).length;
  return [{ count: BigInt(count) }];
}

async function fetchTasksCreatedToday(tenantId: string, startOfToday: Date) {
  const count = (await listAdminTasks()).data.filter((task) => {
    if (!task.createdAt) {
      return false;
    }
    return new Date(task.createdAt) >= startOfToday;
  }).length;
  return [{ count: BigInt(count) }];
}

async function fetchAvgResponseTime(tenantId: string, fourteenDaysAgo: Date) {
  const doneTasks = (await listAdminTasks()).data.filter(
    (task) =>
      task.status === "done" &&
      task.updatedAt &&
      task.createdAt &&
      new Date(task.updatedAt) >= fourteenDaysAgo
  );
  const avgMinutes =
    doneTasks.length > 0
      ? doneTasks.reduce((sum, task) => {
          const updatedAt = new Date(task.updatedAt as Date).getTime();
          const createdAt = new Date(task.createdAt as Date).getTime();
          return sum + (updatedAt - createdAt) / (1000 * 60);
        }, 0) / doneTasks.length
      : 0;
  return [{ avg_minutes: String(avgMinutes) }];
}

async function fetchActiveTeams(tenantId: string, sevenDaysAgo: Date) {
  const assignedUsers = new Set(
    (await listAdminTasks()).data
      .filter((task) => task.assignedTo && task.updatedAt && new Date(task.updatedAt) >= sevenDaysAgo)
      .map((task) => task.assignedTo as string)
  );
  return [{ count: BigInt(assignedUsers.size) }];
}

async function fetchEmployees(tenantId: string) {
  return (await listUsers()).data;
}

async function fetchAllDashboardData(
  tenantId: string,
  dateRanges: ReturnType<typeof getDateRanges>
) {
  const {
    week,
    lastWeek,
    startOfToday,
    threeDaysFromNow,
    fourteenDaysAgo,
    sevenDaysAgo,
    now,
  } = dateRanges;

  return Promise.all([
    fetchEventsWithStaff(tenantId, week),
    fetchEventsWithStaff(tenantId, lastWeek),
    fetchKitchenTasks(tenantId, week),
    fetchKitchenTasks(tenantId, lastWeek),
    fetchOpenShifts(tenantId),
    fetchBudgetAlerts(tenantId),
    fetchExecutiveTasks(tenantId),
    fetchOverdueTasks(tenantId),
    fetchUpcomingOpenShifts(tenantId, now, threeDaysFromNow),
    fetchTasksUpdatedToday(tenantId, startOfToday),
    fetchTasksCreatedToday(tenantId, startOfToday),
    fetchAvgResponseTime(tenantId, fourteenDaysAgo),
    fetchActiveTeams(tenantId, sevenDaysAgo),
    fetchEmployees(tenantId),
  ]);
}

function calculateKitchenMetrics(
  kitchenTaskRows: Array<{ total_tasks: bigint; completed_tasks: bigint }>,
  previousKitchenTaskRows: Array<{
    total_tasks: bigint;
    completed_tasks: bigint;
  }>
) {
  const kitchenTotals = kitchenTaskRows[0] || {
    total_tasks: 0n,
    completed_tasks: 0n,
  };
  const kitchenPrevTotals = previousKitchenTaskRows[0] || {
    total_tasks: 0n,
    completed_tasks: 0n,
  };
  const kitchenTotal = Number(kitchenTotals.total_tasks ?? 0);
  const kitchenCompleted = Number(kitchenTotals.completed_tasks ?? 0);
  const kitchenCompletionPct =
    kitchenTotal > 0 ? Math.round((kitchenCompleted / kitchenTotal) * 100) : 0;
  const kitchenPrevTotal = Number(kitchenPrevTotals.total_tasks ?? 0);
  const kitchenPrevCompleted = Number(kitchenPrevTotals.completed_tasks ?? 0);
  const kitchenPrevPct =
    kitchenPrevTotal > 0
      ? Math.round((kitchenPrevCompleted / kitchenPrevTotal) * 100)
      : 0;
  const kitchenPctDiff = kitchenCompletionPct - kitchenPrevPct;

  return { kitchenCompletionPct, kitchenPctDiff };
}

function buildEmployeeMap(
  employeeRows: Array<{ id: string; firstName: string; lastName: string }>
) {
  return new Map(
    employeeRows.map((employee) => [
      employee.id,
      `${employee.firstName} ${employee.lastName}`.trim(),
    ])
  );
}

function buildExecutiveActions(
  executiveTasks: Array<{
    assignedTo: string | null;
    createdBy: string | null;
    title: string;
    dueDate: Date | null;
    status: string;
  }>,
  employeeMap: Map<string, string>
) {
  return executiveTasks.map((task) => ({
    title: task.title,
    owner:
      employeeMap.get(task.assignedTo ?? "") ||
      employeeMap.get(task.createdBy ?? "") ||
      "Unassigned",
    eta: task.dueDate ? dateFormatter.format(task.dueDate) : "No due date",
    status: adminStatusLabels[task.status] ?? task.status,
  }));
}

function buildCriticalAlerts(
  overdueTasks: number,
  budgetAlerts: number,
  upcomingShifts: number
): Array<{ label: string; detail: string }> {
  const alerts = [
    overdueTasks > 0
      ? {
          label: "Overdue admin tasks",
          detail: `${overdueTasks} task${overdueTasks === 1 ? "" : "s"} past due`,
        }
      : null,
    budgetAlerts > 0
      ? {
          label: "Budget alerts",
          detail: `${budgetAlerts} alert${budgetAlerts === 1 ? "" : "s"} unresolved`,
        }
      : null,
    upcomingShifts > 0
      ? {
          label: "Open shift coverage",
          detail: `${upcomingShifts} open shift${upcomingShifts === 1 ? "" : "s"} in next 72h`,
        }
      : null,
  ].filter(Boolean);

  return alerts as Array<{ label: string; detail: string }>;
}

function buildBoardSnapshots(
  eventIssuesLength: number,
  lastWeekIssues: number,
  kitchenCompletionPct: number,
  kitchenPctDiff: number,
  openShifts: number,
  budgetAlerts: number
) {
  return [
    {
      title: "Event Response Board",
      value: `${eventIssuesLength} event${eventIssuesLength === 1 ? "" : "s"} need review`,
      trend: `${eventIssuesLength - lastWeekIssues >= 0 ? "+" : ""}${eventIssuesLength - lastWeekIssues} vs. last week`,
      description: "Event readiness and staffing validations for the week.",
    },
    {
      title: "Kitchen Throughput Board",
      value: `${kitchenCompletionPct}% tasks complete`,
      trend: `${kitchenPctDiff >= 0 ? "+" : ""}${kitchenPctDiff} pts vs. last week`,
      description: "Prep list syncs, waste logs, and production progress.",
    },
    {
      title: "Scheduling Command Board",
      value: `${openShifts} open shift${openShifts === 1 ? "" : "s"}`,
      trend: "Live staffing gaps across locations",
      description: "Coverage gaps based on open shift marketplace.",
    },
    {
      title: "Command Board Alerts",
      value: `${budgetAlerts} active alert${budgetAlerts === 1 ? "" : "s"}`,
      trend: "Budget thresholds and escalations",
      description: "Financial alerts requiring executive attention.",
    },
  ];
}

const AdministrativeOverviewBoardsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const now = new Date();
  const dateRanges = getDateRanges(now);

  const [
    eventsWithStaff,
    lastWeekEventsWithStaff,
    kitchenTaskRows,
    previousKitchenTaskRows,
    openShiftRows,
    budgetAlertRows,
    executiveTasks,
    overdueTasksRows,
    upcomingOpenShifts,
    tasksUpdatedTodayRows,
    tasksCreatedTodayRows,
    avgResponseRows,
    activeTeamsRows,
    employeeRows,
  ] = await fetchAllDashboardData(tenantId, { ...dateRanges, now });

  const events = eventsWithStaff.map((event) => ({
    ...event,
    validationStatus: getEventValidationStatus({
      venueName: event.venue_name,
      staffCount: Number(event.staff_count),
      guestCount: event.guest_count,
      eventDate: event.event_date,
      startTime: null,
      endTime: null,
    }),
  }));

  const eventIssues = events.filter(
    (event) => event.validationStatus !== "ready"
  );
  const lastWeekIssues = lastWeekEventsWithStaff.filter((event) => {
    const status = getEventValidationStatus({
      venueName: event.venue_name,
      staffCount: Number(event.staff_count),
      guestCount: event.guest_count,
      eventDate: event.event_date,
      startTime: null,
      endTime: null,
    });
    return status !== "ready";
  }).length;

  const { kitchenCompletionPct, kitchenPctDiff } = calculateKitchenMetrics(
    kitchenTaskRows,
    previousKitchenTaskRows
  );

  const openShifts = Number(openShiftRows[0]?.open_shifts ?? 0);
  const budgetAlerts = Number(budgetAlertRows[0]?.alerts ?? 0);

  const employeeMap = buildEmployeeMap(employeeRows);
  const executiveActions = buildExecutiveActions(executiveTasks, employeeMap);

  const overdueTasks = Number(overdueTasksRows[0]?.overdue ?? 0);
  const upcomingShifts = Number(upcomingOpenShifts[0]?.count ?? 0);
  const tasksUpdatedToday = Number(tasksUpdatedTodayRows[0]?.count ?? 0);
  const tasksCreatedToday = Number(tasksCreatedTodayRows[0]?.count ?? 0);
  const avgResponseMinutes = Number(avgResponseRows[0]?.avg_minutes ?? 0);
  const activeTeams = Number(activeTeamsRows[0]?.count ?? 0);

  const criticalAlerts = buildCriticalAlerts(
    overdueTasks,
    budgetAlerts,
    upcomingShifts
  );
  const boardSnapshots = buildBoardSnapshots(
    eventIssues.length,
    lastWeekIssues,
    kitchenCompletionPct,
    kitchenPctDiff,
    openShifts,
    budgetAlerts
  );

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="font-semibold text-2xl tracking-tight">
          Overview Boards
        </h1>
        <p className="text-muted-foreground">
          Strategic snapshots that keep leadership aware of cross-module
          momentum.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Board Snapshots
        </h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {boardSnapshots.map((snapshot) => (
            <Card className="h-full" key={snapshot.title} tone="soft-stone">
              <CardHeader>
                <CardTitle className="text-lg">{snapshot.title}</CardTitle>
                <CardDescription>{snapshot.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-bold text-2xl">{snapshot.value}</p>
                <p className="text-muted-foreground text-sm">
                  {snapshot.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Executive Actions
        </h2>
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Top Decisions</CardTitle>
            <CardDescription>Awaiting sign-off from leadership</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {executiveActions.length === 0 ? (
              <div className="rounded border border-border/60 border-dashed p-6 text-center text-muted-foreground text-sm md:col-span-3">
                No executive approvals pending.
              </div>
            ) : (
              executiveActions.map((action) => (
                <div
                  className="space-y-3 rounded border border-border/60 p-4"
                  key={action.title}
                >
                  <p className="font-medium text-sm">{action.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {action.owner}
                  </p>
                  <p className="text-muted-foreground text-xs">{action.eta}</p>
                  <Badge variant="secondary">{action.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Alerts & Board Health
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>
                Issues that need cross-team attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalAlerts.length === 0 ? (
                  <div className="rounded border border-border/60 border-dashed p-4 text-muted-foreground text-sm">
                    No active alerts.
                  </div>
                ) : (
                  criticalAlerts.map((alert, index) => (
                    <div key={alert.label}>
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{alert.label}</p>
                        <Badge variant="destructive">Action</Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {alert.detail}
                      </p>
                      {index < criticalAlerts.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Board Health</CardTitle>
              <CardDescription>
                Freshness of updates across channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tab updates today
                  </span>
                  <span className="font-medium">{tasksUpdatedToday}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    New tasks created
                  </span>
                  <span className="font-medium">{tasksCreatedToday}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Average response time
                  </span>
                  <span className="font-medium">
                    {avgResponseMinutes > 0
                      ? `${Math.round(avgResponseMinutes)}m`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Teams active</span>
                  <span className="font-medium">{activeTeams}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default AdministrativeOverviewBoardsPage;
