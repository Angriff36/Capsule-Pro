import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  OperationalLine,
  PageCanvas,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
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
           FROM tenant_events.event_staff esa
           WHERE esa."eventId" = e.id::text
             AND esa."tenantId" = e.tenant_id::text
             AND esa."deletedAt" IS NULL
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
  const eventDiff = eventIssuesLength - lastWeekIssues;

  return [
    {
      label: "Event Response",
      value: eventIssuesLength,
      delta: `${eventDiff >= 0 ? "+" : ""}${eventDiff} vs. last week · readiness & staffing`,
    },
    {
      label: "Kitchen Throughput",
      value: `${kitchenCompletionPct}%`,
      delta: `${kitchenPctDiff >= 0 ? "+" : ""}${kitchenPctDiff} pts vs. last week · prep & production`,
    },
    {
      label: "Scheduling",
      value: openShifts,
      delta: "Open shifts · live coverage gaps",
    },
    {
      label: "Command Alerts",
      value: budgetAlerts,
      delta: "Active alerts · budget & escalation",
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Administrative / Overview</MonoLabel>
            <DisplayHeading size="md">Overview boards</DisplayHeading>
            <CommandBandLede>
              Strategic snapshots that keep leadership aware of cross-module
              momentum.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/administrative/kanban">Open Kanban</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/administrative">Production prep</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            {boardSnapshots.map((snapshot) => (
              <MetricCell key={snapshot.label}>
                <MetricLabel>{snapshot.label}</MetricLabel>
                <MetricValue>{snapshot.value}</MetricValue>
                <MetricDelta>{snapshot.delta}</MetricDelta>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            description="Awaiting sign-off from leadership"
            title="Executive actions"
          />
          <div className="rounded-[22px] border border-hairline bg-canvas p-6 sm:p-8">
            {executiveActions.length === 0 ? (
              <Empty className="border-none py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardCheck />
                  </EmptyMedia>
                  <EmptyTitle>No executive approvals pending</EmptyTitle>
                  <EmptyDescription>
                    Review and in-progress admin tasks will surface here when
                    they need leadership sign-off.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {executiveActions.map((action) => (
                  <div
                    className="space-y-3 rounded-[16px] border border-hairline bg-soft-stone/40 p-5"
                    key={action.title}
                  >
                    <p className="font-medium text-ink text-sm leading-snug">
                      {action.title}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                      {action.owner}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-xs">{action.eta}</p>
                      <StatusPill>{action.status}</StatusPill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeader
            description="Cross-team issues and channel freshness"
            title="Alerts & board health"
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[22px] border border-hairline bg-canvas p-6 sm:p-8">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                Critical alerts
              </p>
              <div className="mt-6">
                {criticalAlerts.length === 0 ? (
                  <Empty className="border-none py-6">
                    <EmptyHeader>
                      <EmptyTitle>No active alerts</EmptyTitle>
                      <EmptyDescription>
                        Overdue tasks, budget thresholds, and shift coverage
                        gaps will appear here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  criticalAlerts.map((alert) => (
                    <OperationalLine key={alert.label}>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium text-ink text-sm">
                          {alert.label}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {alert.detail}
                        </p>
                      </div>
                      <Badge variant="destructive">Action</Badge>
                    </OperationalLine>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[22px] border border-hairline bg-canvas p-6 sm:p-8">
              <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
                Board health
              </p>
              <div className="mt-6">
                <OperationalLine className="w-full justify-between">
                  <span className="text-muted-foreground text-sm">
                    Tab updates today
                  </span>
                  <span className="font-display text-2xl text-ink">
                    {tasksUpdatedToday}
                  </span>
                </OperationalLine>
                <OperationalLine className="w-full justify-between">
                  <span className="text-muted-foreground text-sm">
                    New tasks created
                  </span>
                  <span className="font-display text-2xl text-ink">
                    {tasksCreatedToday}
                  </span>
                </OperationalLine>
                <OperationalLine className="w-full justify-between">
                  <span className="text-muted-foreground text-sm">
                    Average response time
                  </span>
                  <span className="font-display text-2xl text-ink">
                    {avgResponseMinutes > 0
                      ? `${Math.round(avgResponseMinutes)}m`
                      : "N/A"}
                  </span>
                </OperationalLine>
                <OperationalLine className="w-full justify-between">
                  <span className="text-muted-foreground text-sm">
                    Teams active
                  </span>
                  <span className="font-display text-2xl text-ink">
                    {activeTeams}
                  </span>
                </OperationalLine>
              </div>
            </div>
          </div>
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default AdministrativeOverviewBoardsPage;
