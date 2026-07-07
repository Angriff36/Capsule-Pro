"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { addDays, format, isAfter, isBefore } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listFacilityAssets,
  listPreventiveMaintenanceSchedules,
} from "@/app/lib/manifest-client.generated";
import type { PreventiveMaintenanceSchedule } from "@/app/lib/manifest-types.generated";

interface UpcomingMaintenanceWidgetProps {
  compact?: boolean;
}

export function UpcomingMaintenanceWidget({
  compact = false,
}: UpcomingMaintenanceWidgetProps) {
  const [schedules, setSchedules] = useState<PreventiveMaintenanceSchedule[]>(
    []
  );
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesRes, assetsRes] = await Promise.all([
        listPreventiveMaintenanceSchedules({ status: "active" }),
        listFacilityAssets({ status: "active" }),
      ]);
      setSchedules(schedulesRes.data);
      setAssets(assetsRes.data as unknown as { id: string; name: string }[]);
    } catch (error) {
      console.error("Failed to load widget data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();
  const sevenDaysFromNow = addDays(now, 7);

  const overdueSchedules = schedules.filter((s) =>
    isBefore(new Date(s.nextDueAt), now)
  );
  const upcomingSchedules = schedules
    .filter((s) => {
      const dueDate = new Date(s.nextDueAt);
      return (
        (isAfter(dueDate, now) || isSameDay(dueDate, now)) &&
        isBefore(dueDate, sevenDaysFromNow)
      );
    })
    .slice(0, compact ? 3 : 5);

  const getAssetName = (equipmentId: string | null | undefined) => {
    if (!equipmentId) {
      return null;
    }
    const asset = assets.find((a) => a.id === equipmentId);
    return asset?.name || null;
  };

  const frequencyColors: Record<string, string> = {
    daily: "bg-muted/50 text-foreground",
    weekly: "bg-muted/50 text-foreground",
    biweekly: "bg-muted/50 text-foreground",
    monthly: "bg-muted/50 text-foreground",
    quarterly: "bg-muted/50 text-foreground",
    semiannual: "bg-muted/50 text-foreground",
    annual: "bg-muted/50 text-foreground",
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4" />
            Upcoming Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (schedules.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4" />
            Upcoming Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No maintenance schedules configured.
          </p>
          <Button asChild className="mt-2" size="sm" variant="outline">
            <Link href="/facilities/schedules">Create Schedule</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-medium text-sm">
            <Calendar className="h-4 w-4" />
            Upcoming Maintenance
          </CardTitle>
          <Button
            asChild
            className="h-7 gap-1 text-xs"
            size="sm"
            variant="ghost"
          >
            <Link href="/facilities/schedules">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overdue Alert */}
        {overdueSchedules.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-700 text-sm">
              {overdueSchedules.length} overdue
            </span>
          </div>
        )}

        {/* Upcoming List */}
        {upcomingSchedules.length === 0 && overdueSchedules.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No maintenance due in the next 7 days.
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingSchedules.map((schedule) => {
              const dueDate = new Date(schedule.nextDueAt);
              const assetName = getAssetName(schedule.equipmentId);
              const isDueToday = isSameDay(dueDate, now);

              return (
                <div
                  className="flex items-center justify-between rounded-lg border bg-muted/20 p-2"
                  key={schedule.id}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">
                        {schedule.title}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span
                          className={
                            isDueToday ? "font-medium text-amber-600" : ""
                          }
                        >
                          {isDueToday ? "Today" : format(dueDate, "MMM d")}
                        </span>
                        {assetName && (
                          <>
                            <span>•</span>
                            <span className="truncate">{assetName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    className={
                      (schedule.frequency &&
                        frequencyColors[schedule.frequency]) ||
                      "bg-muted/20 text-muted-foreground"
                    }
                  >
                    {schedule.frequency}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-2 border-t pt-2 text-muted-foreground text-xs">
          <span>{schedules.length} total schedules</span>
          {overdueSchedules.length > 0 && (
            <>
              <span>•</span>
              <span className="text-red-600">
                {overdueSchedules.length} overdue
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function for same day comparison
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
