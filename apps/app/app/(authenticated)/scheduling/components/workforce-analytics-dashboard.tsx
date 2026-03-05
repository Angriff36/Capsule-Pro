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
import {
  AlertTriangle,
  Award,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface WorkforceAnalyticsResult {
  periodStart: Date;
  periodEnd: Date;
  metrics: {
    totalHours: number;
    totalCost: number;
    averageHoursPerEmployee: number;
    utilizationRate: number;
    turnoverRisk: Array<{
      employeeId: string;
      employeeName: string;
      riskLevel: "low" | "medium" | "high";
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
    costTrend: "increasing" | "stable" | "decreasing";
    productivityTrend: "improving" | "stable" | "declining";
    overtimeTrend: "increasing" | "stable" | "decreasing";
  };
}

interface WorkforceAnalyticsDashboardProps {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function WorkforceAnalyticsDashboard({
  locationId,
  startDate: propsStartDate,
  endDate: propsEndDate,
}: WorkforceAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<WorkforceAnalyticsResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to last 30 days if not provided
  const endDate = propsEndDate || new Date();
  const startDate =
    propsStartDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  useEffect(() => {
    fetchAnalytics();
  }, [locationId, startDate, endDate]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(locationId && { locationId }),
      });

      const response = await fetch(
        `/api/staff/workforce-ai/analytics?${params}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "decreasing":
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
      case "improving":
        return "text-green-600 bg-green-50 border-green-200";
      case "decreasing":
      case "declining":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workforce Analytics</h2>
          <p className="text-gray-600">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        <Button disabled={isLoading} onClick={fetchAnalytics} variant="outline">
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          Loading analytics...
        </div>
      )}

      {analytics && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Key Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Hours</CardDescription>
              <CardTitle className="text-3xl">
                {Math.round(analytics.metrics.totalHours)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                Avg per employee:{" "}
                {Math.round(analytics.metrics.averageHoursPerEmployee)}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Cost</CardDescription>
              <CardTitle className="text-3xl">
                ${analytics.metrics.totalCost.toFixed(0)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {getTrendIcon(analytics.trends.costTrend)}
                <span
                  className={`text-sm capitalize ${getTrendColor(analytics.trends.costTrend)}`}
                >
                  {analytics.trends.costTrend}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Utilization Rate</CardDescription>
              <CardTitle className="text-3xl">
                {Math.round(analytics.metrics.utilizationRate * 100)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                Active workforce engagement
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Productivity Trend</CardDescription>
              <CardTitle className="text-xl capitalize flex items-center gap-2">
                {getTrendIcon(analytics.trends.productivityTrend)}
                {analytics.trends.productivityTrend}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                Overtime:{" "}
                <span
                  className={`capitalize ${getTrendColor(analytics.trends.overtimeTrend)}`}
                >
                  {analytics.trends.overtimeTrend}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.metrics.topPerformers.length === 0 ? (
                <div className="text-gray-500 text-sm">
                  No performer data available
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.metrics.topPerformers
                    .slice(0, 5)
                    .map((performer, i) => (
                      <div
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        key={performer.employeeId}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-400">
                            #{i + 1}
                          </span>
                          <span className="font-medium">
                            {performer.employeeName}
                          </span>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-300">
                          {performer.score} pts
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Turnover Risks */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Turnover Risk Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.metrics.turnoverRisk.length === 0 ? (
                <div className="text-green-600 text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  No significant turnover risks detected
                </div>
              ) : (
                <div className="space-y-2">
                  {analytics.metrics.turnoverRisk.map((risk) => (
                    <div
                      className="flex items-start justify-between p-2 border rounded"
                      key={risk.employeeId}
                    >
                      <div>
                        <div className="font-medium">{risk.employeeName}</div>
                        <div className="text-xs text-gray-500">
                          {risk.indicators.slice(0, 2).join(", ")}
                        </div>
                      </div>
                      <Badge
                        className={getRiskColor(risk.riskLevel)}
                        variant="outline"
                      >
                        {risk.riskLevel} risk
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Skill Gap Analysis
              </CardTitle>
              <CardDescription>
                Skills with demand exceeding available coverage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.metrics.skillGaps.length === 0 ? (
                <div className="text-green-600 text-sm">
                  No significant skill gaps detected
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {analytics.metrics.skillGaps.map((gap) => (
                    <div className="p-3 border rounded-lg" key={gap.skillName}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{gap.skillName}</span>
                        <Badge
                          className="text-red-600 bg-red-50 border-red-200"
                          variant="outline"
                        >
                          Gap: {gap.gap}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Demand: {gap.demand} | Available: {gap.availableCount}
                      </div>
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${Math.min((gap.gap / gap.demand) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
