Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const progress_1 = require("@repo/design-system/components/ui/progress");
const tenant_1 = require("../../../lib/tenant");
const header_1 = require("../../components/header");
const STATION_CONFIG = {
  "hot-line": {
    label: "Hot Line",
    color: "bg-red-100 text-red-800",
    tasksLabel: "Hot preparations",
  },
  "cold-prep": {
    label: "Cold Prep",
    color: "bg-blue-100 text-blue-800",
    tasksLabel: "Cold preparations",
  },
  bakery: {
    label: "Bakery",
    color: "bg-amber-100 text-amber-800",
    tasksLabel: "Baked goods",
  },
  "prep-station": {
    label: "Prep Station",
    color: "bg-green-100 text-green-800",
    tasksLabel: "General prep",
  },
  garnish: {
    label: "Garnish",
    color: "bg-purple-100 text-purple-800",
    tasksLabel: "Garnishes & plating",
  },
};
const KitchenStationsPage = async () => {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return null;
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  // Fetch station stats from kitchen_tasks
  const stationStats = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT
        LOWER(REPLACE(tag, ' ', '-')) AS station_id,
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_tasks,
        0 AS team_members
      FROM tenant_kitchen.kitchen_tasks
      CROSS JOIN UNNEST(tags) AS tag
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND tags IS NOT NULL
        AND ARRAY_LENGTH(tags, 1) > 0
      GROUP BY tag
      ORDER BY total_tasks DESC
    `);
  // Fetch active claims per station
  const activeClaims = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
      SELECT
        LOWER(REPLACE(tag, ' ', '-')) AS station_id,
        COUNT(*) AS count
      FROM tenant_kitchen.task_claims tc
      JOIN tenant_kitchen.kitchen_tasks kt ON kt.id = tc.task_id
      CROSS JOIN UNNEST(kt.tags) AS tag
      WHERE tc.tenant_id = ${tenantId}
        AND tc.released_at IS NULL
        AND kt.deleted_at IS NULL
        AND kt.tags IS NOT NULL
        AND ARRAY_LENGTH(kt.tags, 1) > 0
      GROUP BY tag
    `);
  // Build claim map
  const claimMap = new Map();
  activeClaims.forEach((row) => {
    claimMap.set(row.station_id, row.count);
  });
  return (
    <>
      <header_1.Header page="Kitchen Stations" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Station Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stationStats.length === 0 ? (
            <card_1.Card className="col-span-full">
              <card_1.CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No station data found. Tasks with station tags will appear
                  here.
                </p>
              </card_1.CardContent>
            </card_1.Card>
          ) : (
            stationStats.map((station) => {
              const config = STATION_CONFIG[station.station_id] || {
                label: station.station_id,
                color: "bg-slate-100 text-slate-800",
                tasksLabel: "Tasks",
              };
              const completionRate =
                station.total_tasks > 0
                  ? Math.round(
                      (station.completed_tasks / station.total_tasks) * 100
                    )
                  : 0;
              const activeClaims = claimMap.get(station.station_id) || 0;
              return (
                <card_1.Card key={station.station_id}>
                  <card_1.CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <card_1.CardTitle className="text-lg">
                        {config.label}
                      </card_1.CardTitle>
                      <badge_1.Badge
                        className={config.color}
                        variant="secondary"
                      >
                        {station.total_tasks} tasks
                      </badge_1.Badge>
                    </div>
                  </card_1.CardHeader>
                  <card_1.CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Completion
                        </span>
                        <span className="font-medium">{completionRate}%</span>
                      </div>
                      <progress_1.Progress
                        className="h-2"
                        value={completionRate}
                      />
                    </div>

                    {/* Task breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 p-2">
                        <div className="text-lg font-bold text-slate-700">
                          {station.open_tasks}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Open
                        </div>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <div className="text-lg font-bold text-blue-700">
                          {station.in_progress_tasks}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          In Progress
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-2">
                        <div className="text-lg font-bold text-emerald-700">
                          {station.completed_tasks}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Done
                        </div>
                      </div>
                    </div>

                    {/* Active claims */}
                    {activeClaims > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <badge_1.Badge variant="outline">
                          {activeClaims} team member
                          {activeClaims !== 1 ? "s" : ""} working
                        </badge_1.Badge>
                      </div>
                    )}
                  </card_1.CardContent>
                </card_1.Card>
              );
            })
          )}
        </div>

        {/* Station Legend / Help */}
        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Station Tags</card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {Object.entries(STATION_CONFIG).map(([key, config]) => (
                <div
                  className="flex items-center gap-2 rounded-lg border p-3"
                  key={key}
                >
                  <div className={`h-3 w-3 rounded-full ${config.color}`} />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Add station tags to tasks (e.g., "hot-line", "cold-prep",
              "bakery") to see them grouped here. Tasks can have multiple
              station tags.
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </>
  );
};
exports.default = KitchenStationsPage;
