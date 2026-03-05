"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Minus,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const severityOrder = ["critical", "high", "medium", "low"] as const;
const categoryIcons: Record<string, React.ElementType> = {
  throughput: TrendingUp,
  capacity: Users,
  efficiency: Zap,
  quality: CheckCircle2,
  resource: Package,
  process: Wrench,
};

const severityColors: Record<string, string> = {
  critical: "text-destructive bg-destructive/10 border-destructive/20",
  high: "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800",
  medium:
    "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800",
  low: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800",
};

interface Bottleneck {
  id: string;
  category: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  affectedEntity: {
    type: string;
    id: string;
    name: string;
  } | null;
  metrics: {
    currentValue: number;
    thresholdValue: number;
    percentOverThreshold: number;
    trend: string;
  };
  suggestion: {
    id: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    reasoning: string;
    estimatedImpact: {
      area: string;
      improvement: string;
      confidence: string;
    };
    implementation: {
      effort: string;
      timeframe: string;
    };
    steps: string[];
    aiGenerated: boolean;
  } | null;
  detectedAt: string;
}

interface BottleneckAnalysisResponse {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  healthScore: {
    overall: number;
    byCategory: Record<string, number>;
  };
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
  bottlenecks: Bottleneck[];
  analyzedAt: string;
}

const AnalyticsBottlenecksPage = () => {
  const [data, setData] = useState<BottleneckAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    async function fetchBottlenecks() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          period: selectedPeriod,
          ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
        });

        const response = await fetch(`/api/analytics/bottlenecks?${params}`);

        if (!response.ok) {
          throw new Error("Failed to fetch bottleneck analysis");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBottlenecks();
  }, [selectedPeriod, selectedCategory]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Operational Bottlenecks
          </h1>
          <p className="text-muted-foreground">
            AI-powered detection of operational bottlenecks and improvement
            suggestions.
          </p>
        </div>
        <Separator />
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Operational Bottlenecks
          </h1>
          <p className="text-muted-foreground">
            AI-powered detection of operational bottlenecks and improvement
            suggestions.
          </p>
        </div>
        <Separator />
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-2 p-6">
            <AlertCircle className="size-5 text-destructive" />
            <p className="text-sm text-destructive-foreground">
              {error ||
                "Failed to load bottleneck analysis. Please try again later."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedBottlenecks = [...data.bottlenecks].sort((a, b) => {
    const aIndex = severityOrder.indexOf(a.severity as any);
    const bIndex = severityOrder.indexOf(b.severity as any);
    return aIndex - bIndex;
  });

  const categories = ["all", ...Object.keys(data.summary.byCategory || {})];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">
          Operational Bottlenecks
        </h1>
        <p className="text-muted-foreground">
          AI-powered detection of operational bottlenecks and improvement
          suggestions.
        </p>
      </div>
      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="period">
            Period:
          </label>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            id="period"
            onChange={(e) => setSelectedPeriod(e.target.value)}
            value={selectedPeriod}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="category">
            Category:
          </label>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            id="category"
            onChange={(e) => setSelectedCategory(e.target.value)}
            value={selectedCategory}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Health Score Overview */}
      <div className="grid gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span
                className={`text-3xl font-bold ${
                  data.healthScore.overall >= 80
                    ? "text-emerald-600"
                    : data.healthScore.overall >= 60
                      ? "text-yellow-600"
                      : "text-destructive"
                }`}
              >
                {data.healthScore.overall}
              </span>
              <span className="text-muted-foreground text-sm mb-1">/100</span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {data.healthScore.overall >= 80
                ? "Excellent"
                : data.healthScore.overall >= 60
                  ? "Good"
                  : data.healthScore.overall >= 40
                    ? "Fair"
                    : "Poor"}{" "}
              operational health
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Bottlenecks Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{data.summary.total}</span>
              <span className="text-muted-foreground text-sm mb-1">issues</span>
            </div>
            <div className="flex gap-1 mt-2">
              {data.summary.bySeverity?.critical > 0 && (
                <Badge className={severityColors.critical}>
                  {data.summary.bySeverity.critical} Critical
                </Badge>
              )}
              {data.summary.bySeverity?.high > 0 && (
                <Badge className={severityColors.high}>
                  {data.summary.bySeverity.high} High
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Trending Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {
                  sortedBottlenecks.filter(
                    (b) => b.metrics.trend === "worsening"
                  ).length
                }
              </span>
              <span className="text-destructive text-sm mb-1">worsening</span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {
                sortedBottlenecks.filter((b) => b.metrics.trend === "improving")
                  .length
              }{" "}
              improving
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {
                  sortedBottlenecks.filter((b) => b.suggestion?.aiGenerated)
                    .length
                }
              </span>
              <span className="text-muted-foreground text-sm mb-1">
                generated
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              AI-powered improvement recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottlenecks List */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Detected Bottlenecks
        </h2>

        {sortedBottlenecks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-12">
              <CheckCircle2 className="size-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-semibold">No bottlenecks detected</h3>
              <p className="text-muted-foreground text-sm mt-2">
                Your operations are running smoothly. Keep up the good work!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedBottlenecks.map((bottleneck) => {
              const CategoryIcon =
                categoryIcons[bottleneck.category] || AlertTriangle;
              const trendIcon =
                bottleneck.metrics.trend === "improving"
                  ? TrendingDown
                  : bottleneck.metrics.trend === "worsening"
                    ? TrendingUp
                    : Minus;
              const trendColor =
                bottleneck.metrics.trend === "improving"
                  ? "text-emerald-500"
                  : bottleneck.metrics.trend === "worsening"
                    ? "text-destructive"
                    : "text-muted-foreground";

              return (
                <Card
                  className={`border-l-4 ${
                    bottleneck.severity === "critical"
                      ? "border-l-destructive"
                      : bottleneck.severity === "high"
                        ? "border-l-orange-500"
                        : bottleneck.severity === "medium"
                          ? "border-l-yellow-500"
                          : "border-l-blue-500"
                  }`}
                  key={bottleneck.id}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-4">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              bottleneck.severity === "critical"
                                ? "bg-destructive/10 text-destructive"
                                : bottleneck.severity === "high"
                                  ? "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
                                  : bottleneck.severity === "medium"
                                    ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                                    : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                            }`}
                          >
                            <CategoryIcon className="size-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {bottleneck.title}
                              </h3>
                              <Badge
                                className={severityColors[bottleneck.severity]}
                              >
                                {bottleneck.severity}
                              </Badge>
                              <Badge variant="outline">
                                {bottleneck.category}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm mt-1">
                              {bottleneck.description}
                            </p>
                            {bottleneck.affectedEntity && (
                              <p className="text-muted-foreground text-xs mt-1">
                                Affected: {bottleneck.affectedEntity.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                              Current Value
                            </p>
                            <p className="font-semibold">
                              {bottleneck.metrics.currentValue.toFixed(1)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                              Threshold
                            </p>
                            <p className="font-semibold">
                              {bottleneck.metrics.thresholdValue.toFixed(1)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">
                              Trend
                            </p>
                            <div className="flex items-center gap-1">
                              <trendIcon className={`size-4 ${trendColor}`} />
                              <span
                                className={`font-medium capitalize ${trendColor}`}
                              >
                                {bottleneck.metrics.trend}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* AI Suggestion */}
                        {bottleneck.suggestion && (
                          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="size-4 text-amber-500" />
                              <span className="font-medium text-sm">
                                AI Suggestion
                              </span>
                              {bottleneck.suggestion.aiGenerated && (
                                <Badge className="text-xs" variant="secondary">
                                  AI Generated
                                </Badge>
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold">
                                {bottleneck.suggestion.title}
                              </h4>
                              <p className="text-muted-foreground text-sm mt-1">
                                {bottleneck.suggestion.description}
                              </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Expected Impact:{" "}
                                </span>
                                <span className="font-medium">
                                  {
                                    bottleneck.suggestion.estimatedImpact
                                      .improvement
                                  }
                                </span>
                                <span className="text-muted-foreground text-xs ml-1">
                                  (
                                  {
                                    bottleneck.suggestion.estimatedImpact
                                      .confidence
                                  }{" "}
                                  confidence)
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Implementation:{" "}
                                </span>
                                <span className="font-medium">
                                  {bottleneck.suggestion.implementation.effort}{" "}
                                  effort,{" "}
                                  {
                                    bottleneck.suggestion.implementation
                                      .timeframe
                                  }
                                </span>
                              </div>
                            </div>
                            {bottleneck.suggestion.steps &&
                              bottleneck.suggestion.steps.length > 0 && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-primary list-none flex items-center gap-1">
                                    <span>View implementation steps</span>
                                    <span className="transition group-open:rotate-90">
                                      ›
                                    </span>
                                  </summary>
                                  <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    {bottleneck.suggestion.steps.map(
                                      (step, i) => (
                                        <li className="flex gap-2" key={i}>
                                          <span className="font-medium text-primary">
                                            {i + 1}.
                                          </span>
                                          <span>{step}</span>
                                        </li>
                                      )
                                    )}
                                  </ol>
                                </details>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsBottlenecksPage;
