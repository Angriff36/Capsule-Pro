"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import { useEffect, useState } from "react";
// NOTE: Keeping apiFetch for custom analytics endpoints (/api/analytics/staff/*) — no generated client for analytics
import { apiFetch } from "@/app/lib/api";
import type {
  EmployeePerformanceMetrics,
  EmployeePerformanceSummary,
} from "../actions/get-employee-performance";

interface EmployeePerformanceDashboardProps {
  employeeId?: string;
}

export function EmployeePerformanceDashboard({
  employeeId,
}: EmployeePerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<EmployeePerformanceMetrics | null>(
    null
  );
  const [summary, setSummary] = useState<EmployeePerformanceSummary | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("3m");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (employeeId) {
          const response = await apiFetch(
            `/api/analytics/staff/employees/${employeeId}?period=${selectedPeriod}`
          );
          const data = await response.json();
          setMetrics(data);
        } else {
          const response = await apiFetch(
            `/api/analytics/staff/summary?period=${selectedPeriod}`
          );
          const data = await response.json();
          setSummary(data);
        }
      } catch (error) {
        console.error("Failed to load employee performance data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [employeeId, selectedPeriod]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...new Array(4)].map((_, i) => (
          <Card key={i} tone="canvas">
            <CardHeader>
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-16 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="mt-2 h-8 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (employeeId && metrics) {
    return (
      <PageCanvas>
        <CommandBand>
          <CommandBandHeader>
            <MonoLabel tone="dark">STAFF</MonoLabel>
            <DisplayHeading size="md">
              {metrics.firstName} {metrics.lastName}
            </DisplayHeading>
            <CommandBandLede>
              {metrics.role} • Hired: {metrics.hireDate.toLocaleDateString()}
            </CommandBandLede>
          </CommandBandHeader>
        </CommandBand>

        <PageBody>
          <OperationalColumn>
            <SectionHeader title="Performance Overview" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle className="font-medium text-sm">
                    Task Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl">
                    {metrics.taskCompletionRate.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    {metrics.completedTasks} of {metrics.totalTasks} tasks
                  </div>
                </CardContent>
              </Card>

              <Card tone="canvas">
                <CardHeader>
                  <CardTitle className="font-medium text-sm">
                    Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`font-bold text-2xl ${metrics.qualityScore >= 80 ? "text-emerald-600" : metrics.qualityScore >= 60 ? "text-amber-600" : "text-rose-600"}`}
                  >
                    {metrics.qualityScore.toFixed(1)}
                  </div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    Rework rate: {metrics.reworkRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card tone="canvas">
                <CardHeader>
                  <CardTitle className="font-medium text-sm">
                    Efficiency Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`font-bold text-2xl ${metrics.efficiencyScore >= 80 ? "text-emerald-600" : metrics.efficiencyScore >= 60 ? "text-amber-600" : "text-rose-600"}`}
                  >
                    {metrics.efficiencyScore.toFixed(1)}
                  </div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    {metrics.tasksPerHour.toFixed(1)} tasks/hour
                  </div>
                </CardContent>
              </Card>

              <Card tone="canvas">
                <CardHeader>
                  <CardTitle className="font-medium text-sm">
                    Punctuality Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`font-bold text-2xl ${metrics.punctualityRate >= 95 ? "text-emerald-600" : metrics.punctualityRate >= 90 ? "text-amber-600" : "text-rose-600"}`}
                  >
                    {metrics.punctualityRate.toFixed(1)}%
                  </div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    Attendance: {metrics.attendanceRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            <SectionHeader title="Performance Details" />
            <div className="grid gap-6 md:grid-cols-2">
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Task Performance</CardTitle>
                  <CardDescription>
                    Task completion and quality metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Task Completion",
                        value: metrics.taskCompletionRate,
                        color: metrics.taskCompletionRate,
                      },
                      {
                        label: "On-Time Delivery",
                        value: metrics.onTimeTaskRate,
                        color: metrics.onTimeTaskRate,
                      },
                      {
                        label: "Quality Score",
                        value: metrics.qualityScore,
                        color: metrics.qualityScore,
                      },
                      {
                        label: "Efficiency Score",
                        value: metrics.efficiencyScore,
                        color: metrics.efficiencyScore,
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">
                            {item.value.toFixed(1)}
                            {item.label.includes("Score") ? "" : "%"}
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${item.color >= 80 ? "bg-emerald-600" : item.color >= 60 ? "bg-amber-600" : "bg-rose-600"}`}
                            style={{ width: `${item.color}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Attendance & Punctuality</CardTitle>
                  <CardDescription>
                    Work schedule adherence and reliability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Attendance Rate",
                        value: metrics.attendanceRate,
                        threshold: [95, 90],
                      },
                      {
                        label: "Punctuality Rate",
                        value: metrics.punctualityRate,
                        threshold: [95, 90],
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">
                            {item.value.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${item.value >= item.threshold[0] ? "bg-emerald-600" : item.value >= item.threshold[1] ? "bg-amber-600" : "bg-rose-600"}`}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-2">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="text-muted-foreground text-xs">
                            Total Shifts
                          </div>
                          <div className="font-bold text-lg">
                            {metrics.totalShifts}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">
                            Avg Hours/Week
                          </div>
                          <div className="font-bold text-lg">
                            {metrics.averageHoursPerWeek.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <SectionHeader title="Activity Summary" />
            <Card tone="canvas">
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>
                  Overall work activity and contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Total Tasks
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.totalTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Completed Tasks
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.completedTasks}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Total Hours Worked
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.totalHoursWorked.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Avg Task Duration
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.averageTaskDuration.toFixed(1)}h
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-6 border-t pt-4 md:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Client Interactions
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.clientInteractions}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Event Participation
                    </div>
                    <div className="font-bold text-2xl">
                      {metrics.eventParticipation}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </OperationalColumn>
        </PageBody>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">STAFF</MonoLabel>
          <DisplayHeading size="md">
            Employee Performance Dashboard
          </DisplayHeading>
        </CommandBandHeader>
        <CommandBandActions>
          <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CommandBandActions>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          {summary && (
            <>
              <SectionHeader title="Performance Overview" />
              <div className="grid gap-6 md:grid-cols-4">
                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle className="font-medium text-sm">
                      Total Employees
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">
                      {summary.totalEmployees}
                    </div>
                  </CardContent>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle className="font-medium text-sm">
                      Avg Task Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">
                      {summary.averageTaskCompletionRate.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle className="font-medium text-sm">
                      Avg Quality Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">
                      {summary.averageQualityScore.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle className="font-medium text-sm">
                      Avg Efficiency Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl">
                      {summary.averageEfficiencyScore.toFixed(1)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SectionHeader title="Top Performers" />
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>
                    Employees with the highest performance scores by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary.topPerformers.map((performer) => (
                      <div
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                        key={performer.employeeId}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-bold text-white">
                            {performer.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{performer.name}</div>
                            <div className="text-muted-foreground text-sm">
                              {performer.category}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl">
                            {performer.score.toFixed(1)}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <SectionHeader title="Metrics Analysis" />
              <div className="grid gap-6 md:grid-cols-2">
                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle>Metrics by Role</CardTitle>
                    <CardDescription>
                      Performance breakdown by employee role
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">
                            Employees
                          </TableHead>
                          <TableHead className="text-right">
                            Completion %
                          </TableHead>
                          <TableHead className="text-right">Quality</TableHead>
                          <TableHead className="text-right">
                            Efficiency
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.metricsByRole.map((roleMetrics) => (
                          <TableRow key={roleMetrics.role}>
                            <TableCell>{roleMetrics.role}</TableCell>
                            <TableCell className="text-right">
                              {roleMetrics.employeeCount}
                            </TableCell>
                            <TableCell className="text-right">
                              {roleMetrics.avgTaskCompletionRate.toFixed(1)}%
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                roleMetrics.avgQualityScore >= 80
                                  ? "text-emerald-600"
                                  : roleMetrics.avgQualityScore >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roleMetrics.avgQualityScore.toFixed(1)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                roleMetrics.avgEfficiencyScore >= 80
                                  ? "text-emerald-600"
                                  : roleMetrics.avgEfficiencyScore >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roleMetrics.avgEfficiencyScore.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardTitle>Performance Trends</CardTitle>
                    <CardDescription>
                      Monthly performance metrics over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.monthlyTrends.map((trend) => (
                        <div
                          className="flex items-center gap-2 text-sm"
                          key={trend.month}
                        >
                          <div className="w-16 text-muted-foreground text-xs">
                            {new Date(`${trend.month}-01`).toLocaleDateString(
                              "en-US",
                              { month: "short" }
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="w-24 text-xs">Completion:</div>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{
                                    width: `${Math.min(trend.avgTaskCompletionRate, 100)}%`,
                                  }}
                                />
                              </div>
                              <div className="w-10 text-right text-xs">
                                {trend.avgTaskCompletionRate.toFixed(0)}%
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-24 text-xs">Quality:</div>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-emerald-600 transition-all"
                                  style={{
                                    width: `${Math.min(trend.avgQualityScore, 100)}%`,
                                  }}
                                />
                              </div>
                              <div className="w-10 text-right text-xs">
                                {trend.avgQualityScore.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
