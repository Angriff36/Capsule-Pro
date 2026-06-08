"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  Users,
  CalendarDays,
  TrendingUp,
  BarChart3,
  Loader2,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
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
import { Button } from "@repo/design-system/components/ui/button";
import { log } from "@repo/observability/log";
import Link from "next/link";
import { apiFetch } from "@/app/lib/api";

interface LocationCoverage {
  location_id: string;
  location_name: string;
  total_shifts: number;
  filled_shifts: number;
  unfilled_shifts: number;
  coverage_pct: number;
}

interface DayCoverage {
  date: string;
  day_name: string;
  total_shifts: number;
  filled_shifts: number;
  unfilled_shifts: number;
  unique_employees: number;
  total_hours: number;
  locations: LocationCoverage[];
}

interface CoverageData {
  period: {
    start: string;
    end: string;
    label: string;
  };
  summary: {
    total_shifts: number;
    total_hours: number;
    total_employees: number;
    avg_coverage_pct: number;
    unfilled_shifts: number;
  };
  daily: DayCoverage[];
  location_totals: LocationCoverage[];
}

function getCoverageMeta(pct: number): {
  text: string;
  bar: string;
  tone: "deep-green" | "muted" | "coral";
} {
  if (pct >= 90) {
    return { text: "text-deep-green", bar: "bg-deep-green", tone: "deep-green" };
  }
  if (pct >= 70) {
    return {
      text: "text-muted-foreground",
      bar: "bg-muted-foreground/40",
      tone: "muted",
    };
  }
  return { text: "text-coral", bar: "bg-coral", tone: "coral" };
}

function formatHour(h: number): string {
  return `${h.toFixed(1)}h`;
}

export default function StaffingCoveragePage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [locationId, setLocationId] = useState<string>("all");

  const fetchCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (locationId && locationId !== "all") params.set("locationId", locationId);

      // NOTE: Keeping apiFetch for /api/staffing/coverage — custom aggregate endpoint, no generated function.
      const res = await apiFetch(`/api/staffing/coverage?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      log.error("Failed to fetch coverage", err);
    } finally {
      setLoading(false);
    }
  }, [period, locationId]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  const metrics = data
    ? [
        {
          label: "Total shifts",
          value: String(data.summary.total_shifts),
          note: data.period.label,
        },
        {
          label: "Avg coverage",
          value: `${data.summary.avg_coverage_pct}%`,
          note: "Across all locations",
        },
        {
          label: "Unfilled",
          value: String(data.summary.unfilled_shifts),
          note: data.summary.unfilled_shifts > 0 ? "Needs attention" : "All covered",
        },
        {
          label: "Hours",
          value: data ? formatHour(data.summary.total_hours) : "0.0h",
          note: `${data.summary.total_employees} staff`,
        },
      ]
    : [];

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Staffing</MonoLabel>
            <DisplayHeading>Coverage report</DisplayHeading>
            <CommandBandLede>
              Drill into shift coverage by period and location. Track fill rates,
              staffing levels, and daily breakdowns.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Select onValueChange={setLocationId} value={locationId}>
              <SelectTrigger className="w-48 border-white/25 bg-transparent text-white">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {data?.location_totals?.map((loc) => (
                  <SelectItem key={loc.location_id} value={loc.location_id}>
                    {loc.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={setPeriod} value={period}>
              <SelectTrigger className="w-36 border-white/25 bg-transparent text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="2weeks">2 Weeks</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand>
            {metrics.map((item) => (
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
        ) : !data ? (
          <div className="rounded-[22px] border border-hairline bg-canvas p-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-ink">No coverage data</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Create shifts to see coverage reports
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/scheduling/shifts">
                Go to shifts <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="space-y-6">
              <SectionHeader
                eyebrow="By site"
                icon={<MapPin className="h-4 w-4" />}
                title="Location coverage"
              />
              <div className="rounded-[22px] border border-hairline bg-canvas p-6">
                <div className="space-y-4">
                  {data.location_totals.map((loc) => {
                    const meta = getCoverageMeta(loc.coverage_pct);
                    return (
                      <div className="space-y-1.5" key={loc.location_id}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-ink">
                            {loc.location_name}
                          </span>
                          <span
                            className={`font-mono text-xs ${meta.text}`}
                          >
                            {loc.coverage_pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-soft-stone">
                          <div
                            className={`h-2 rounded-full transition-all ${meta.bar}`}
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
                    );
                  })}
                  {data.location_totals.length === 0 && (
                    <p className="py-4 text-center text-muted-foreground text-sm">
                      No location data
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6 lg:col-span-2">
              <SectionHeader
                description={`${data.period.label} (${data.daily.length} days)`}
                eyebrow="Daily"
                icon={<BarChart3 className="h-4 w-4" />}
                title="Breakdown"
              />
              <div className="rounded-[22px] border border-hairline bg-canvas p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Shifts</TableHead>
                      <TableHead className="text-center">Filled</TableHead>
                      <TableHead className="text-center">Open</TableHead>
                      <TableHead className="text-center">Staff</TableHead>
                      <TableHead className="text-center">Hours</TableHead>
                      <TableHead className="text-center">Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.daily.map((day) => {
                      const pct =
                        day.total_shifts > 0
                          ? Math.round(
                              (day.filled_shifts / day.total_shifts) * 100,
                            )
                          : 0;
                      const meta = getCoverageMeta(pct);
                      return (
                        <TableRow key={day.date}>
                          <TableCell className="font-medium">
                            {day.day_name}
                            <span className="text-muted-foreground text-xs ml-2">
                              {new Date(day.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {day.total_shifts}
                          </TableCell>
                          <TableCell className="text-center">
                            {day.filled_shifts}
                          </TableCell>
                          <TableCell className="text-center">
                            {day.unfilled_shifts > 0 ? (
                              <span className="text-coral font-medium">
                                {day.unfilled_shifts}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {day.unique_employees}
                          </TableCell>
                          <TableCell className="text-center">
                            {day.total_hours.toFixed(1)}h
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono text-xs ${meta.text}`}>
                              {pct}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.daily.length === 0 && (
                      <TableRow>
                        <TableCell
                          className="text-center text-muted-foreground py-8"
                          colSpan={7}
                        >
                          No data for this period
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>
        )}
      </OperationalColumn>
    </PageCanvas>
  );
}
