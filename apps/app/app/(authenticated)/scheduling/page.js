var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const avatar_1 = require("@repo/design-system/components/ui/avatar");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const tabs_1 = require("@repo/design-system/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const tenant_1 = require("../../lib/tenant");
const scheduling_realtime_1 = __importDefault(require("./scheduling-realtime"));
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});
const formatDelta = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const delta = (current - previous) / previous;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${percentFormatter.format(delta)}`;
};
const startOfWeekMonday = (value) => {
  const date = new Date(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};
const addDays = (value, days) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};
const formatDayLabel = (value) =>
  value.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
const formatTime = (value) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
const formatName = (first, last) =>
  [first, last].filter(Boolean).join(" ") || "Unassigned";
const SchedulingPage = async () => {
  const { orgId, userId } = await (0, server_1.auth)();
  if (!orgId) {
    (0, navigation_1.notFound)();
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const weekEnd = addDays(weekStart, 7);
  const previousWeekStart = addDays(weekStart, -7);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = addDays(startOfToday, 1);
  const [currentStaff] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
    `);
  const [previousStaff] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.employees
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
        AND created_at < ${weekStart}
    `);
  const [currentHours] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `);
  const [previousHours] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (shift_end - shift_start)) / 3600), 0) AS hours
      FROM tenant_staff.schedule_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `);
  const [openShifts] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${weekStart}
        AND shift_start < ${weekEnd}
    `);
  const [previousOpenShifts] = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM tenant_staff.open_shifts
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND status = 'open'
        AND shift_start >= ${previousWeekStart}
        AND shift_start < ${weekStart}
    `);
  const [currentCost] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  const [previousCost] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  const shiftSummary = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  const [shiftTotals] = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  const happeningToday = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  const leaderboard = await database_1.database.$queryRaw(database_1.Prisma.sql`
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
    `);
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
      icon: lucide_react_1.UsersIcon,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Hours Scheduled",
      value: `${Math.round(currentHours?.hours ?? 0)}h`,
      delta: formatDelta(currentHours?.hours ?? 0, previousHours?.hours ?? 0),
      note: `${shiftTotals?.shift_count ?? 0} shifts scheduled`,
      icon: lucide_react_1.ClockIcon,
      tone: "bg-secondary/20 text-secondary-foreground",
    },
    {
      label: "Open Shifts",
      value: openShifts?.count ?? 0,
      delta: formatDelta(
        openShifts?.count ?? 0,
        previousOpenShifts?.count ?? 0
      ),
      note: "Unassigned shifts",
      icon: lucide_react_1.CalendarCheckIcon,
      tone: "bg-accent/15 text-accent-foreground",
    },
    {
      label: "Projected Cost",
      value: currencyFormatter.format(currentCost?.cost ?? 0),
      delta: formatDelta(currentCost?.cost ?? 0, previousCost?.cost ?? 0),
      note: "Scheduled labor cost",
      icon: lucide_react_1.WalletIcon,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    },
  ];
  return (
    <div className="flex flex-col gap-6">
      <scheduling_realtime_1.default tenantId={tenantId} userId={userId} />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back. You have scheduling activity for this week.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[260px]">
            <lucide_react_1.SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input_1.Input
              className="pr-12 pl-9"
              placeholder="Search anything..."
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md border bg-background px-2 py-1 text-muted-foreground text-xs">
              ⌘K
            </span>
          </div>
          <button_1.Button size="icon" variant="outline">
            <lucide_react_1.BellIcon className="size-4" />
          </button_1.Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <card_1.Card className="shadow-sm" key={item.label}>
            <card_1.CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <card_1.CardDescription>{item.label}</card_1.CardDescription>
                <card_1.CardTitle className="text-2xl">
                  {item.value}
                </card_1.CardTitle>
                <p className="text-muted-foreground text-xs">{item.note}</p>
              </div>
              <div
                className={`flex size-10 items-center justify-center rounded-xl ${item.tone}`}
              >
                <item.icon className="size-5" />
              </div>
            </card_1.CardHeader>
            <card_1.CardContent>
              <span className="font-medium text-emerald-600 text-xs dark:text-emerald-300">
                {item.delta}
              </span>
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <card_1.Card className="shadow-sm">
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <card_1.CardTitle>Upcoming Schedule</card_1.CardTitle>
                <card_1.CardDescription>
                  Keep coverage balanced across departments.
                </card_1.CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <tabs_1.Tabs defaultValue="week">
                  <tabs_1.TabsList>
                    <tabs_1.TabsTrigger value="week">Week</tabs_1.TabsTrigger>
                    <tabs_1.TabsTrigger value="month">Month</tabs_1.TabsTrigger>
                  </tabs_1.TabsList>
                </tabs_1.Tabs>
                <button_1.Button size="sm">
                  <lucide_react_1.PlusIcon className="size-4" />
                  Add Shift
                </button_1.Button>
              </div>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="grid grid-cols-7 gap-3 text-sm">
                {scheduleDays.map((day) => (
                  <div
                    className="rounded-xl border bg-muted/30 p-3"
                    key={day.label}
                  >
                    <div className="font-medium text-muted-foreground text-xs">
                      {day.label}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {day.badges.length === 0 ? (
                        <badge_1.Badge
                          className="justify-center"
                          variant="outline"
                        >
                          No shifts
                        </badge_1.Badge>
                      ) : (
                        day.badges.map((shift) => (
                          <badge_1.Badge
                            className="justify-center"
                            key={`${day.label}-${shift}`}
                            variant={
                              shift.includes("Open") ? "outline" : "secondary"
                            }
                          >
                            {shift}
                          </badge_1.Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card className="shadow-sm">
            <card_1.CardHeader>
              <card_1.CardTitle>Happening Today</card_1.CardTitle>
              <card_1.CardDescription>
                Live shift start times and staff coverage.
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent className="grid gap-4">
              {happeningToday.length === 0 ? (
                <div className="rounded-xl border bg-muted/20 p-4 text-muted-foreground text-sm">
                  No shifts scheduled for today.
                </div>
              ) : (
                happeningToday.map((item) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3"
                    key={`${item.shift_start.toISOString()}-${item.first_name ?? "unknown"}`}
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
                          <badge_1.Badge variant="outline">
                            {formatName(item.first_name, item.last_name)}
                          </badge_1.Badge>
                        </div>
                      </div>
                    </div>
                    <button_1.Button size="sm" variant="ghost">
                      Edit
                    </button_1.Button>
                  </div>
                ))
              )}
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <card_1.Card className="shadow-sm">
          <card_1.CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <card_1.CardTitle className="flex items-center gap-2">
                  <lucide_react_1.SparklesIcon className="size-5 text-primary" />
                  Shift Battle Arena
                </card_1.CardTitle>
                <card_1.CardDescription>
                  Real-time, first-come shift claiming with power-ups.
                </card_1.CardDescription>
              </div>
              <badge_1.Badge className="bg-primary/10 text-primary">
                Game Mode
              </badge_1.Badge>
            </div>
          </card_1.CardHeader>
          <card_1.CardContent className="grid gap-4">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between font-medium text-sm">
                <span className="text-muted-foreground">
                  Live Battle Royale
                </span>
                <span className="text-primary">This Week</span>
              </div>
              <div className="mt-4 grid gap-4">
                {leaderboard.length === 0 ? (
                  <div className="rounded-xl border bg-background p-4 text-muted-foreground text-sm">
                    No shift activity yet this week.
                  </div>
                ) : (
                  leaderboard.map((person, index) => (
                    <div className="flex gap-3" key={person.employee_id}>
                      <div className="font-semibold text-muted-foreground text-sm">
                        #{index + 1}
                      </div>
                      <avatar_1.Avatar>
                        <avatar_1.AvatarImage
                          alt={formatName(person.first_name, person.last_name)}
                          src=""
                        />
                        <avatar_1.AvatarFallback>
                          {formatName(
                            person.first_name,
                            person.last_name
                          ).slice(0, 2)}
                        </avatar_1.AvatarFallback>
                      </avatar_1.Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-foreground">
                          {formatName(person.first_name, person.last_name)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {person.shift_count} shifts this week
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {person.role ? (
                            <badge_1.Badge variant="secondary">
                              {person.role}
                            </badge_1.Badge>
                          ) : null}
                          <badge_1.Badge variant="outline">
                            Top performer
                          </badge_1.Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button_1.Button variant="outline">
              View full leaderboard
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>
      </section>
    </div>
  );
};
exports.default = SchedulingPage;
