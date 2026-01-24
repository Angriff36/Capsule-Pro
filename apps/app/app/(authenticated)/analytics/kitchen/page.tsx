"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
  const { data, isLoading, error } = useKitchenAnalytics("30d");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Kitchen Operations</h1>
          <p className="text-sm text-muted-foreground">
            Measure throughput, completion rates, and station balance.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
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
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold">Kitchen Operations</h1>
          <p className="text-sm text-muted-foreground">
            Measure throughput, completion rates, and station balance.
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 p-6">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">
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
  const avgLoad =
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
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Analytics
        </p>
        <h1 className="text-2xl font-semibold">Kitchen Operations</h1>
        <p className="text-sm text-muted-foreground">
          Measure throughput, completion rates, and station balance.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Station Throughput */}
        <Card className="space-y-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Station Throughput</CardTitle>
              <Badge className="gap-1" variant="outline">
                <TrendingUp className="h-3 w-3" />
                Avg {avgCompletion}% complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stationThroughput.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
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
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Load</span>
                      <span>{station.load}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${
                          station.load >= 80
                            ? "bg-red-500"
                            : station.load >= 60
                              ? "bg-orange-500"
                              : station.load >= 40
                                ? "bg-yellow-500"
                                : "bg-green-500"
                        }`}
                        style={{ width: `${station.load}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Complete</span>
                      <span>{station.completed}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-2 rounded-full ${getCompletionColor(station.completed)}`}
                        style={{ width: `${station.completed}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
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
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
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
              <p className="text-xs text-muted-foreground">
                {kitchenHealth.prepListsSync.completed} of{" "}
                {kitchenHealth.prepListsSync.total} lists finalized
              </p>
            </div>

            {/* Allergen Warnings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${kitchenHealth.allergenWarnings > 0 ? "text-orange-500" : "text-emerald-500"}`}
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
                <p className="text-xs text-muted-foreground">
                  Review allergen conflicts before service
                </p>
              )}
            </div>

            {/* Waste Alerts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 ${kitchenHealth.wasteAlerts > 5 ? "text-red-500" : kitchenHealth.wasteAlerts > 0 ? "text-orange-500" : "text-emerald-500"}`}
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
              <p className="text-xs text-muted-foreground">
                Logged in selected period
              </p>
            </div>

            {/* Time to Completion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Avg completion time</span>
                </div>
                <Badge variant="outline">
                  {kitchenHealth.timeToCompletion}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
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
                <User className="h-5 w-5" />
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
                      <p className="text-xs text-muted-foreground">
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
    </div>
  );
};

export default AnalyticsKitchenPage;
