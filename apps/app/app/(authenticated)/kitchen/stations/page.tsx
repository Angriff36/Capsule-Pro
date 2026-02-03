import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Separator } from "@repo/design-system/components/ui/separator";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";

type StationStats = {
  station_id: string;
  station_name: string;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  open_tasks: number;
  team_members: number;
};

// Badge variants map for stations
const stationBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  "hot-line": "destructive",
  "cold-prep": "default",
  "bakery": "secondary",
  "prep-station": "outline",
  "garnish": "secondary",
};

const STATION_CONFIG: Record<
  string,
  { label: string; tasksLabel: string }
> = {
  "hot-line": {
    label: "Hot Line",
    tasksLabel: "Hot preparations",
  },
  "cold-prep": {
    label: "Cold Prep",
    tasksLabel: "Cold preparations",
  },
  bakery: {
    label: "Bakery",
    tasksLabel: "Baked goods",
  },
  "prep-station": {
    label: "Prep Station",
    tasksLabel: "General prep",
  },
  garnish: {
    label: "Garnish",
    tasksLabel: "Garnishes & plating",
  },
};

const KitchenStationsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch station stats from kitchen_tasks
  const stationStats = await database.$queryRaw<StationStats[]>(
    Prisma.sql`
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
    `
  );

  // Fetch active claims per station
  const activeClaims = await database.$queryRaw<
    Array<{ station_id: string; count: number }>
  >(
    Prisma.sql`
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
    `
  );

  // Build claim map
  const claimMap = new Map<string, number>();
  activeClaims.forEach((row) => {
    claimMap.set(row.station_id, row.count);
  });

  return (
    <>
      <Header page="Kitchen Stations" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Stations</h1>
          <p className="text-muted-foreground">
            Monitor task progress and team activity across all kitchen stations
          </p>
        </div>

        <Separator />

        {/* Station Overview Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Station Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stationStats.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    No station data found. Tasks with station tags will appear
                    here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              stationStats.map((station) => {
                const config = STATION_CONFIG[station.station_id] || {
                  label: station.station_id,
                  tasksLabel: "Tasks",
                };
                const completionRate =
                  station.total_tasks > 0
                    ? Math.round(
                        (station.completed_tasks / station.total_tasks) * 100
                      )
                    : 0;
                const activeClaims = claimMap.get(station.station_id) || 0;
                const badgeVariant = stationBadgeVariant[station.station_id] || "secondary";

                return (
                  <Card key={station.station_id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{config.label}</CardTitle>
                        <Badge variant={badgeVariant}>
                          {station.total_tasks} tasks
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Completion
                          </span>
                          <span className="font-medium">{completionRate}%</span>
                        </div>
                        <Progress className="h-2" value={completionRate} />
                      </div>

                      {/* Task breakdown */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-muted/50 p-2">
                          <div className="text-lg font-bold">
                            {station.open_tasks}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Open
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <div className="text-lg font-bold">
                            {station.in_progress_tasks}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            In Progress
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <div className="text-lg font-bold">
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
                          <Badge variant="outline">
                            {activeClaims} team member
                            {activeClaims !== 1 ? "s" : ""} working
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>

        {/* Station Legend Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Station Tags Reference
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {Object.entries(STATION_CONFIG).map(([key, config]) => (
                  <div
                    className="flex items-center gap-2 rounded-lg border p-3"
                    key={key}
                  >
                    <div className="size-3 rounded-full bg-current" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Add station tags to tasks (e.g., "hot-line", "cold-prep",
                "bakery") to see them grouped here. Tasks can have multiple
                station tags.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
};

export default KitchenStationsPage;
