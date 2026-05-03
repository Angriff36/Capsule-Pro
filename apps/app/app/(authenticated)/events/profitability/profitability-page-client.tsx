/**
 * @module ProfitabilityPageClient
 * @intent Client-side interactivity for the Event Profitability page
 * @responsibility Handle search, filtering, recalculation, and rendering the profitability table
 * @domain Events
 * @tags profitability, events, finance, client-component
 * @canonical true
 */

"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  DollarSignIcon,
  RefreshCwIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type EventProfitabilityRecord,
  formatCurrency,
  getMarginBadgeClass,
  getMarginColor,
  getVarianceColor,
  type ProfitabilitySummary,
  recalculateProfitability,
} from "../../../lib/use-event-profitability";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProfitabilityPageClientProps {
  records: EventProfitabilityRecord[];
  summary: ProfitabilitySummary;
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 15;

type MarginFilter = "all" | "healthy" | "warning" | "critical";

const marginFilterLabel: Record<MarginFilter, string> = {
  all: "All margins",
  healthy: "Healthy (30%+)",
  warning: "Warning (15-30%)",
  critical: "Critical (<15%)",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ProfitabilityPageClient = ({
  records,
  summary,
  tenantId,
}: ProfitabilityPageClientProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [marginFilter, setMarginFilter] = useState<MarginFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState(records);

  // Filter and search records
  const filteredRecords = useMemo(() => {
    return localRecords.filter((record) => {
      // Search filter — matches event title or notes
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        (record.event?.title ?? "").toLowerCase().includes(searchLower) ||
        (record.notes ?? "").toLowerCase().includes(searchLower) ||
        record.eventId.toLowerCase().includes(searchLower);

      // Margin filter
      const margin = record.actualGrossMarginPct;
      const matchesMargin =
        marginFilter === "all" ||
        (marginFilter === "healthy" && margin >= 30) ||
        (marginFilter === "warning" && margin >= 15 && margin < 30) ||
        (marginFilter === "critical" && margin < 15);

      return matchesSearch && matchesMargin;
    });
  }, [localRecords, searchQuery, marginFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Filter change handlers
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleMarginFilterChange = useCallback((value: string) => {
    setMarginFilter(value as MarginFilter);
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setMarginFilter("all");
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = searchQuery !== "" || marginFilter !== "all";

  // Recalculate handler
  const handleRecalculate = useCallback(
    async (id: string, eventTitle: string) => {
      setRecalculatingId(id);
      try {
        await recalculateProfitability(id);
        toast.success(`Recalculated profitability for "${eventTitle}"`);

        // Re-fetch the full list from the server to get updated data
        const response = await fetch("/api/events/profitability/list");
        if (response.ok) {
          const data = await response.json();
          const updatedRecords: EventProfitabilityRecord[] =
            data.eventProfitabilitys ?? [];

          // Re-attach event info from our original records (API doesn't join)
          const enriched = updatedRecords.map((r) => {
            const existing = localRecords.find((lr) => lr.id === r.id);
            return {
              ...r,
              event: existing?.event ?? null,
            };
          });

          setLocalRecords(enriched);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Recalculation failed";
        toast.error(message);
      } finally {
        setRecalculatingId(null);
      }
    },
    [localRecords]
  );

  // Summary cards data
  const revenueVariance =
    summary.totalActualRevenue - summary.totalBudgetedRevenue;
  const costVariance = summary.totalActualCost - summary.totalBudgetedCost;

  return (
    <div className="flex flex-1 flex-col gap-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <DollarSignIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalActualRevenue)}
            </div>
            <p className="text-muted-foreground text-xs">
              Budgeted: {formatCurrency(summary.totalBudgetedRevenue)}
              {revenueVariance !== 0 && (
                <span className={`ml-1 ${getVarianceColor(revenueVariance)}`}>
                  ({revenueVariance > 0 ? "+" : ""}
                  {formatCurrency(revenueVariance)})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Total Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Total Costs</CardDescription>
            <TrendingDownIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalActualCost)}
            </div>
            <p className="text-muted-foreground text-xs">
              Budgeted: {formatCurrency(summary.totalBudgetedCost)}
              {costVariance !== 0 && (
                <span className={`ml-1 ${getVarianceColor(costVariance * -1)}`}>
                  ({costVariance > 0 ? "+" : ""}
                  {formatCurrency(costVariance)})
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Average Margin */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Average Margin</CardDescription>
            <TrendingUpIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getMarginColor(
                summary.averageMarginPct
              )}`}
            >
              {summary.averageMarginPct.toFixed(1)}%
            </div>
            <p className="text-muted-foreground text-xs">
              Across {summary.recordCount} event
              {summary.recordCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Underperforming */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>Events Underwater</CardDescription>
            <TrendingDownIcon className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.underperformingCount > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              {summary.underperformingCount}
            </div>
            <p className="text-muted-foreground text-xs">Margin below 15%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground">Filters</h2>
        <Card className="mt-3">
          <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end">
            {/* Search */}
            <div className="flex-1">
              <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by event name or notes..."
                  value={searchQuery}
                />
              </div>
            </div>

            {/* Margin Filter */}
            <div className="lg:w-52">
              <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
                Margin Health
              </label>
              <Select
                onValueChange={handleMarginFilterChange}
                value={marginFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All margins" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(marginFilterLabel) as MarginFilter[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {marginFilterLabel[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                className="lg:mt-6"
                onClick={clearFilters}
                variant="ghost"
              >
                <XIcon className="mr-2 size-4" />
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Table Section */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Profitability Records ({filteredRecords.length})
          </h2>
          <p className="text-muted-foreground text-sm">
            Showing {paginatedRecords.length} of {filteredRecords.length}
            {filteredRecords.length !== localRecords.length && (
              <span> (filtered from {localRecords.length} total)</span>
            )}
          </p>
        </div>

        {paginatedRecords.length === 0 ? (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DollarSignIcon />
              </EmptyMedia>
              <EmptyTitle>No profitability records found</EmptyTitle>
              <EmptyDescription>
                {hasActiveFilters
                  ? "Try adjusting your filters or search query"
                  : "No profitability records have been created yet. They will appear after event financial data is processed."}
              </EmptyDescription>
            </EmptyHeader>
            {hasActiveFilters && (
              <EmptyContent>
                <Button onClick={clearFilters} variant="outline">
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <Card className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Event Name</TableHead>
                  <TableHead className="text-right">Budgeted Rev.</TableHead>
                  <TableHead className="text-right">Actual Rev.</TableHead>
                  <TableHead className="text-right">Budgeted Cost</TableHead>
                  <TableHead className="text-right">Actual Cost</TableHead>
                  <TableHead className="text-right">Gross Margin %</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((record) => {
                  const isRecalculating = recalculatingId === record.id;
                  const eventTitle = record.event?.title ?? "Unknown Event";

                  return (
                    <TableRow key={record.id}>
                      {/* Event Name */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Link
                            className="font-medium hover:underline"
                            href={`/events/${record.eventId}`}
                          >
                            {eventTitle}
                          </Link>
                          {record.event?.eventDate && (
                            <span className="text-muted-foreground text-xs">
                              {new Date(
                                record.event.eventDate
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Budgeted Revenue */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(record.budgetedRevenue)}
                      </TableCell>

                      {/* Actual Revenue */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(record.actualRevenue)}
                      </TableCell>

                      {/* Budgeted Cost */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(record.budgetedTotalCost)}
                      </TableCell>

                      {/* Actual Cost */}
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(record.actualTotalCost)}
                      </TableCell>

                      {/* Gross Margin % */}
                      <TableCell className="text-right">
                        <Badge
                          className={getMarginBadgeClass(
                            record.actualGrossMarginPct
                          )}
                          variant="secondary"
                        >
                          {record.actualGrossMarginPct.toFixed(1)}%
                        </Badge>
                      </TableCell>

                      {/* Variance */}
                      <TableCell className="text-right">
                        <span
                          className={`font-mono text-sm ${getVarianceColor(
                            record.revenueVariance
                          )}`}
                        >
                          {record.revenueVariance > 0 ? "+" : ""}
                          {formatCurrency(record.revenueVariance)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          disabled={isRecalculating}
                          onClick={() =>
                            handleRecalculate(record.id, eventTitle)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <RefreshCwIcon
                            className={`mr-1.5 size-3.5 ${
                              isRecalculating ? "animate-spin" : ""
                            }`}
                          />
                          {isRecalculating ? "Working..." : "Recalc"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <>
            <Separator />
            <div className="flex items-center justify-between pt-4">
              <p className="text-muted-foreground text-sm">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
