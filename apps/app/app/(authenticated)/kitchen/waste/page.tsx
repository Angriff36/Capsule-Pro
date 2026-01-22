import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@capsule/ui/card";
import { Skeleton } from "@capsule/ui/skeleton";
import { Trash2, TrendingUp, BarChart3 } from "lucide-react";
import { WasteEntriesClient } from "./waste-entries-client";
import { WasteStatsCards } from "./waste-stats-cards";

export const dynamic = "force-dynamic";

export default function WasteTrackingPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waste Tracking</h1>
          <p className="text-muted-foreground">
            Log food waste to identify reduction opportunities and cost savings
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <Suspense fallback={<WasteStatsSkeleton />}>
        <WasteStatsCards />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Waste Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Log Waste Entry
            </CardTitle>
            <CardDescription>
              Record food waste with reason and quantity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<WasteFormSkeleton />}>
              <WasteEntriesClient />
            </Suspense>
          </CardContent>
        </Card>

        {/* Reports & Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Waste Trends
            </CardTitle>
            <CardDescription>
              View waste analytics and reduction opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<WasteTrendsSkeleton />}>
              <WasteTrendsView />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Waste Reports
          </CardTitle>
          <CardDescription>
            Detailed breakdown by item, reason, location, and date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<WasteReportsSkeleton />}>
            <WasteReportsView />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

// Skeleton loaders
function WasteStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WasteFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

function WasteTrendsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function WasteReportsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// Client components for data fetching
async function WasteTrendsView() {
  const trendsResponse = await fetch(
    `/api/kitchen/waste/trends?period=30d&groupBy=day`
  );
  const trends = await trendsResponse.json();

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {trends.trends.summary.totalEntries} entries in the last 30 days
      </div>
      <div className="space-y-2">
        {trends.trends.topReasons.map((item: any) => (
          <div
            key={item.reason.id}
            className="flex items-center justify-between text-sm"
          >
            <span>{item.reason.name}</span>
            <span className="font-medium">
              ${item.cost.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      {trends.trends.reductionOpportunities.length > 0 && (
        <div className="rounded-md bg-muted p-4 text-sm">
          <p className="font-medium mb-2">Reduction Opportunities:</p>
          <ul className="space-y-1 list-disc list-inside">
            {trends.trends.reductionOpportunities.map((opp: any, i: number) => (
              <li key={i}>
                {opp.description} - Save ${opp.potentialSavings.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

async function WasteReportsView() {
  const reportsResponse = await fetch(
    `/api/kitchen/waste/reports?groupBy=reason`
  );
  const reports = await reportsResponse.json();

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Cost</p>
          <p className="text-2xl font-bold">
            ${reports.report.summary.totalCost.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Quantity</p>
          <p className="text-2xl font-bold">
            {reports.report.summary.totalQuantity.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="text-2xl font-bold">
            {reports.report.summary.entryCount}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Avg Cost/Entry</p>
          <p className="text-2xl font-bold">
            ${reports.report.summary.avgCostPerEntry.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Grouped Data */}
      <div className="space-y-4">
        <h3 className="font-semibold">Waste by Reason</h3>
        <div className="space-y-2">
          {reports.report.data.map((item: any) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">
                  {item.count} entries • {item.avgQuantityPerEntry.toFixed(2)} avg qty
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">${item.totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">
                  ${item.avgCostPerEntry.toFixed(2)}/entry
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
