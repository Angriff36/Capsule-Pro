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
  };
}

async function fetchEventsWithStaff(
  tenantId: string,
  week: { start: Date; end: Date }
) {
  return database.$queryRaw<
    Array<{
      id: string;
      title: string;
      event_date: Date;
      guest_count: number;
      venue_name: string | null;
      staff_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        e.id,
        e.title,
        e.event_date,
        e.guest_count,
        e.venue_name,
        COALESCE(
          (SELECT COUNT(*)
           FROM tenant_events.event_staff_assignments esa
           WHERE esa.event_id = e.id
             AND esa.tenant_id = e.tenant_id
             AND esa.deleted_at IS NULL
          ), 0
        ) as staff_count
      FROM tenant_events.events e
      WHERE e.tenant_id = ${tenantId}::uuid
        AND e.deleted_at IS NULL
        AND e.event_date >= ${week.start}
        AND e.event_date <= ${week.end}
      ORDER BY e.event_date ASC, e.created_at ASC
    `
  );
}

async function fetchKitchenTasks(
  tenantId: string,
  week: { start: Date; end: Date }
) {
  return database.$queryRaw<
    Array<{ total_tasks: bigint; completed_tasks: bigint }>
  >(
    Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::bigint AS completed_tasks
      FROM tenant_kitchen.kitchen_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND created_at >= ${week.start}
        AND created_at <= ${week.end}
    `
  );
}

async function fetchOpenShifts(tenantId: string) {
  return database.$queryRaw<Array<{ open_shifts: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS open_shifts
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND status = 'open'
    `
  );
}

async function fetchBudgetAlerts(tenantId: string) {
  return database.$queryRaw<Array<{ alerts: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS alerts
      FROM tenant_staff.budget_alerts
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND resolved = false
    `
  );
}

async function fetchExecutiveTasks(tenantId: string) {
  return database.adminTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: {
        in: ["review", "in_progress"],
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 3,
  });
}

async function fetchOverdueTasks(tenantId: string) {
  return database.$queryRaw<Array<{ overdue: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS overdue
      FROM tenant_admin.admin_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND status != 'done'
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    `
  );
}

async function fetchUpcomingOpenShifts(
  tenantId: string,
  now: Date,
  threeDaysFromNow: Date
) {
  return database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${now}
        AND shift_start < ${threeDaysFromNow}
    `
  );
}

async function fetchTasksUpdatedToday(tenantId: string, startOfToday: Date) {
  return database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM tenant_admin.admin_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND updated_at >= ${startOfToday}
    `
  );
}

async function fetchTasksCreatedToday(tenantId: string, startOfToday: Date) {
  return database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM tenant_admin.admin_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND created_at >= ${startOfToday}
    `
  );
}

async function fetchAvgResponseTime(tenantId: string, fourteenDaysAgo: Date) {
  return database.$queryRaw<Array<{ avg_minutes: string | null }>>(
    Prisma.sql`
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 0)::numeric AS avg_minutes
      FROM tenant_admin.admin_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND status = 'done'
        AND updated_at >= ${fourteenDaysAgo}
    `
  );
}

async function fetchActiveTeams(tenantId: string, sevenDaysAgo: Date) {
  return database.$queryRaw<Array<{ count: bigint }>>(
    Prisma.sql`
      SELECT COUNT(DISTINCT assigned_to)::bigint AS count
      FROM tenant_admin.admin_tasks
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND assigned_to IS NOT NULL
        AND updated_at >= ${sevenDaysAgo}
    `
  );
}

async function fetchEmployees(tenantId: string) {
  return database.user.findMany({
    where: {
      tenantId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });
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
        <h1 className="text-3xl font-bold tracking-tight">Overview Boards</h1>
        <p className="text-muted-foreground">
          Strategic snapshots that keep leadership aware of cross-module
          momentum.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Board Snapshots
        </h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {boardSnapshots.map((snapshot) => (
            <Card className="h-full" key={snapshot.title}>
              <CardHeader>
                <CardTitle className="text-lg">{snapshot.title}</CardTitle>
                <CardDescription>{snapshot.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">{snapshot.value}</p>
                <p className="text-sm text-muted-foreground">
                  {snapshot.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Executive Actions
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Top Decisions</CardTitle>
            <CardDescription>Awaiting sign-off from leadership</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {executiveActions.length === 0 ? (
              <div className="rounded border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground md:col-span-3">
                No executive approvals pending.
              </div>
            ) : (
              executiveActions.map((action) => (
                <div
                  className="space-y-3 rounded border border-border/60 p-4"
                  key={action.title}
                >
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.owner}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.eta}</p>
                  <Badge variant="secondary">{action.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Alerts & Board Health
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Critical Alerts</CardTitle>
              <CardDescription>
                Issues that need cross-team attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalAlerts.length === 0 ? (
                  <div className="rounded border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    No active alerts.
                  </div>
                ) : (
                  criticalAlerts.map((alert, index) => (
                    <div key={alert.label}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{alert.label}</p>
                        <Badge variant="destructive">Action</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
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
          <Card>
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
