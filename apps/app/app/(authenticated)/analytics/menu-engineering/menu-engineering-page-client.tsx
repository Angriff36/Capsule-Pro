"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
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
  ArrowDown,
  ArrowUp,
  DollarSign,
  PieChart as PieChartIcon,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type {
  MenuEngineeringData,
  MenuItemAnalysis,
} from "@/app/lib/menu-engineering";
import {
  formatCurrency,
  formatPercent,
  getQuadrantInfo,
  useMenuEngineering,
} from "@/app/lib/menu-engineering";

const COLORS = {
  star: "#10b981",
  plowhorse: "#3b82f6",
  puzzle: "#f59e0b",
  dog: "#ef4444",
};

const MenuEngineeringSkeleton = () => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Analytics / Menu Engineering</MonoLabel>
          <DisplayHeading>Menu Engineering</DisplayHeading>
          <CommandBandLede>
            Analyze contribution margins, popularity, and optimize your menu.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Performance Overview
        </h2>
        <div className="grid gap-6 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="mt-2 h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-medium text-muted-foreground text-sm">
          Menu Analysis
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton className="h-12 w-full" key={i} />
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </OperationalColumn>
  </PageCanvas>
);

const ErrorState = ({ error }: { error: Error }) => (
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <div className="space-y-4">
          <MonoLabel tone="dark">Analytics / Menu Engineering</MonoLabel>
          <DisplayHeading>Menu Engineering</DisplayHeading>
          <CommandBandLede>
            Analyze contribution margins, popularity, and optimize your menu.
          </CommandBandLede>
        </div>
      </CommandBandHeader>
    </CommandBand>

    <OperationalColumn>
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="flex items-center gap-2 p-6">
          <AlertCircle className="size-5 text-destructive" />
          <p className="text-destructive-foreground text-sm">
            Failed to load menu engineering data. {error.message}
          </p>
        </CardContent>
      </Card>
    </OperationalColumn>
  </PageCanvas>
);

interface MetricCardProps {
  change?: number;
  format?: "currency" | "percent" | "number";
  icon: React.ReactNode;
  title: string;
  value: string | number;
}

const MetricCard = ({
  title,
  value,
  change,
  icon,
  format = "number",
}: MetricCardProps) => {
  const formatValue = (val: string | number) => {
    const numValue = typeof val === "string" ? Number.parseFloat(val) : val;
    if (isNaN(numValue)) {
      return "N/A";
    }

    switch (format) {
      case "currency":
        return formatCurrency(numValue);
      case "percent":
        return formatPercent(numValue);
      default:
        return numValue.toLocaleString();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-muted-foreground text-sm">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{formatValue(value)}</div>
        {change !== undefined && (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${
              change >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(change)}% from avg
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface QuadrantDistributionChartProps {
  distribution: MenuEngineeringData["quadrantDistribution"];
}

const QuadrantDistributionChart = ({
  distribution,
}: QuadrantDistributionChartProps) => {
  const data = [
    { name: "Star", value: distribution.star, color: COLORS.star },
    {
      name: "Plowhorse",
      value: distribution.plowhorse,
      color: COLORS.plowhorse,
    },
    { name: "Puzzle", value: distribution.puzzle, color: COLORS.puzzle },
    { name: "Dog", value: distribution.dog, color: COLORS.dog },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        No menu item data available
      </div>
    );
  }

  return (
    <ResponsiveContainer height={300} width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={60}
          label={({ name, percent }) =>
            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          outerRadius={100}
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell fill={entry.color} key={`cell-${index}`} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload?.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-lg">
                  <p className="font-semibold">{payload[0].name}</p>
                  <p className="text-muted-foreground text-sm">
                    {payload[0].value} items
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

interface MenuItemTableRowProps {
  avgMargin: number;
  item: MenuItemAnalysis;
}

const MenuItemTableRow = ({ item, avgMargin }: MenuItemTableRowProps) => {
  const quadrantInfo = getQuadrantInfo(item.quadrant);
  const marginVsAverage = item.marginPercent - avgMargin;

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-3 align-middle">
        <div className="font-medium">{item.dishName}</div>
        {item.category && (
          <div className="text-muted-foreground text-xs">{item.category}</div>
        )}
      </td>
      <td className="p-3 text-right align-middle">
        {formatCurrency(item.totalRevenue)}
      </td>
      <td className="p-3 text-right align-middle">
        <div className="font-medium">{formatPercent(item.marginPercent)}</div>
        {marginVsAverage !== 0 && (
          <div
            className={`flex items-center justify-end gap-1 text-xs ${
              marginVsAverage >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {marginVsAverage >= 0 ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(marginVsAverage).toFixed(1)}pp
          </div>
        )}
      </td>
      <td className="p-3 text-center align-middle">
        <div className="flex items-center justify-center gap-2">
          <div
            className="relative h-2 w-16 rounded-full bg-muted"
            title={`Popularity: ${item.popularityScore}/100`}
          >
            <div
              className={`h-2 rounded-full ${
                item.popularityScore >= 70
                  ? "bg-emerald-500"
                  : item.popularityScore >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${item.popularityScore}%` }}
            />
          </div>
          <span className="w-8 text-muted-foreground text-xs">
            {item.popularityScore}
          </span>
        </div>
      </td>
      <td className="p-3 text-center align-middle">
        <Badge className={quadrantInfo.bgColor}>
          <span className={quadrantInfo.color}>{quadrantInfo.name}</span>
        </Badge>
      </td>
      <td className="p-3 text-right align-middle">
        {formatCurrency(item.contributionMargin)}
      </td>
    </tr>
  );
};

interface RecommendationsPanelProps {
  quadrantDistribution: MenuEngineeringData["quadrantDistribution"];
  recommendations: string[];
}

const RecommendationsPanel = ({
  recommendations,
  quadrantDistribution,
}: RecommendationsPanelProps) => {
  const totalItems =
    quadrantDistribution.star +
    quadrantDistribution.plowhorse +
    quadrantDistribution.puzzle +
    quadrantDistribution.dog;

  if (totalItems === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5" />
          <CardTitle>Strategic Recommendations</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Quadrant Summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <div className="size-3 rounded-full bg-emerald-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">Stars</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.star} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
              <div className="size-3 rounded-full bg-blue-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">Plowhorses</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.plowhorse} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <div className="size-3 rounded-full bg-amber-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">Puzzles</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.puzzle} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/30">
              <div className="size-3 rounded-full bg-red-500" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm">Dogs</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.dog} items
                </div>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          <div className="space-y-2 pt-2">
            {recommendations.map((recommendation, index) => (
              <div
                className="flex items-start gap-2 rounded-lg bg-muted/50 p-3"
                key={index}
              >
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-xs">
                  {index + 1}
                </div>
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <PieChartIcon className="mb-4 size-16 text-muted-foreground/50" />
    <h3 className="mb-2 font-semibold text-lg">No Menu Data Available</h3>
    <p className="max-w-md text-muted-foreground text-sm">
      Start adding dishes to your events to see menu engineering insights. The
      analysis will show contribution margins, popularity scores, and strategic
      recommendations.
    </p>
  </div>
);

const MenuEngineeringPageClient = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "12m">("30d");
  const { data, isLoading, error, refetch } = useMenuEngineering({
    period,
    enabled: true,
  });

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "7d" | "30d" | "90d" | "12m");
    refetch();
  };

  if (isLoading) {
    return <MenuEngineeringSkeleton />;
  }

  if (error || !data) {
    return <ErrorState error={error || new Error("No data available")} />;
  }

  const hasData = data.menuItems.length > 0;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Analytics / Menu Engineering</MonoLabel>
            <DisplayHeading>Menu Engineering</DisplayHeading>
            <CommandBandLede>
              Analyze contribution margins, popularity, and optimize your menu.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Select onValueChange={handlePeriodChange} value={period}>
              <SelectTrigger className="w-[180px] border-white/25 bg-transparent text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </CommandBandActions>
        </CommandBandHeader>
      </CommandBand>

      <OperationalColumn>
        {hasData ? (
          <>
            {/* Performance Overview */}
            <section className="space-y-4">
              <SectionHeader title="Performance Overview" />
              <div className="grid gap-6 lg:grid-cols-4">
                <MetricCard
                  format="currency"
                  icon={<DollarSign className="size-4" />}
                  title="Total Revenue"
                  value={data.summary.totalRevenue}
                />
                <MetricCard
                  format="currency"
                  icon={<TrendingUp className="size-4" />}
                  title="Contribution Margin"
                  value={data.summary.totalContributionMargin}
                />
                <MetricCard
                  format="percent"
                  icon={<PercentIcon />}
                  title="Average Margin"
                  value={data.summary.averageMarginPercent}
                />
                <MetricCard
                  format="number"
                  icon={<OrderIcon />}
                  title="Total Orders"
                  value={data.summary.totalOrders}
                />
              </div>
            </section>

            {/* Main Analysis Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Quadrant Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Menu Matrix Distribution</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Distribution of items by performance quadrant
                  </p>
                </CardHeader>
                <CardContent>
                  <QuadrantDistributionChart
                    distribution={data.quadrantDistribution}
                  />
                </CardContent>
              </Card>

              {/* Recommendations */}
              <RecommendationsPanel
                quadrantDistribution={data.quadrantDistribution}
                recommendations={data.recommendations}
              />
            </div>

            {/* Menu Items Table */}
            <section className="space-y-4">
              <SectionHeader title="Menu Item Analysis" />
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-left font-medium">Dish</th>
                          <th className="p-3 text-right font-medium">
                            Revenue
                          </th>
                          <th className="p-3 text-right font-medium">Margin</th>
                          <th className="p-3 text-center font-medium">
                            Popularity
                          </th>
                          <th className="p-3 text-center font-medium">
                            Quadrant
                          </th>
                          <th className="p-3 text-right font-medium">
                            Contribution
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.menuItems.map((item) => (
                          <MenuItemTableRow
                            avgMargin={data.summary.averageMarginPercent}
                            item={item}
                            key={item.dishId}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Category Analysis */}
            <CategoryAnalysisSection categoryAnalysis={data.categoryAnalysis} />
          </>
        ) : (
          <EmptyState />
        )}
      </OperationalColumn>
    </PageCanvas>
  );
};

function CategoryAnalysisSection({
  categoryAnalysis,
}: {
  categoryAnalysis: MenuEngineeringData["categoryAnalysis"];
}) {
  if (categoryAnalysis.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader title="Category Analysis" />
      <CategoryAnalysisTable categoryAnalysis={categoryAnalysis} />
    </section>
  );
}

interface CategoryAnalysisTableProps {
  categoryAnalysis: MenuEngineeringData["categoryAnalysis"];
}

const CategoryAnalysisTable = ({
  categoryAnalysis,
}: CategoryAnalysisTableProps) => {
  if (categoryAnalysis.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium">Category</th>
                <th className="p-3 text-right font-medium">Items</th>
                <th className="p-3 text-right font-medium">Orders</th>
                <th className="p-3 text-right font-medium">Revenue</th>
                <th className="p-3 text-right font-medium">Margin</th>
                <th className="p-3 text-left font-medium">Top Dish</th>
              </tr>
            </thead>
            <tbody>
              {categoryAnalysis.map((category, index) => (
                <tr className="border-b hover:bg-muted/50" key={index}>
                  <td className="p-3 font-medium">{category.category}</td>
                  <td className="p-3 text-right">{category.totalDishes}</td>
                  <td className="p-3 text-right">{category.totalOrders}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(category.totalRevenue)}
                  </td>
                  <td className="p-3 text-right">
                    <Badge
                      variant={
                        category.averageMarginPercent >= 30
                          ? "default"
                          : category.averageMarginPercent >= 20
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {formatPercent(category.averageMarginPercent)}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {category.topDish || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const PercentIcon = () => (
  <svg
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 12a8 8 0 0 1 8-8" />
    <path d="M4 12a8 8 0 0 0 8 8" />
    <path d="M20 4a8 8 0 0 0-8 8" />
    <path d="M20 12a8 8 0 0 1-8 8" />
  </svg>
);

const OrderIcon = () => (
  <svg
    fill="none"
    height="16"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export default MenuEngineeringPageClient;
