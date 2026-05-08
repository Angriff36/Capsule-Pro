import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  FilterRail,
  FilterRailGroup,
  FilterRailLabel,
  MetricBand,
  MetricCell,
  MetricDelta,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  OperationalRow,
  PageBody,
  PageCanvas,
  SectionHeader,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  BellIcon,
  CalendarCheckIcon,
  ClockIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { formatDelta } from "./format-delta";
import SchedulingRealtime from "./scheduling-realtime";

interface ScheduleSummaryRow {
  shift_date: Date;
  shift_count: number;
  staff_count: number;
  open_count: number;
}

interface HappeningShiftRow {
  shift_start: Date;
  shift_end: Date;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}

interface LeaderboardRow {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const startOfWeekMonday = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const formatDayLabel = (value: Date) =>
  value.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });

const formatTime = (value: Date) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatRangeLabel = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth();
  const left = start.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  const right = sameMonth
    ? end.toLocaleDateString("en-US", { day: "numeric" })
    : end.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  return `${left} – ${right}, ${end.getFullYear()}`;
};

const formatName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ") || "Unassigned";

export const revalidate = 60;

const SchedulingPage = async () => {
  const { orgId, userId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = addDays(weekStart, 7);
  const previousWeekStart = addDays(weekStart, -7);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = addDays(startOfToday, 1);

  const [
    [currentStaff],
    [previousStaff],
    [currentHours],
    [previousHours],
    [openShifts],
    [previousOpenShifts],
    [currentCost],
    [previousCost],
    shiftSummary,
    [shiftTotals],
    happeningToday,
    leaderboard,
  ] = await Promise.all([
    database.$queryRaw<{ count: number }[]>(
      Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
    `
    ),
    database.$queryRaw<{ count: number }[]>(
      Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
        AND created_at < ${weekStart}
    `
    ),
    database.$queryRaw<{ hours: number }[]>(
      Prisma.sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `
    ),
    database.$queryRaw<{ hours: number }[]>(
      Prisma.sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `
    ),
    database.$queryRaw<{ count: number }[]>(
      Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `
    ),
    database.$queryRaw<{ count: number }[]>(
      Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `
    ),
    database.$queryRaw<{ cost: number }[]>(
      Prisma.sql`
      SELECT COALESCE(
        SUM(
          EXTRACT(EPOCH FROM (s.shift_end - s.shift_start)) / 3600 *
          CASE
            WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate
            WHEN e.salary_annual IS NOT NULL THEN e.salary_annual / 2080
            ELSE 0
          END
        ),
        0
      ) AS cost
      FROM tenant_staff.schedule_shifts s
      JOIN tenant_staff.employees e
        ON e.tenant_id = s.tenant_id
       AND e.id = s.employee_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND s.shift_start >= ${weekStart}
        AND s.shift_start < ${weekEnd}
    `
    ),
    database.$queryRaw<{ cost: number }[]>(
      Prisma.sql`
      SELECT COALESCE(
        SUM(
          EXTRACT(EPOCH FROM (s.shift_end - s.shift_start)) / 3600 *
          CASE
            WHEN e.hourly_rate IS NOT NULL THEN e.hourly_rate
            WHEN e.salary_annual IS NOT NULL THEN e.salary_annual / 2080
            ELSE 0
          END
        ),
        0
      ) AS cost
      FROM tenant_staff.schedule_shifts s
      JOIN tenant_staff.employees e
        ON e.tenant_id = s.tenant_id
       AND e.id = s.employee_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND s.shift_start >= ${previousWeekStart}
        AND s.shift_start < ${weekStart}
    `
    ),
    database.$queryRaw<ScheduleSummaryRow[]>(
      Prisma.sql`
      WITH scheduled AS (
        SELECT
          date_trunc('day', shift_start) AS shift_date,
          COUNT(*)::int AS shift_count,
          COUNT(DISTINCT employee_id)::int AS staff_count
        FROM tenant_staff.schedule_shifts
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND shift_start >= ${weekStart}
          AND shift_start < ${weekEnd}
        GROUP BY shift_date
      ),
      open AS (
        SELECT
          date_trunc('day', shift_start) AS shift_date,
          COUNT(*)::int AS open_count
        FROM tenant_staff.open_shifts
        WHERE tenant_id = ${tenantId}
          AND deleted_at IS NULL
          AND status = 'open'
          AND shift_start >= ${weekStart}
          AND shift_start < ${weekEnd}
        GROUP BY shift_date
      )
      SELECT
        COALESCE(s.shift_date, o.shift_date) AS shift_date,
        COALESCE(s.shift_count, 0) + COALESCE(o.open_count, 0) AS shift_count,
        COALESCE(s.staff_count, 0) AS staff_count,
        COALESCE(o.open_count, 0) AS open_count
      FROM scheduled s
      FULL OUTER JOIN open o ON o.shift_date = s.shift_date
    `
    ),
    database.$queryRaw<
      {
        shift_count: number;
        staff_count: number;
      }[]
    >(
      Prisma.sql`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND shift_start >= ${weekStart}
            AND shift_start < ${weekEnd}
        ) +
        (
          SELECT COUNT(*)::int
          FROM tenant_staff.open_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND status = 'open'
            AND shift_start >= ${weekStart}
            AND shift_start < ${weekEnd}
        ) AS shift_count,
        (
          SELECT COUNT(DISTINCT employee_id)::int
          FROM tenant_staff.schedule_shifts
          WHERE tenant_id = ${tenantId}
            AND deleted_at IS NULL
            AND shift_start >= ${weekStart}
            AND shift_start < ${weekEnd}
        ) AS staff_count
    `
    ),
    database.$queryRaw<HappeningShiftRow[]>(
      Prisma.sql`
      SELECT
        s.shift_start,
        s.shift_end,
        e.first_name,
        e.last_name,
        e.role
      FROM tenant_staff.schedule_shifts s
      JOIN tenant_staff.employees e
        ON e.tenant_id = s.tenant_id
       AND e.id = s.employee_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND s.shift_start >= ${startOfToday}
        AND s.shift_start < ${endOfToday}
      UNION ALL
      SELECT
        o.shift_start,
        o.shift_end,
        NULL::text AS first_name,
        NULL::text AS last_name,
        o.role_during_shift AS role
      FROM tenant_staff.open_shifts o
      WHERE o.tenant_id = ${tenantId}
        AND o.deleted_at IS NULL
        AND o.status = 'open'
        AND o.shift_start >= ${startOfToday}
        AND o.shift_start < ${endOfToday}
      ORDER BY shift_start
      LIMIT 6
    `
    ),
    database.$queryRaw<LeaderboardRow[]>(
      Prisma.sql`
      SELECT
        s.employee_id,
        e.first_name,
        e.last_name,
        e.role,
        COUNT(*)::int AS shift_count
      FROM tenant_staff.schedule_shifts s
      JOIN tenant_staff.employees e
        ON e.tenant_id = s.tenant_id
       AND e.id = s.employee_id
      WHERE s.tenant_id = ${tenantId}
        AND s.deleted_at IS NULL
        AND s.shift_start >= ${weekStart}
        AND s.shift_start < ${weekEnd}
      GROUP BY s.employee_id, e.first_name, e.last_name, e.role
      ORDER BY shift_count DESC, e.last_name ASC
      LIMIT 3
    `
    ),
  ]);

  const scheduleMap = new Map(
    shiftSummary.map((row) => [row.shift_date.toDateString(), row])
  );

  const scheduleDays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(weekStart, index);
    const summary = scheduleMap.get(date.toDateString()) ?? {
      shift_count: 0,
      staff_count: 0,
      open_count: 0,
    };
    return {
      label: formatDayLabel(date),
      isToday: date.toDateString() === now.toDateString(),
      staffCount: summary.staff_count,
      shiftCount: summary.shift_count,
      openCount: summary.open_count,
    };
  });

  const stats = [
    {
      label: "Active staff",
      value: String(currentStaff?.count ?? 0),
      delta: formatDelta(currentStaff?.count ?? 0, previousStaff?.count ?? 0),
      note: "On the roster",
      icon: UsersIcon,
    },
    {
      label: "Hours scheduled",
      value: `${Math.round(currentHours?.hours ?? 0)}h`,
      delta: formatDelta(currentHours?.hours ?? 0, previousHours?.hours ?? 0),
      note: `${shiftTotals?.shift_count ?? 0} shifts placed`,
      icon: ClockIcon,
    },
    {
      label: "Open shifts",
      value: String(openShifts?.count ?? 0),
      delta: formatDelta(
        openShifts?.count ?? 0,
        previousOpenShifts?.count ?? 0
      ),
      note: "Awaiting claim",
      icon: CalendarCheckIcon,
    },
    {
      label: "Projected labor",
      value: currencyFormatter.format(currentCost?.cost ?? 0),
      delta: formatDelta(currentCost?.cost ?? 0, previousCost?.cost ?? 0),
      note: "This week",
      icon: WalletIcon,
    },
  ];

  const rangeLabel = formatRangeLabel(weekStart, addDays(weekStart, 6));

  return (
    <PageCanvas>
      <SchedulingRealtime tenantId={tenantId} userId={userId} />

      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Scheduling / Overview</MonoLabel>
            <DisplayHeading>This week at a glance</DisplayHeading>
            <CommandBandLede>
              Coverage, open shifts, and labor cost across the rolling week.
              Built from active rosters and live open-shift bids.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <div className="relative w-full max-w-[280px] sm:w-[280px]">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/60" />
              <Input
                className="border-white/25 bg-transparent pr-12 pl-9 text-white placeholder:text-white/50 focus-visible:border-white/60 focus-visible:ring-white/20"
                placeholder="Search shifts, people, roles…"
              />
              <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border border-white/25 px-2 py-1 font-mono text-[10px] text-white/70 uppercase tracking-[0.18em]">
                ⌘K
              </span>
            </div>
            <Button
              aria-label="Notifications"
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="icon"
              variant="outline"
            >
              <BellIcon className="size-4" />
            </Button>
            <Button size="default" variant="on-dark">
              <PlusIcon className="size-4" />
              Add shift
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3.5 py-1 font-mono text-[11px] text-deep-green uppercase tracking-[0.18em]">
              {rangeLabel}
            </span>
            <span className="rounded-full border border-white/25 px-3.5 py-1 font-mono text-[11px] text-white/80 uppercase tracking-[0.18em]">
              Week
            </span>
            <span className="rounded-full border border-white/25 px-3.5 py-1 font-mono text-[11px] text-white/60 uppercase tracking-[0.18em]">
              Month
            </span>
          </div>

          <MetricBand>
            {stats.map((item) => (
              <MetricCell key={item.label}>
                <div className="flex items-start justify-between gap-3">
                  <MetricLabel>{item.label}</MetricLabel>
                  <item.icon
                    aria-hidden="true"
                    className="size-4 text-white/60"
                  />
                </div>
                <MetricValue>{item.value}</MetricValue>
                <MetricDelta>
                  <span className="font-medium">{item.delta}</span>
                  <span className="ml-2 text-white/50">{item.note}</span>
                </MetricDelta>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <PageBody variant="rail">
        <FilterRail>
          <FilterRailLabel>Scheduling</FilterRailLabel>
          <h3 className="font-normal text-2xl leading-tight tracking-[-0.01em] text-ink">
            Workspaces
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Jump to the focused tools. This overview stays on coverage and
            labor.
          </p>
          <FilterRailGroup className="mt-4 flex flex-col gap-2">
            <Link
              className="rounded-full border border-hairline bg-canvas px-4 py-2 font-medium text-sm text-ink transition-colors hover:border-ink/25"
              href="/scheduling/shifts"
            >
              Shifts board
            </Link>
            <Link
              className="rounded-full border border-hairline bg-canvas px-4 py-2 font-medium text-sm text-ink transition-colors hover:border-ink/25"
              href="/scheduling/availability"
            >
              Availability
            </Link>
            <Link
              className="rounded-full border border-hairline bg-canvas px-4 py-2 font-medium text-sm text-ink transition-colors hover:border-ink/25"
              href="/scheduling/time-off"
            >
              Time off
            </Link>
            <Link
              className="rounded-full border border-hairline bg-canvas px-4 py-2 font-medium text-sm text-ink transition-colors hover:border-ink/25"
              href="/scheduling/requests"
            >
              Requests
            </Link>
            <Link
              className="rounded-full border border-hairline bg-canvas px-4 py-2 font-medium text-sm text-ink transition-colors hover:border-ink/25"
              href="/scheduling/budgets"
            >
              Budgets
            </Link>
          </FilterRailGroup>
        </FilterRail>

        <OperationalColumn className="min-w-0">
          <section className="space-y-6">
            <SectionHeader
              actions={
                <Button size="sm" variant="default">
                  <PlusIcon className="size-4" />
                  Add shift
                </Button>
              }
              count={`${shiftTotals?.shift_count ?? 0} shifts · ${shiftTotals?.staff_count ?? 0} people`}
              description="Coverage by day, including open shifts that have not been claimed."
              eyebrow="Cadence"
              title="Schedule cadence"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
              {scheduleDays.map((day) => {
                const empty =
                  day.staffCount === 0 &&
                  day.shiftCount === 0 &&
                  day.openCount === 0;
                return (
                  <article
                    className={
                      day.isToday
                        ? "rounded-[16px] border border-ink bg-canvas p-4"
                        : "rounded-[16px] border border-hairline bg-canvas p-4"
                    }
                    key={day.label}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {day.label}
                      </div>
                      {day.isToday ? <StatusPill>Today</StatusPill> : null}
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-ink">
                      {empty ? (
                        <span className="text-muted-foreground text-xs">
                          No shifts
                        </span>
                      ) : (
                        <>
                          {day.staffCount > 0 ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-muted-foreground text-xs">
                                Staff
                              </span>
                              <span className="font-medium tabular-nums">
                                {day.staffCount}
                              </span>
                            </div>
                          ) : null}
                          {day.shiftCount > 0 ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-muted-foreground text-xs">
                                Shifts
                              </span>
                              <span className="font-medium tabular-nums">
                                {day.shiftCount}
                              </span>
                            </div>
                          ) : null}
                          {day.openCount > 0 ? (
                            <div className="flex items-baseline justify-between">
                              <span className="text-muted-foreground text-xs">
                                Open
                              </span>
                              <Badge variant="warning">{day.openCount}</Badge>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader
              count={`${happeningToday.length} on deck`}
              description="Live view of shift starts and currently uncovered slots."
              eyebrow="Live"
              title="Happening today"
            />

            {happeningToday.length === 0 ? (
              <OperationalRow density="compact">
                <p className="text-sm text-muted-foreground">
                  No shifts scheduled for today. Use{" "}
                  <span className="text-ink">Add shift</span> to fill the day.
                </p>
              </OperationalRow>
            ) : (
              <div className="space-y-3">
                {happeningToday.map((item) => {
                  const assigned = Boolean(item.first_name || item.last_name);
                  return (
                    <OperationalRow
                      density="compact"
                      interactive
                      key={`${item.shift_start.toISOString()}-${item.first_name ?? "open"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                              Start
                            </span>
                            <span className="font-medium text-ink text-lg tabular-nums">
                              {formatTime(item.shift_start)}
                            </span>
                          </div>
                          <div className="h-10 w-px bg-hairline" />
                          <div className="space-y-1">
                            <div className="font-medium text-ink">
                              {item.role ?? "Scheduled shift"}
                            </div>
                            <div className="flex items-center gap-2">
                              {assigned ? (
                                <StatusPill>
                                  {formatName(item.first_name, item.last_name)}
                                </StatusPill>
                              ) : (
                                <Badge variant="warning">Unclaimed</Badge>
                              )}
                              <span className="text-muted-foreground text-xs tabular-nums">
                                ends {formatTime(item.shift_end)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </div>
                    </OperationalRow>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <SectionHeader
              actions={
                <Button size="sm" variant="outline">
                  View leaderboard
                </Button>
              }
              count="Top 3"
              description="First-come shift claiming, ranked by completed shifts this week."
              eyebrow="Battle arena"
              title={
                <span className="inline-flex items-center gap-2">
                  <SparklesIcon
                    aria-hidden
                    className="size-5 text-muted-foreground"
                  />
                  Shift battle arena
                </span>
              }
            />

            {leaderboard.length === 0 ? (
              <OperationalRow density="compact">
                <p className="text-sm text-muted-foreground">
                  No shift activity yet this week. The board fills as people
                  claim open shifts.
                </p>
              </OperationalRow>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {leaderboard.map((person, index) => {
                  const fullName = formatName(
                    person.first_name,
                    person.last_name
                  );
                  return (
                    <OperationalRow
                      density="comfortable"
                      key={person.employee_id}
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-2xl tabular-nums text-muted-foreground">
                          #{index + 1}
                        </span>
                        <Avatar className="size-12">
                          <AvatarImage alt={fullName} src="" />
                          <AvatarFallback>
                            {fullName.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-ink">
                            {fullName}
                          </div>
                          <div className="text-muted-foreground text-xs tabular-nums">
                            {person.shift_count} shifts this week
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {person.role ? (
                          <Badge variant="default">{person.role}</Badge>
                        ) : null}
                        {index === 0 ? (
                          <Badge variant="success">Lead</Badge>
                        ) : (
                          <Badge variant="outline">Top performer</Badge>
                        )}
                      </div>
                    </OperationalRow>
                  );
                })}
              </div>
            )}
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
};

export default SchedulingPage;
