"use client";

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
import { Separator } from "@repo/design-system/components/ui/separator";
import { useEffect, useState } from "react";
import type {
  EmployeePerformanceMetrics,
  EmployeePerformanceSummary,
} from "../actions/get-employee-performance";

type EmployeePerformanceDashboardProps = {
  employeeId?: string;
};

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
          const response = await fetch(
            `/api/analytics/staff/employees/${employeeId}?period=${selectedPeriod}`
          );
          const data = await response.json();
          setMetrics(data);
        } else {
          const response = await fetch(
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
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 mt-2 animate-pulse bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full animate-pulse bg-muted rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (employeeId && metrics) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">
              {metrics.firstName} {metrics.lastName}
            </h2>
            <p className="text-sm text-muted-foreground">
              {metrics.role} • Hired: {metrics.hireDate.toLocaleDateString()}
            </p>
          </div>
        </div>

        <Separator />

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Performance Overview
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Task Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.taskCompletionRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.completedTasks} of {metrics.totalTasks} tasks
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    metrics.qualityScore >= 80
                      ? "text-emerald-600"
                      : metrics.qualityScore >= 60
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {metrics.qualityScore.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Rework rate: {metrics.reworkRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Efficiency Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    metrics.efficiencyScore >= 80
                      ? "text-emerald-600"
                      : metrics.efficiencyScore >= 60
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {metrics.efficiencyScore.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metrics.tasksPerHour.toFixed(1)} tasks/hour
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Punctuality Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    metrics.punctualityRate >= 95
                      ? "text-emerald-600"
                      : metrics.punctualityRate >= 90
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {metrics.punctualityRate.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Attendance: {metrics.attendanceRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Performance Details
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Task Performance</CardTitle>
                <CardDescription>
                  Task completion and quality metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Task Completion</span>
                      <span className="font-medium">
                        {metrics.taskCompletionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.taskCompletionRate >= 80
                            ? "bg-emerald-600"
                            : metrics.taskCompletionRate >= 60
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.taskCompletionRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>On-Time Delivery</span>
                      <span className="font-medium">
                        {metrics.onTimeTaskRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.onTimeTaskRate >= 80
                            ? "bg-emerald-600"
                            : metrics.onTimeTaskRate >= 60
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.onTimeTaskRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Quality Score</span>
                      <span className="font-medium">
                        {metrics.qualityScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.qualityScore >= 80
                            ? "bg-emerald-600"
                            : metrics.qualityScore >= 60
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.qualityScore}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Efficiency Score</span>
                      <span className="font-medium">
                        {metrics.efficiencyScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.efficiencyScore >= 80
                            ? "bg-emerald-600"
                            : metrics.efficiencyScore >= 60
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.efficiencyScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance & Punctuality</CardTitle>
                <CardDescription>
                  Work schedule adherence and reliability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Attendance Rate</span>
                      <span className="font-medium">
                        {metrics.attendanceRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.attendanceRate >= 95
                            ? "bg-emerald-600"
                            : metrics.attendanceRate >= 90
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.attendanceRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Punctuality Rate</span>
                      <span className="font-medium">
                        {metrics.punctualityRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          metrics.punctualityRate >= 95
                            ? "bg-emerald-600"
                            : metrics.punctualityRate >= 90
                              ? "bg-amber-600"
                              : "bg-rose-600"
                        }`}
                        style={{ width: `${metrics.punctualityRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Total Shifts
                        </div>
                        <div className="text-lg font-bold">
                          {metrics.totalShifts}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Avg Hours/Week
                        </div>
                        <div className="text-lg font-bold">
                          {metrics.averageHoursPerWeek.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Activity Summary
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>
                Overall work activity and contributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Tasks
                  </div>
                  <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Completed Tasks
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.completedTasks}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Hours Worked
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.totalHoursWorked.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Avg Task Duration
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.averageTaskDuration.toFixed(1)}h
                  </div>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 mt-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Client Interactions
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.clientInteractions}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Event Participation
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics.eventParticipation}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-3xl font-bold tracking-tight">
            Employee Performance Dashboard
          </h2>
        </div>
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
      </div>

      <Separator />

      {summary && (
        <>
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Performance Overview
            </h3>
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Total Employees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.totalEmployees}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Avg Task Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.averageTaskCompletionRate.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Avg Quality Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.averageQualityScore.toFixed(1)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Avg Efficiency Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {summary.averageEfficiencyScore.toFixed(1)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Top Performers
            </h3>
            <Card>
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
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      key={performer.employeeId}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                          {performer.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">{performer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {performer.category}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {performer.score.toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Score
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Metrics Analysis
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Metrics by Role</CardTitle>
                  <CardDescription>
                    Performance breakdown by employee role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Role</th>
                          <th className="py-2 text-right font-medium">
                            Employees
                          </th>
                          <th className="py-2 text-right font-medium">
                            Completion %
                          </th>
                          <th className="py-2 text-right font-medium">
                            Quality
                          </th>
                          <th className="py-2 text-right font-medium">
                            Efficiency
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.metricsByRole.map((roleMetrics) => (
                          <tr
                            className="border-b hover:bg-muted/50"
                            key={roleMetrics.role}
                          >
                            <td className="py-2">{roleMetrics.role}</td>
                            <td className="py-2 text-right">
                              {roleMetrics.employeeCount}
                            </td>
                            <td className="py-2 text-right">
                              {roleMetrics.avgTaskCompletionRate.toFixed(1)}%
                            </td>
                            <td
                              className={`py-2 text-right font-medium ${
                                roleMetrics.avgQualityScore >= 80
                                  ? "text-emerald-600"
                                  : roleMetrics.avgQualityScore >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roleMetrics.avgQualityScore.toFixed(1)}
                            </td>
                            <td
                              className={`py-2 text-right font-medium ${
                                roleMetrics.avgEfficiencyScore >= 80
                                  ? "text-emerald-600"
                                  : roleMetrics.avgEfficiencyScore >= 60
                                    ? "text-amber-600"
                                    : "text-rose-600"
                              }`}
                            >
                              {roleMetrics.avgEfficiencyScore.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Trends</CardTitle>
                  <CardDescription>
                    Monthly performance metrics over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {summary.monthlyTrends.map((trend, _index) => (
                      <div
                        className="flex items-center gap-2 text-sm"
                        key={trend.month}
                      >
                        <div className="w-16 text-xs text-muted-foreground">
                          {new Date(`${trend.month}-01`).toLocaleDateString(
                            "en-US",
                            { month: "short" }
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-1">
                            <div className="w-24 text-xs">Completion:</div>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{
                                  width: `${Math.min(
                                    trend.avgTaskCompletionRate,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="w-10 text-right text-xs">
                              {trend.avgTaskCompletionRate.toFixed(0)}%
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-24 text-xs">Quality:</div>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
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
          </section>
        </>
      )}
    </div>
  );
}
