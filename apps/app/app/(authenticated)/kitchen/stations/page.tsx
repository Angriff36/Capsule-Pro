import { auth } from "@repo/auth/server";
import {
  listKitchenTaskClaims,
  listKitchenTasks,
} from "@/app/lib/manifest-client.generated";
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

interface StationStats {
  completed_tasks: number;
  in_progress_tasks: number;
  open_tasks: number;
  station_id: string;
  station_name: string;
  team_members: number;
  total_tasks: number;
}

const parseTaskTags = (tags: string | null | undefined): string[] => {
  if (!tags) {
    return [];
  }
  const trimmed = tags.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0);
      }
    } catch {
      return [];
    }
  }
  return trimmed
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

// Badge variants map for stations
const stationBadgeVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  "hot-line": "destructive",
  "cold-prep": "default",
  bakery: "secondary",
  "prep-station": "outline",
  garnish: "secondary",
};

const STATION_CONFIG: Record<string, { label: string; tasksLabel: string }> = {
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

  const [tasks, claims] = await Promise.all([
    (await listKitchenTasks()).data.filter((task) => task.tenantId === tenantId),
    (await listKitchenTaskClaims()).data.filter(
      (claim) => claim.tenantId === tenantId && !claim.releasedAt
    ),
  ]);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const stationMap = new Map<string, StationStats>();
  for (const task of tasks) {
    const normalizedTags = parseTaskTags(task.tags).map((tag) =>
      tag.toLowerCase().replace(/\s+/g, "-")
    );
    for (const stationId of normalizedTags) {
      const current = stationMap.get(stationId) ?? {
        station_id: stationId,
        station_name: stationId,
        total_tasks: 0,
        completed_tasks: 0,
        in_progress_tasks: 0,
        open_tasks: 0,
        team_members: 0,
      };
      current.total_tasks += 1;
      if (task.status === "completed") {
        current.completed_tasks += 1;
      }
      if (task.status === "in_progress") {
        current.in_progress_tasks += 1;
      }
      if (task.status === "open") {
        current.open_tasks += 1;
      }
      stationMap.set(stationId, current);
    }
  }
  const stationStats = Array.from(stationMap.values()).sort(
    (a, b) => b.total_tasks - a.total_tasks
  );

  // Build claim map
  const claimMap = new Map<string, number>();
  for (const claim of claims) {
    const task = tasksById.get(claim.taskId);
    if (!task) {
      continue;
    }
    const normalizedTags = parseTaskTags(task.tags).map((tag) =>
      tag.toLowerCase().replace(/\s+/g, "-")
    );
    for (const stationId of normalizedTags) {
      claimMap.set(stationId, (claimMap.get(stationId) ?? 0) + 1);
    }
  }

  return (
    <>
      <Header page="Kitchen Stations" pages={["Kitchen Ops"]} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="font-semibold text-2xl tracking-tight">
            Kitchen Stations
          </h1>
          <p className="text-muted-foreground">
            Monitor task progress and team activity across all kitchen stations
          </p>
        </div>

        <Separator />

        {/* Station Overview Section */}
        <section className="space-y-4">
          <h2 className="font-medium text-muted-foreground text-sm">
            Station Overview
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stationStats.length === 0 ? (
              <Card className="col-span-full" tone="canvas">
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
                const badgeVariant =
                  stationBadgeVariant[station.station_id] || "secondary";

                return (
                  <Card key={station.station_id} tone="canvas">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {config.label}
                        </CardTitle>
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
                          <div className="font-bold text-lg">
                            {station.open_tasks}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Open
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <div className="font-bold text-lg">
                            {station.in_progress_tasks}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            In Progress
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2">
                          <div className="font-bold text-lg">
                            {station.completed_tasks}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Done
                          </div>
                        </div>
                      </div>

                      {/* Active claims */}
                      {activeClaims > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">
                            {activeClaims} team member
                            {activeClaims === 1 ? "" : "s"} working
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
          <h2 className="font-medium text-muted-foreground text-sm">
            Station Tags Reference
          </h2>
          <Card tone="canvas">
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                {Object.entries(STATION_CONFIG).map(([key, config]) => (
                  <div
                    className="flex items-center gap-2 rounded-lg border p-3"
                    key={key}
                  >
                    <div className="size-3 rounded-full bg-current" />
                    <span className="font-medium text-sm">{config.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-muted-foreground text-sm">
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
