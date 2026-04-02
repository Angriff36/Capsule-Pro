"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  CalendarDays,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Loader2,
  MapPin,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { apiFetch } from "@/app/lib/api";

interface LocationCoverage {
  location_id: string;
  location_name: string;
  total_shifts: number;
  filled_shifts: number;
  unfilled_shifts: number;
  coverage_pct: number;
}

interface WeeklySummary {
  week_start: string;
  week_end: string;
  total_shifts: number;
  total_hours: number;
  unique_employees: number;
  unfilled: number;
}

interface TodayStats {
  total_shifts: number;
  filled_shifts: number;
  unfilled_shifts: number;
  active_employees: number;
  total_hours: number;
  locations: LocationCoverage[];
}

function formatHour(h: number): string {
  return `${h.toFixed(1)}h`;
}

function getCoverageColor(pct: number): string {
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-600";
}

function getCoverageBg(pct: number): string {
  if (pct >= 90) return "bg-green-50";
  if (pct >= 70) return "bg-amber-50";
  return "bg-red-50";
}

export default function StaffingOverviewPage() {
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [locationId, setLocationId] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", "today");
      if (locationId && locationId !== "all") params.set("locationId", locationId);

      const res = await apiFetch(`/api/staffing/coverage?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data.today || null);
        setWeeklySummaries(data.weekly || []);
      }
    } catch (err) {
      console.error("Failed to fetch coverage:", err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  const coveragePct = todayStats
    ? todayStats.total_shifts > 0
      ? Math.round(
          (todayStats.filled_shifts / todayStats.total_shifts) * 100
        )
      : 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            Today&apos;s staffing overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={locationId}
            onValueChange={setLocationId}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {todayStats?.locations?.map((loc) => (
                <SelectItem key={loc.location_id} value={loc.location_id}>
                  {loc.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : !todayStats ? (
        <Card className="p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">No staffing data</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create shifts in the Scheduling module to see coverage here
          </p>
          <Button className="mt-4" size="sm" asChild>
            <Link href="/scheduling/shifts">
              Go to Shifts <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CalendarDays className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {todayStats.total_shifts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Shifts Today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {todayStats.filled_shifts}
                    </p>
                    <p className="text-xs text-muted-foreground">Filled Shifts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${todayStats.unfilled_shifts > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                    <AlertTriangle className={`h-4 w-4 ${todayStats.unfilled_shifts > 0 ? "text-red-700" : "text-gray-500"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {todayStats.unfilled_shifts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Unfilled Shifts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {formatHour(todayStats.total_hours)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Hours Today
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coverage bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today&apos;s Coverage</CardTitle>
              <CardDescription>
                {coveragePct}% of shifts filled — {todayStats.active_employees} active employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    coveragePct >= 90
                      ? "bg-green-500"
                      : coveragePct >= 70
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location Coverage */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location Coverage
                  </CardTitle>
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/staffing/coverage">
                      View All <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayStats.locations.map((loc) => (
                    <div key={loc.location_id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{loc.location_name}</span>
                        <span className={getCoverageColor(loc.coverage_pct)}>
                          {loc.coverage_pct}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            loc.coverage_pct >= 90
                              ? "bg-green-500"
                              : loc.coverage_pct >= 70
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${loc.coverage_pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {loc.filled_shifts} of {loc.total_shifts} shifts filled
                        {loc.unfilled_shifts > 0 && (
                          <span className="text-red-600 ml-1">
                            ({loc.unfilled_shifts} unfilled)
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                  {todayStats.locations.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No locations with shifts today
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Weekly Trend
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklySummaries.slice(0, 6).map((week, idx) => {
                    const pct =
                      week.total_shifts > 0
                        ? Math.round(
                            ((week.total_shifts - week.unfilled) /
                              week.total_shifts) *
                              100
                          )
                        : 100;
                    return (
                      <div
                        key={week.week_start}
                        className="flex items-center gap-3"
                      >
                        <div className="w-24 text-xs text-muted-foreground shrink-0">
                          {new Date(week.week_start).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                          {" – "}
                          {new Date(week.week_end).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              pct >= 90
                                ? "bg-green-500"
                                : pct >= 70
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-right w-20 shrink-0">
                          <span className="font-medium">{week.total_shifts}</span>
                          <span className="text-muted-foreground"> shifts</span>
                          {week.unfilled > 0 && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[10px] bg-red-50 text-red-700"
                            >
                              -{week.unfilled}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {weeklySummaries.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No weekly data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/staffing/shifts">
                    <CalendarDays className="mr-3 h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Manage Shifts</p>
                      <p className="text-xs text-muted-foreground">
                        View and edit shift schedule
                      </p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/staffing/availability">
                    <Clock className="mr-3 h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Availability</p>
                      <p className="text-xs text-muted-foreground">
                        Staff availability &amp; preferences
                      </p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/staffing/coverage">
                    <TrendingUp className="mr-3 h-5 w-5 text-purple-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Coverage Report</p>
                      <p className="text-xs text-muted-foreground">
                        Detailed staffing analytics
                      </p>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link href="/staffing/recommendations">
                    <Users className="mr-3 h-5 w-5 text-amber-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">AI Recommendations</p>
                      <p className="text-xs text-muted-foreground">
                        Smart staffing suggestions
                      </p>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
