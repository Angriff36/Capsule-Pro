"use client";

import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
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
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
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
import { useMemo, useState } from "react";
import { type BottleneckItem, useBottlenecks } from "@/app/lib/bottlenecks";

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

const BottleneckCard = ({ bottleneck }: { bottleneck: BottleneckItem }) => {
  const CategoryIcon = categoryIcons[bottleneck.category] ?? AlertTriangle;
  const TrendIcon =
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
    >
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2">
            <CategoryIcon className="size-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-lg">{bottleneck.title}</h3>
              <Badge className={severityColors[bottleneck.severity]}>
                {bottleneck.severity}
              </Badge>
              <Badge variant="outline">{bottleneck.category}</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {bottleneck.description}
            </p>
            {bottleneck.affectedEntity ? (
              <p className="text-muted-foreground text-xs">
                Affected: {bottleneck.affectedEntity.name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground text-xs">Current</p>
            <p className="font-semibold">
              {bottleneck.metrics.currentValue.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Threshold</p>
            <p className="font-semibold">
              {bottleneck.metrics.thresholdValue.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Trend</p>
            <div className="flex items-center gap-1">
              <TrendIcon className={`size-4 ${trendColor}`} />
              <span className={`font-medium capitalize ${trendColor}`}>
                {bottleneck.metrics.trend}
              </span>
            </div>
          </div>
        </div>

        {bottleneck.suggestion ? (
          <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4 text-amber-500" />
              <span className="font-medium text-sm">Suggestion</span>
              {bottleneck.suggestion.aiGenerated ? (
                <Badge className="text-xs" variant="secondary">
                  AI
                </Badge>
              ) : null}
            </div>
            <div>
              <h4 className="font-semibold">{bottleneck.suggestion.title}</h4>
              <p className="mt-1 text-muted-foreground text-sm">
                {bottleneck.suggestion.description}
              </p>
            </div>
            {bottleneck.suggestion.steps &&
            bottleneck.suggestion.steps.length > 0 ? (
              <ol className="space-y-1 text-muted-foreground text-sm">
                {bottleneck.suggestion.steps.map((step, index) => (
                  <li className="flex gap-2" key={step}>
                    <span className="font-medium text-primary">
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default function BottlenecksPageClient() {
  const [period, setPeriod] = useState("30d");
  const [category, setCategory] = useState("all");
  const { data, isLoading, error } = useBottlenecks({ period, category });

  const sortedBottlenecks = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data.bottlenecks].sort((a, b) => {
      const aIndex = severityOrder.indexOf(
        a.severity as (typeof severityOrder)[number]
      );
      const bIndex = severityOrder.indexOf(
        b.severity as (typeof severityOrder)[number]
      );
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }, [data]);

  const categories = useMemo(() => {
    if (!data) {
      return ["all"];
    }
    return ["all", ...Object.keys(data.summary.byCategory)];
  }, [data]);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Analytics / Bottlenecks</MonoLabel>
            <DisplayHeading>Operational Bottlenecks</DisplayHeading>
            <CommandBandLede>
              Detect throughput, capacity, and process bottlenecks with
              improvement suggestions.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        <div className="flex flex-wrap gap-4">
          <Select onValueChange={setPeriod} value={period}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setCategory} value={category}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all" ? "All categories" : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {error ? (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="flex items-center gap-2 p-6">
              <AlertCircle className="size-5 text-destructive" />
              <p className="text-destructive-foreground text-sm">
                {error.message}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-medium text-sm">
                    Health score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-3xl">
                    {data.healthScore.overall}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-medium text-sm">
                    Issues detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-3xl">{data.summary.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-medium text-sm">
                    Worsening
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-3xl">
                    {
                      sortedBottlenecks.filter(
                        (item) => item.metrics.trend === "worsening"
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-medium text-sm">
                    AI suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold text-3xl">
                    {
                      sortedBottlenecks.filter(
                        (item) => item.suggestion?.aiGenerated
                      ).length
                    }
                  </p>
                </CardContent>
              </Card>
            </div>

            <section className="space-y-4">
              <h2 className="font-medium text-muted-foreground text-sm">
                Detected bottlenecks
              </h2>
              {sortedBottlenecks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center p-12 text-center">
                    <CheckCircle2 className="mb-4 size-12 text-emerald-500" />
                    <h3 className="font-semibold text-lg">
                      No bottlenecks detected
                    </h3>
                    <p className="mt-2 text-muted-foreground text-sm">
                      Operations look healthy for the selected period.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sortedBottlenecks.map((bottleneck) => (
                    <BottleneckCard
                      bottleneck={bottleneck}
                      key={bottleneck.id}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </OperationalColumn>
    </PageCanvas>
  );
}
