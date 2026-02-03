"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  User,
} from "lucide-react";
import {
  getCompletionColor,
  useKitchenAnalytics,
} from "./lib/use-kitchen-analytics";

const AnalyticsKitchenPage = () => {
  const { data, isLoading, error } = useKitchenAnalytics({ period: "30d" });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Operations</h1>
          <p className="text-muted-foreground">
            Measure throughput, completion rates, and station balance.
          </p>
        </div>
        <Separator />

        {/* Loading Content */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Performance Overview</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="space-y-3">
              <CardHeader>
                <CardTitle>Station Throughput</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div className="space-y-2" key={i}>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Kitchen Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton className="h-8 w-full" key={i} />
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Kitchen Operations</h1>
          <p className="text-muted-foreground">
            Measure throughput, completion rates, and station balance.
          </p>
        </div>
        <Separator />

        {/* Error Content */}
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-2 p-6">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-destructive-foreground">
              Failed to load kitchen analytics. Please try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { stationThroughput, kitchenHealth, topPerformers } = data;

  // Calculate summary stats
  const totalStationLoad = stationThroughput.reduce(
    (sum, s) => sum + s.load,
    0
  );
  const _avgLoad =
    stationThroughput.length > 0
      ? Math.round(totalStationLoad / stationThroughput.length)
      : 0;

  const avgCompletion =
    stationThroughput.length > 0
      ? Math.round(
          stationThroughput.reduce((sum, s) => sum + s.completed, 0) /
            stationThroughput.length
        )
      : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">Kitchen Operations</h1>
        <p className="text-muted-foreground">
          Measure throughput, completion rates, and station balance.
        </p>
      </div>
      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Performance Overview</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Station Throughput */}
          <Card className="space-y-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Station Throughput</CardTitle>
                <Badge className="gap-1" variant="outline">
                  <TrendingUp className="size-3" />
                  Avg {avgCompletion}% complete
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stationThroughput.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  No station data available for the selected period.
                </p>
              ) : (
                stationThroughput.map((station) => (
                  <div className="space-y-2" key={station.stationId}>
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-semibold">{station.stationName}</p>
                      <Badge variant="outline">
                        Avg {station.avgTime} per task
                      </Badge>
                    </div>
                    <div className="space-y-1 text-muted-foreground text-xs">
                      <div className="flex items-center justify-between">
                        <span>Load</span>
                        <span>{station.load}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${
                            station.load >= 80
                              ? "bg-destructive"
                              : station.load >= 60
                                ? "bg-orange-500"
                                : station.load >= 40
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                          }`}
                          style={{ width: `${station.load}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Complete</span>
                        <span>{station.completed}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${getCompletionColor(station.completed)}`}
                          style={{ width: `${station.completed}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-xs pt-1">
                      <span>{station.completedItems} completed</span>
                      <span>{station.pendingItems} pending</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Kitchen Health */}
          <Card>
            <CardHeader>
              <CardTitle>Kitchen Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prep Lists Sync */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Prep lists sync</span>
                  </div>
                  <Badge
                    variant={
                      kitchenHealth.prepListsSync.rate >= 90
                        ? "default"
                        : "secondary"
                    }
                  >
                    {kitchenHealth.prepListsSync.rate}% success
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {kitchenHealth.prepListsSync.completed} of{" "}
                  {kitchenHealth.prepListsSync.total} lists finalized
                </p>
              </div>

              {/* Allergen Warnings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`size-4 ${kitchenHealth.allergenWarnings > 0 ? "text-orange-500" : "text-emerald-500"}`}
                    />
                    <span>Allergen warnings</span>
                  </div>
                  <Badge
                    variant={
                      kitchenHealth.allergenWarnings > 0
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {kitchenHealth.allergenWarnings} active
                  </Badge>
                </div>
                {kitchenHealth.allergenWarnings > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Review allergen conflicts before service
                  </p>
                )}
              </div>

              {/* Waste Alerts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`size-4 ${kitchenHealth.wasteAlerts > 5 ? "text-destructive" : kitchenHealth.wasteAlerts > 0 ? "text-orange-500" : "text-emerald-500"}`}
                    />
                    <span>Waste alerts</span>
                  </div>
                  <Badge
                    variant={
                      kitchenHealth.wasteAlerts > 5
                        ? "destructive"
                        : kitchenHealth.wasteAlerts > 0
                          ? "secondary"
                          : "secondary"
                    }
                  >
                    {kitchenHealth.wasteAlerts} entries
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Logged in selected period
                </p>
              </div>

              {/* Time to Completion */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-blue-500" />
                    <span>Avg completion time</span>
                  </div>
                  <Badge variant="outline">
                    {kitchenHealth.timeToCompletion}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  Average time to complete prep tasks
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          {topPerformers.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="size-5" />
                  <CardTitle>Top Performers</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {topPerformers.map((performer) => (
                    <div
                      className="flex items-center gap-3 rounded-lg border p-3"
                      key={performer.employeeId}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                        {performer.firstName[0]}
                        {performer.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {performer.firstName} {performer.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {performer.completedTasks} tasks
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
};

export default AnalyticsKitchenPage;
