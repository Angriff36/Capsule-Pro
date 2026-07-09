/**
 * Task-tag aggregation — NOT the Station entity product.
 * Groups KitchenTask tags that look like station types for workload visibility.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { stationTypeLabel } from "./station-catalog";

export interface StationTypeWorkload {
  completedTasks: number;
  inProgressTasks: number;
  openTasks: number;
  stationTypeKey: string;
  totalTasks: number;
  workingClaims: number;
}

interface TaskWorkloadByStationTypeProps {
  rows: StationTypeWorkload[];
}

export function TaskWorkloadByStationType({
  rows,
}: TaskWorkloadByStationTypeProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium text-lg">Task workload by station type</h2>
        <p className="text-muted-foreground text-sm">
          Derived from KitchenTask tags (e.g. &quot;hot-line&quot;). This is not
          the Station catalog — it does not create or manage Station records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 ? (
          <Card className="col-span-full" tone="canvas">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No task tags matching station types yet. Tag kitchen tasks to see
              workload here.
            </CardContent>
          </Card>
        ) : (
          rows.map((row) => {
            const completionRate =
              row.totalTasks > 0
                ? Math.round((row.completedTasks / row.totalTasks) * 100)
                : 0;
            return (
              <Card key={row.stationTypeKey} tone="canvas">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">
                      {stationTypeLabel(row.stationTypeKey)}
                    </CardTitle>
                    <Badge variant="outline">{row.totalTasks} tasks</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{completionRate}%</span>
                    </div>
                    <Progress className="h-2" value={completionRate} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="font-semibold text-base">
                        {row.openTasks}
                      </div>
                      Open
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="font-semibold text-base">
                        {row.inProgressTasks}
                      </div>
                      In progress
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="font-semibold text-base">
                        {row.completedTasks}
                      </div>
                      Done
                    </div>
                  </div>
                  {row.workingClaims > 0 ? (
                    <Badge variant="secondary">
                      {row.workingClaims} working claim
                      {row.workingClaims === 1 ? "" : "s"}
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
