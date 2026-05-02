"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

function getCoverageMeta(pct: number): { text: string; bar: string } {
  if (pct >= 90) {
    return { text: "text-deep-green", bar: "bg-deep-green" };
  }
  if (pct >= 70) {
    return { text: "text-muted-foreground", bar: "bg-muted-foreground/40" };
  }
  return { text: "text-coral", bar: "bg-coral" };
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
      if (locationId && locationId !== "all") {
        params.set("locationId", locationId);
      }

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
      ? Math.round((todayStats.filled_shifts / todayStats.total_shifts) * 100)
      : 100
    : 0;

  const stats = [
    {
      label: "Total shifts",
      value: String(todayStats?.total_shifts ?? 0),
      note: "Today",
    },
    {
      label: "Filled",
      value: String(todayStats?.filled_shifts ?? 0),
      note: `${coveragePct}% coverage`,
    },
    {
      label: "Unfilled",
      value: String(todayStats?.unfilled_shifts ?? 0),
      note:
        (todayStats?.unfilled_shifts ?? 0) > 0
          ? "Needs attention"
          : "All covered",
    },
    {
      label: "Hours today",
      value: todayStats ? formatHour(todayStats.total_hours) : "0.0h",
      note: `${todayStats?.active_employees ?? 0} active staff`,
    },
  ];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Staffing</MonoLabel>
            <DisplayHeading>Today's coverage at a glance</DisplayHeading>
            <CommandBandLede>
              Live coverage across every location. Find unfilled shifts, weekly
              trend, and the next action without leaving this page.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Select onValueChange={setLocationId} value={locationId}>
              <SelectTrigger className="w-48 border-white/25 bg-transparent text-white">
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
            <Button asChild size="default" variant="on-dark">
              <Link href="/staffing/shifts">Manage shifts</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {stats.map((item) => (
              <MetricCell key={item.label}>
                <MetricLabel>{item.label}</MetricLabel>
                <MetricValue>{item.value}</MetricValue>
                <div className="text-white/55 text-xs">{item.note}</div>
              </MetricCell>
            ))}
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        {loading ? (
          <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : todayStats ? (
          <>
            <section className="space-y-6">
              <SectionHeader
                description="Filled vs. open across the operation."
                eyebrow="Coverage"
                title="Today"
              />
              <div className="rounded-[22px] border border-hairline bg-canvas p-6">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">
                    {coveragePct}% of shifts filled
                  </span>
                  <span className="text-muted-foreground">
                    {todayStats.active_employees} active employees
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-soft-stone">
                  <div
                    className={`h-3 rounded-full transition-all ${getCoverageMeta(coveragePct).bar}`}
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <SectionHeader
                  actions={
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/staffing/coverage">
                        View all
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  }
                  eyebrow="By site"
                  icon={<MapPin className="h-4 w-4" />}
                  title="Location coverage"
                />
                <div className="rounded-[22px] border border-hairline bg-canvas p-6">
                  <div className="space-y-4">
                    {todayStats.locations.map((loc) => (
                      <div className="space-y-1.5" key={loc.location_id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-ink">
                            {loc.location_name}
                          </span>
                          <span
                            className={`font-mono text-xs ${getCoverageMeta(loc.coverage_pct).text}`}
                          >
                            {loc.coverage_pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-soft-stone">
                          <div
                            className={`h-2 rounded-full ${getCoverageMeta(loc.coverage_pct).bar}`}
                            style={{ width: `${loc.coverage_pct}%` }}
                          />
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {loc.filled_shifts} of {loc.total_shifts} filled
                          {loc.unfilled_shifts > 0 && (
                            <span className="ml-1 text-coral">
                              ({loc.unfilled_shifts} unfilled)
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                    {todayStats.locations.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No locations with shifts today
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <SectionHeader
                  eyebrow="Trend"
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="Last six weeks"
                />
                <div className="rounded-[22px] border border-hairline bg-canvas p-6">
                  <div className="space-y-3">
                    {weeklySummaries.slice(0, 6).map((week) => {
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
                          className="flex items-center gap-3"
                          key={week.week_start}
                        >
                          <div className="w-24 shrink-0 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                            {new Date(week.week_start).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-soft-stone">
                            <div
                              className={`h-2 rounded-full ${getCoverageMeta(pct).bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="w-20 shrink-0 text-right text-xs">
                            <span className="font-medium text-ink">
                              {week.total_shifts}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              shifts
                            </span>
                            {week.unfilled > 0 && (
                              <Badge
                                className="ml-1 text-[10px]"
                                variant="coral"
                              >
                                -{week.unfilled}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {weeklySummaries.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No weekly data available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <SectionHeader
                description="Jump straight to the work."
                eyebrow="Actions"
                title="Quick links"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    href: "/staffing/shifts",
                    label: "Manage shifts",
                    description: "View and edit shift schedule",
                    icon: CalendarDays,
                  },
                  {
                    href: "/staffing/availability",
                    label: "Availability",
                    description: "Staff availability & preferences",
                    icon: Clock,
                  },
                  {
                    href: "/staffing/coverage",
                    label: "Coverage report",
                    description: "Detailed staffing analytics",
                    icon: TrendingUp,
                  },
                  {
                    href: "/staffing/recommendations",
                    label: "AI recommendations",
                    description: "Smart staffing suggestions",
                    icon: Users,
                  },
                ].map(({ href, label, description, icon: Icon }) => (
                  <Link
                    className="group block rounded-[22px] border border-hairline bg-canvas p-5 transition-colors hover:border-ink"
                    href={href}
                    key={href}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-soft-stone text-ink">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-ink text-sm">{label}</p>
                        <p className="text-muted-foreground text-xs">
                          {description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-ink">No staffing data</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Create shifts in the Scheduling module to see coverage here
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/scheduling/shifts">
                Go to shifts <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </OperationalColumn>
    </PageCanvas>
  );
}
