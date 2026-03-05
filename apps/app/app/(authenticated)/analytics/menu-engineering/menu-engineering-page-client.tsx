"use client";

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
import { Separator } from "@repo/design-system/components/ui/separator";
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
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Menu Engineering</h1>
      <p className="text-muted-foreground">
        Analyze contribution margins, popularity, and optimize your menu.
      </p>
    </div>
    <Separator />

    <section className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
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
      <h2 className="text-sm font-medium text-muted-foreground">
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
  </div>
);

const ErrorState = ({ error }: { error: Error }) => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-3xl font-bold tracking-tight">Menu Engineering</h1>
      <p className="text-muted-foreground">
        Analyze contribution margins, popularity, and optimize your menu.
      </p>
    </div>
    <Separator />

    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="flex items-center gap-2 p-6">
        <AlertCircle className="size-5 text-destructive" />
        <p className="text-sm text-destructive-foreground">
          Failed to load menu engineering data. {error.message}
        </p>
      </CardContent>
    </Card>
  </div>
);

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  format?: "currency" | "percent" | "number";
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
    if (isNaN(numValue)) return "N/A";

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
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <p
            className={`text-xs flex items-center gap-1 mt-1 ${
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
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
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
            `${name} ${(percent * 100).toFixed(0)}%`
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
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border rounded-lg shadow-lg p-2">
                  <p className="font-semibold">{payload[0].name}</p>
                  <p className="text-sm text-muted-foreground">
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
  item: MenuItemAnalysis;
  avgMargin: number;
}

const MenuItemTableRow = ({ item, avgMargin }: MenuItemTableRowProps) => {
  const quadrantInfo = getQuadrantInfo(item.quadrant);
  const marginVsAverage = item.marginPercent - avgMargin;

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      <td className="p-3 align-middle">
        <div className="font-medium">{item.dishName}</div>
        {item.category && (
          <div className="text-muted-foreground text-xs">{item.category}</div>
        )}
      </td>
      <td className="p-3 align-middle text-right">
        {formatCurrency(item.totalRevenue)}
      </td>
      <td className="p-3 align-middle text-right">
        <div className="font-medium">{formatPercent(item.marginPercent)}</div>
        {marginVsAverage !== 0 && (
          <div
            className={`text-xs flex items-center justify-end gap-1 ${
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
      <td className="p-3 align-middle text-center">
        <div className="flex items-center justify-center gap-2">
          <div
            className="w-16 bg-muted rounded-full h-2 relative"
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
          <span className="text-xs text-muted-foreground w-8">
            {item.popularityScore}
          </span>
        </div>
      </td>
      <td className="p-3 align-middle text-center">
        <Badge className={quadrantInfo.bgColor}>
          <span className={quadrantInfo.color}>{quadrantInfo.name}</span>
        </Badge>
      </td>
      <td className="p-3 align-middle text-right">
        {formatCurrency(item.contributionMargin)}
      </td>
    </tr>
  );
};

interface RecommendationsPanelProps {
  recommendations: string[];
  quadrantDistribution: MenuEngineeringData["quadrantDistribution"];
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <div className="size-3 rounded-full bg-emerald-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Stars</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.star} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <div className="size-3 rounded-full bg-blue-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Plowhorses</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.plowhorse} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <div className="size-3 rounded-full bg-amber-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Puzzles</div>
                <div className="text-muted-foreground text-xs">
                  {quadrantDistribution.puzzle} items
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <div className="size-3 rounded-full bg-red-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">Dogs</div>
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
                className="flex items-start gap-2 p-3 rounded-lg bg-muted/50"
                key={index}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0 mt-0.5">
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

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <PieChartIcon className="size-16 text-muted-foreground/50 mb-4" />
    <h3 className="text-lg font-semibold mb-2">No Menu Data Available</h3>
    <p className="text-muted-foreground text-sm max-w-md">
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
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Menu Engineering
          </h1>
          <p className="text-muted-foreground">
            Analyze contribution margins, popularity, and optimize your menu.
          </p>
        </div>
        <Select onValueChange={handlePeriodChange} value={period}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="12m">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />

      {hasData ? (
        <>
          {/* Performance Overview */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Performance Overview
            </h2>
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
                <p className="text-sm text-muted-foreground">
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
            <h2 className="text-sm font-medium text-muted-foreground">
              Menu Item Analysis
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">Dish</th>
                        <th className="p-3 text-right font-medium">Revenue</th>
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
          {data.categoryAnalysis.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                Category Analysis
              </h2>
              <CategoryAnalysisTable categoryAnalysis={data.categoryAnalysis} />
            </section>
          )}
        </>
      ) : (
        <EmptyState />
      )}
    </div>
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
