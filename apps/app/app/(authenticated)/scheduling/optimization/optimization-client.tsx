"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Progress } from "@repo/design-system/components/ui/progress";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  AlertTriangleIcon,
  BarChart3Icon,
  BrainCircuitIcon,
  Loader2Icon,
  RefreshCwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Trend = "increasing" | "stable" | "decreasing" | "improving" | "declining";
type Risk = "low" | "medium" | "high";
type Confidence = "low" | "medium" | "high";

interface AnalyticsResult {
  periodStart: string;
  periodEnd: string;
  metrics: {
    totalHours: number;
    totalCost: number;
    averageHoursPerEmployee: number;
    utilizationRate: number;
    turnoverRisk: Array<{
      employeeId: string;
      employeeName: string;
      riskLevel: Risk;
      indicators: string[];
    }>;
    topPerformers: Array<{
      employeeId: string;
      employeeName: string;
      score: number;
    }>;
    skillGaps: Array<{
      skillName: string;
      demand: number;
      availableCount: number;
      gap: number;
    }>;
  };
  trends: {
    costTrend: Trend;
    productivityTrend: Trend;
    overtimeTrend: Trend;
  };
}

interface OptimizationResult {
  scheduleId: string;
  optimizedAssignments: Array<{
    shiftId: string;
    recommendedEmployeeId: string;
    employeeName: string;
    confidence: Confidence;
    reasoning: string[];
    estimatedCost: number;
    riskFactors: string[];
  }>;
  summary: {
    totalShifts: number;
    assignedShifts: number;
    unassignedShifts: number;
    totalEstimatedCost: number;
    averageConfidence: number;
    skillCoverage: number;
    seniorityBalance: number;
  };
  warnings: string[];
  appliedStrategies: string[];
}

interface PredictionResult {
  employeeId: string;
  predictions: {
    productivity: {
      predictedScore: number;
      trend: "improving" | "stable" | "declining";
      factors: Array<{
        factor: string;
        impact: "positive" | "neutral" | "negative";
        weight: number;
      }>;
    } | null;
    attendance: {
      predictedAttendanceRate: number;
      riskLevel: Risk;
      riskFactors: string[];
    } | null;
    overtimeRisk: {
      riskLevel: Risk;
      projectedOvertimeHours: number;
      contributingFactors: string[];
    } | null;
    skillMatch: {
      overallMatchScore: number;
      trainingRecommendations: string[];
    } | null;
  };
  overallPerformanceScore: number;
  recommendations: string[];
}

interface OptimizationDashboardProps {
  readonly tenantId: string;
}

const riskTone: Record<Risk, string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

const confidenceTone: Record<Confidence, string> = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-rose-200 bg-rose-50 text-rose-700",
};

function TrendBadge({ trend }: { readonly trend: Trend }) {
  const isUp = trend === "increasing" || trend === "improving";
  const isDown = trend === "decreasing" || trend === "declining";
  const Icon = isUp ? TrendingUpIcon : isDown ? TrendingDownIcon : RefreshCwIcon;
  return (
    <Badge variant="outline" className="gap-1 capitalize">
      <Icon className="h-3 w-3" />
      {trend}
    </Badge>
  );
}

export function OptimizationDashboard(_props: OptimizationDashboardProps) {
  const [days, setDays] = useState(30);
  const [locationId, setLocationId] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (locationId) params.set("locationId", locationId);
      const res = await fetch(`/api/staff/workforce-analytics?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load analytics");
      }
      setAnalytics(json.data as AnalyticsResult);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load analytics"
      );
    } finally {
      setAnalyticsLoading(false);
    }
  }, [days, locationId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <Tabs defaultValue="analytics" className="space-y-6">
      <TabsList>
        <TabsTrigger value="analytics" className="gap-2">
          <BarChart3Icon className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="optimize" className="gap-2">
          <BrainCircuitIcon className="h-4 w-4" />
          Schedule Optimizer
        </TabsTrigger>
        <TabsTrigger value="predict" className="gap-2">
          <UsersIcon className="h-4 w-4" />
          Performance Prediction
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="period">Period (days)</Label>
                <Select
                  value={String(days)}
                  onValueChange={(v) => setDays(Number(v))}
                >
                  <SelectTrigger id="period" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="loc">Location ID (optional)</Label>
                <Input
                  id="loc"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  placeholder="All locations"
                  className="w-[260px]"
                />
              </div>
              <Button
                onClick={loadAnalytics}
                disabled={analyticsLoading}
                className="gap-2"
              >
                {analyticsLoading ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
        </Card>

        {analytics ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Total Hours"
                value={analytics.metrics.totalHours.toLocaleString()}
              />
              <MetricCard
                label="Total Cost"
                value={formatCurrency(analytics.metrics.totalCost)}
              />
              <MetricCard
                label="Avg Hours / Employee"
                value={analytics.metrics.averageHoursPerEmployee.toFixed(1)}
              />
              <MetricCard
                label="Utilization Rate"
                value={`${Math.round(analytics.metrics.utilizationRate * 100)}%`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Trends</CardTitle>
                <CardDescription>
                  First half vs second half of the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-6">
                <TrendRow label="Cost" trend={analytics.trends.costTrend} />
                <TrendRow
                  label="Productivity"
                  trend={analytics.trends.productivityTrend}
                />
                <TrendRow
                  label="Overtime"
                  trend={analytics.trends.overtimeTrend}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                    Turnover Risk
                  </CardTitle>
                  <CardDescription>Top 10 at-risk employees</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.metrics.turnoverRisk.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No elevated turnover risks detected.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {analytics.metrics.turnoverRisk.map((r) => (
                        <li
                          key={r.employeeId}
                          className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                        >
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {r.employeeName}
                            </p>
                            {r.indicators.length > 0 ? (
                              <p className="text-muted-foreground text-xs">
                                {r.indicators.join(" • ")}
                              </p>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className={`capitalize ${riskTone[r.riskLevel]}`}
                          >
                            {r.riskLevel}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                  <CardDescription>By weighted performance score</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics.metrics.topPerformers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No performance data for the selected period.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {analytics.metrics.topPerformers.map((p) => (
                        <li
                          key={p.employeeId}
                          className="flex items-center justify-between rounded-md border border-border p-3"
                        >
                          <p className="font-medium text-sm">{p.employeeName}</p>
                          <Badge variant="outline">{p.score}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Skill Gaps</CardTitle>
                <CardDescription>
                  Skills where demand exceeds available headcount
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.metrics.skillGaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No skill gaps detected for this period.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {analytics.metrics.skillGaps.map((g) => (
                      <li
                        key={g.skillName}
                        className="rounded-md border border-border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{g.skillName}</p>
                          <Badge variant="outline" className="text-rose-700">
                            Gap of {g.gap}
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs">
                          Demand {g.demand} • Available {g.availableCount}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="flex h-40 items-center justify-center">
              {analyticsLoading ? (
                <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <p className="text-muted-foreground text-sm">
                  No analytics data yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="optimize">
        <ScheduleOptimizer />
      </TabsContent>

      <TabsContent value="predict">
        <PerformancePredictor />
      </TabsContent>
    </Tabs>
  );
}

function MetricCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {label}
        </p>
        <p className="font-semibold text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}

function TrendRow({ label, trend }: { readonly label: string; readonly trend: Trend }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </p>
      <TrendBadge trend={trend} />
    </div>
  );
}

function ScheduleOptimizer() {
  const today = new Date();
  const oneWeek = new Date(today);
  oneWeek.setDate(oneWeek.getDate() + 7);

  const [scheduleId, setScheduleId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [startDate, setStartDate] = useState(today.toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(oneWeek.toISOString().slice(0, 10));
  const [maxLaborCost, setMaxLaborCost] = useState("");
  const [maxHoursPerEmployee, setMaxHoursPerEmployee] = useState("");
  const [minSkillCoverage, setMinSkillCoverage] = useState("");
  const [allowOvertime, setAllowOvertime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const submit = async () => {
    if (!(scheduleId && locationId && startDate && endDate)) {
      toast.error("Schedule, location, and date range are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/staff/optimize-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId,
          locationId,
          startDate,
          endDate,
          constraints: {
            maxLaborCost: maxLaborCost ? Number(maxLaborCost) : undefined,
            maxHoursPerEmployee: maxHoursPerEmployee
              ? Number(maxHoursPerEmployee)
              : undefined,
            minSkillCoverage: minSkillCoverage
              ? Number(minSkillCoverage)
              : undefined,
            allowOvertime,
            requireSeniorityBalance: true,
            preferFullAvailability: true,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Optimization failed");
      }
      setResult(json.data as OptimizationResult);
      toast.success("Schedule optimized");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Optimization failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Optimize Unassigned Shifts</CardTitle>
          <CardDescription>
            Run the AI optimizer over unassigned shifts in a schedule. Returns
            recommended employees with confidence and risk factors.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field
            label="Schedule ID"
            value={scheduleId}
            onChange={setScheduleId}
            placeholder="schedule UUID"
          />
          <Field
            label="Location ID"
            value={locationId}
            onChange={setLocationId}
            placeholder="location UUID"
          />
          <Field
            label="Start date"
            type="date"
            value={startDate}
            onChange={setStartDate}
          />
          <Field
            label="End date"
            type="date"
            value={endDate}
            onChange={setEndDate}
          />
          <Field
            label="Max labor cost (USD)"
            type="number"
            value={maxLaborCost}
            onChange={setMaxLaborCost}
            placeholder="optional"
          />
          <Field
            label="Max hours per employee"
            type="number"
            value={maxHoursPerEmployee}
            onChange={setMaxHoursPerEmployee}
            placeholder="optional"
          />
          <Field
            label="Min skill coverage (0-1)"
            type="number"
            value={minSkillCoverage}
            onChange={setMinSkillCoverage}
            placeholder="e.g. 0.8"
          />
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowOvertime}
                onChange={(e) => setAllowOvertime(e.target.checked)}
              />
              Allow overtime
            </label>
          </div>
          <div className="md:col-span-2">
            <Button onClick={submit} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuitIcon className="h-4 w-4" />
              )}
              Optimize Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Total Shifts"
              value={String(result.summary.totalShifts)}
            />
            <MetricCard
              label="Assigned"
              value={String(result.summary.assignedShifts)}
            />
            <MetricCard
              label="Unassigned"
              value={String(result.summary.unassignedShifts)}
            />
            <MetricCard
              label="Estimated Cost"
              value={formatCurrency(result.summary.totalEstimatedCost)}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Optimization Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MeterRow
                label="Average Confidence"
                value={result.summary.averageConfidence}
                max={100}
              />
              <MeterRow
                label="Skill Coverage"
                value={Math.round(result.summary.skillCoverage * 100)}
                max={100}
              />
              <MeterRow
                label="Seniority Balance"
                value={Math.round(result.summary.seniorityBalance * 100)}
                max={100}
              />
              {result.appliedStrategies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.appliedStrategies.map((s) => (
                    <Badge key={s} variant="outline" className="capitalize">
                      {s.replaceAll("_", " ")}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {result.warnings.length > 0 ? (
            <Card className="border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <AlertTriangleIcon className="h-4 w-4" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-amber-900 text-sm">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recommended Assignments</CardTitle>
              <CardDescription>
                {result.optimizedAssignments.length} shifts with recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.optimizedAssignments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No assignments generated.
                </p>
              ) : (
                <ul className="space-y-3">
                  {result.optimizedAssignments.map((a) => (
                    <li
                      key={a.shiftId}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{a.employeeName}</p>
                          <p className="text-muted-foreground text-xs">
                            Shift {a.shiftId.slice(0, 8)}… •{" "}
                            {formatCurrency(a.estimatedCost)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`capitalize ${confidenceTone[a.confidence]}`}
                        >
                          {a.confidence} confidence
                        </Badge>
                      </div>
                      {a.reasoning.length > 0 ? (
                        <p className="mt-2 text-muted-foreground text-xs">
                          {a.reasoning.join(" • ")}
                        </p>
                      ) : null}
                      {a.riskFactors.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.riskFactors.map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="text-rose-700 text-xs"
                            >
                              {r}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function PerformancePredictor() {
  const [employeeId, setEmployeeId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [horizon, setHorizon] = useState("30");
  const [metrics, setMetrics] = useState({
    productivity: true,
    attendance: true,
    overtime_risk: true,
    skill_match: true,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const toggle = (key: keyof typeof metrics) =>
    setMetrics((m) => ({ ...m, [key]: !m[key] }));

  const submit = async () => {
    const selected = (Object.keys(metrics) as Array<keyof typeof metrics>)
      .filter((k) => metrics[k]);
    if (!employeeId) {
      toast.error("Employee ID is required");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one metric");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/staff/predict-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          scheduleId: scheduleId || undefined,
          predictionHorizon: Number(horizon),
          metrics: selected,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Prediction failed");
      }
      setResult(json.data as PredictionResult);
      toast.success("Prediction generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Predict Employee Performance</CardTitle>
          <CardDescription>
            Forecast productivity, attendance, overtime risk, and skill match
            for an individual employee.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field
            label="Employee ID"
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="employee UUID"
          />
          <Field
            label="Schedule ID (optional)"
            value={scheduleId}
            onChange={setScheduleId}
            placeholder="schedule UUID"
          />
          <Field
            label="Prediction horizon (days)"
            type="number"
            value={horizon}
            onChange={setHorizon}
          />
          <div className="space-y-2">
            <Label>Metrics</Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(Object.keys(metrics) as Array<keyof typeof metrics>).map((k) => (
                <label
                  key={k}
                  className="flex items-center gap-2 capitalize"
                >
                  <input
                    type="checkbox"
                    checked={metrics[k]}
                    onChange={() => toggle(k)}
                  />
                  {k.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Button onClick={submit} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <UsersIcon className="h-4 w-4" />
              )}
              Run Prediction
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall Score</CardTitle>
              <CardDescription>
                Aggregate of selected predictions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeterRow
                label="Performance"
                value={result.overallPerformanceScore}
                max={100}
              />
              {result.recommendations.length > 0 ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                  {result.recommendations.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {result.predictions.productivity ? (
              <Card>
                <CardHeader>
                  <CardTitle>Productivity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MeterRow
                    label="Predicted score"
                    value={result.predictions.productivity.predictedScore}
                    max={100}
                  />
                  <TrendBadge trend={result.predictions.productivity.trend} />
                  <ul className="space-y-1 text-sm">
                    {result.predictions.productivity.factors.map((f) => (
                      <li key={f.factor} className="flex justify-between">
                        <span>{f.factor}</span>
                        <Badge variant="outline" className="capitalize">
                          {f.impact}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {result.predictions.attendance ? (
              <Card>
                <CardHeader>
                  <CardTitle>Attendance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MeterRow
                    label="Predicted rate"
                    value={Math.round(
                      result.predictions.attendance.predictedAttendanceRate *
                        100
                    )}
                    max={100}
                  />
                  <Badge
                    variant="outline"
                    className={`capitalize ${riskTone[result.predictions.attendance.riskLevel]}`}
                  >
                    {result.predictions.attendance.riskLevel} risk
                  </Badge>
                  {result.predictions.attendance.riskFactors.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {result.predictions.attendance.riskFactors.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {result.predictions.overtimeRisk ? (
              <Card>
                <CardHeader>
                  <CardTitle>Overtime Risk</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge
                    variant="outline"
                    className={`capitalize ${riskTone[result.predictions.overtimeRisk.riskLevel]}`}
                  >
                    {result.predictions.overtimeRisk.riskLevel}
                  </Badge>
                  <p className="text-sm">
                    Projected overtime:{" "}
                    <span className="font-medium">
                      {result.predictions.overtimeRisk.projectedOvertimeHours.toFixed(
                        1
                      )}{" "}
                      hours
                    </span>
                  </p>
                  {result.predictions.overtimeRisk.contributingFactors.length >
                  0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {result.predictions.overtimeRisk.contributingFactors.map(
                        (f) => (
                          <li key={f}>{f}</li>
                        )
                      )}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {result.predictions.skillMatch ? (
              <Card>
                <CardHeader>
                  <CardTitle>Skill Match</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MeterRow
                    label="Overall match"
                    value={result.predictions.skillMatch.overallMatchScore}
                    max={100}
                  />
                  {result.predictions.skillMatch.trainingRecommendations.length >
                  0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {result.predictions.skillMatch.trainingRecommendations.map(
                        (r) => (
                          <li key={r}>{r}</li>
                        )
                      )}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly type?: string;
  readonly placeholder?: string;
}) {
  const id = `f-${label.replaceAll(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function MeterRow({
  label,
  value,
  max,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(value)}</span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
