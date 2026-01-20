import { auth } from "@repo/auth/server";
import { Prisma, database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { notFound } from "next/navigation";
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
import { getTenantIdForOrg } from "../../lib/tenant";
import SchedulingRealtime from "./scheduling-realtime";

type ScheduleSummaryRow = {
  shift_date: Date;
  shift_count: number;
  staff_count: number;
  open_count: number;
};

type HappeningShiftRow = {
  shift_start: Date;
  shift_end: Date;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

type LeaderboardRow = {
  employee_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  shift_count: number;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const formatDelta = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const delta = (current - previous) / previous;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${percentFormatter.format(delta)}`;
};

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

const formatName = (first?: string | null, last?: string | null) =>
  [first, last].filter(Boolean).join(" ") || "Unassigned";

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

  const [currentStaff] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
    `,
  );

  const [previousStaff] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
        AND created_at < ${weekStart}
    `,
  );

  const [currentHours] = await database.$queryRaw<{ hours: number }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `,
  );

  const [previousHours] = await database.$queryRaw<{ hours: number }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `,
  );

  const [openShifts] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `,
  );

  const [previousOpenShifts] = await database.$queryRaw<{ count: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `,
  );

  const [currentCost] = await database.$queryRaw<{ cost: number }[]>(
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
    `,
  );

  const [previousCost] = await database.$queryRaw<{ cost: number }[]>(
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
    `,
  );

  const shiftSummary = await database.$queryRaw<ScheduleSummaryRow[]>(
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
    `,
  );

  const [shiftTotals] = await database.$queryRaw<{
    shift_count: number;
    staff_count: number;
  }[]>(
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
    `,
  );

  const happeningToday = await database.$queryRaw<HappeningShiftRow[]>(
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
    `,
  );

  const leaderboard = await database.$queryRaw<LeaderboardRow[]>(
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
    `,
  );

  const scheduleMap = new Map(
    shiftSummary.map((row) => [
      row.shift_date.toDateString(),
      row,
    ])
  );

  const scheduleDays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(weekStart, index);
    const summary =
      scheduleMap.get(date.toDateString()) ?? {
        shift_count: 0,
        staff_count: 0,
        open_count: 0,
      };
    const badges = [];
    if (summary.staff_count > 0) {
      badges.push(`${summary.staff_count} Staff`);
    }
    if (summary.shift_count > 0) {
      badges.push(`${summary.shift_count} Shifts`);
    }
    if (summary.open_count > 0) {
      badges.push(`${summary.open_count} Open`);
    }
    return {
      label: formatDayLabel(date),
      badges,
    };
  });

  const stats = [
    {
      label: "Total Staff",
      value: currentStaff?.count ?? 0,
      delta: formatDelta(currentStaff?.count ?? 0, previousStaff?.count ?? 0),
      note: "Active employees",
      icon: UsersIcon,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Hours Scheduled",
      value: `${Math.round(currentHours?.hours ?? 0)}h`,
      delta: formatDelta(currentHours?.hours ?? 0, previousHours?.hours ?? 0),
      note: `${shiftTotals?.shift_count ?? 0} shifts scheduled`,
      icon: ClockIcon,
      tone: "bg-secondary/20 text-secondary-foreground",
    },
    {
      label: "Open Shifts",
      value: openShifts?.count ?? 0,
      delta: formatDelta(openShifts?.count ?? 0, previousOpenShifts?.count ?? 0),
      note: "Unassigned shifts",
      icon: CalendarCheckIcon,
      tone: "bg-accent/15 text-accent-foreground",
    },
    {
      label: "Projected Cost",
      value: currencyFormatter.format(currentCost?.cost ?? 0),
      delta: formatDelta(currentCost?.cost ?? 0, previousCost?.cost ?? 0),
      note: "Scheduled labor cost",
      icon: WalletIcon,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SchedulingRealtime tenantId={tenantId} userId={userId} />
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-semibold text-2xl text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back. You have scheduling activity for this week.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative min-w-[260px]">
          <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input className="pr-12 pl-9" placeholder="Search anything..." />
          <span className="-translate-y-1/2 absolute top-1/2 right-3 rounded-md border bg-background px-2 py-1 text-muted-foreground text-xs">
            ⌘K
          </span>
        </div>
        <Button size="icon" variant="outline">
          <BellIcon className="size-4" />
        </Button>
      </div>
    </div>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
              <p className="text-muted-foreground text-xs">{item.note}</p>
            </div>
            <div className={`flex size-10 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="size-5" />
            </div>
          </CardHeader>
          <CardContent>
            <span className="font-medium text-emerald-600 text-xs dark:text-emerald-300">
              {item.delta}
            </span>
          </CardContent>
        </Card>
      ))}
    </section>

    <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming Schedule</CardTitle>
              <CardDescription>Keep coverage balanced across departments.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Tabs defaultValue="week">
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button size="sm">
                <PlusIcon className="size-4" />
                Add Shift
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-3 text-sm">
              {scheduleDays.map((day) => (
                <div key={day.label} className="rounded-xl border bg-muted/30 p-3">
                  <div className="font-medium text-muted-foreground text-xs">
                    {day.label}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {day.badges.length === 0 ? (
                      <Badge variant="outline" className="justify-center">
                        No shifts
                      </Badge>
                    ) : (
                      day.badges.map((shift) => (
                        <Badge
                          key={`${day.label}-${shift}`}
                          variant={shift.includes("Open") ? "outline" : "secondary"}
                          className="justify-center"
                        >
                          {shift}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Happening Today</CardTitle>
            <CardDescription>Live shift start times and staff coverage.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {happeningToday.length === 0 ? (
              <div className="rounded-xl border bg-muted/20 p-4 text-muted-foreground text-sm">
                No shifts scheduled for today.
              </div>
            ) : (
              happeningToday.map((item) => (
                <div
                  key={`${item.shift_start.toISOString()}-${item.first_name ?? "unknown"}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-semibold text-muted-foreground text-sm">
                      {formatTime(item.shift_start)}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {item.role ?? "Scheduled shift"}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Badge variant="outline">
                          {formatName(item.first_name, item.last_name)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary" />
                Shift Battle Arena
              </CardTitle>
              <CardDescription>
                Real-time, first-come shift claiming with power-ups.
              </CardDescription>
            </div>
            <Badge className="bg-primary/10 text-primary">Game Mode</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between font-medium text-sm">
              <span className="text-muted-foreground">Live Battle Royale</span>
              <span className="text-primary">This Week</span>
            </div>
            <div className="mt-4 grid gap-4">
              {leaderboard.length === 0 ? (
                <div className="rounded-xl border bg-background p-4 text-muted-foreground text-sm">
                  No shift activity yet this week.
                </div>
              ) : (
                leaderboard.map((person, index) => (
                  <div key={person.employee_id} className="flex gap-3">
                    <div className="font-semibold text-muted-foreground text-sm">
                      #{index + 1}
                    </div>
                    <Avatar>
                      <AvatarImage
                        src=""
                        alt={formatName(person.first_name, person.last_name)}
                      />
                      <AvatarFallback>
                        {formatName(person.first_name, person.last_name).slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {formatName(person.first_name, person.last_name)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {person.shift_count} shifts this week
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {person.role ? (
                          <Badge variant="secondary">{person.role}</Badge>
                        ) : null}
                        <Badge variant="outline">Top performer</Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <Button variant="outline">View full leaderboard</Button>
        </CardContent>
      </Card>
    </section>
  </div>
  );
};

export default SchedulingPage;
