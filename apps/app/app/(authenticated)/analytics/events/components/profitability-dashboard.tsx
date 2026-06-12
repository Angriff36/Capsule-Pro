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
// NOTE: Keeping apiFetch for custom analytics endpoints (/api/events/:id/profitability,
// /api/analytics/events/profitability) — not entity CRUD routes, no generated client equivalents.
import { apiFetch } from "@/app/lib/api";
import type {
  EventProfitabilityMetrics,
  HistoricalProfitabilityData,
} from "../actions/get-event-profitability";
import { EventProfitabilityDetail } from "./event-profitability-detail";

interface ProfitabilityDashboardProps {
  eventId?: string;
}

export function ProfitabilityDashboard({
  eventId,
}: ProfitabilityDashboardProps) {
  const [metrics, setMetrics] = useState<EventProfitabilityMetrics | null>(
    null
  );
  const [historical, setHistorical] = useState<HistoricalProfitabilityData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("12m");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        if (eventId) {
          const response = await apiFetch(
            `/api/events/${eventId}/profitability`
          );
          const data = await response.json();
          setMetrics(data || null);
        } else {
          const response = await apiFetch(
            `/api/analytics/events/profitability?period=${selectedPeriod}`
          );
          const data = await response.json();
          // Ensure data is always an array
          setHistorical(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load profitability data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, selectedPeriod]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  if (eventId && metrics) {
    return <EventProfitabilityDetail metrics={metrics} />;
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">ANALYTICS</MonoLabel>
          <DisplayHeading size="md">Event Profitability</DisplayHeading>
          <CommandBandLede>
            Analyze event profitability, margins, cost variance, and revenue
            trends over time.
          </CommandBandLede>
        </CommandBandHeader>
        <CommandBandActions>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm" htmlFor="period-select">
              Period:
            </label>
            <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
              <SelectTrigger className="w-[180px]" id="period-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CommandBandActions>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          {historical.length === 0 ? (
            <Card tone="canvas">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="mb-2 font-medium text-lg">
                    No profitability data available
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Profitability metrics will appear as events are completed
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <SectionHeader title="Summary Metrics" />
              <div className="grid gap-6 md:grid-cols-4">
                <Card tone="canvas">
                  <CardHeader>
                    <CardDescription>Total Events</CardDescription>
                    <CardTitle className="text-2xl">
                      {historical.reduce((sum, h) => sum + h.totalEvents, 0)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardDescription>Average Margin %</CardDescription>
                    <CardTitle className="text-2xl">
                      {(
                        historical.reduce(
                          (sum, h) => sum + h.averageGrossMarginPct,
                          0
                        ) / historical.length
                      ).toFixed(1)}
                      %
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-2xl">
                      $
                      {historical
                        .reduce((sum, h) => sum + h.totalRevenue, 0)
                        .toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>

                <Card tone="canvas">
                  <CardHeader>
                    <CardDescription>Total Costs</CardDescription>
                    <CardTitle className="text-2xl">
                      $
                      {historical
                        .reduce((sum, h) => sum + h.totalCost, 0)
                        .toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <SectionHeader title="Historical Trends" />
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Monthly Profitability Metrics</CardTitle>
                  <CardDescription>
                    Detailed breakdown over the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Events</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">
                          Avg Margin %
                        </TableHead>
                        <TableHead className="text-right">
                          Food Cost %
                        </TableHead>
                        <TableHead className="text-right">
                          Labor Cost %
                        </TableHead>
                        <TableHead className="text-right">Overhead %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historical.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.period}</TableCell>
                          <TableCell className="text-right">
                            {item.totalEvents}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.averageGrossMarginPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {item.averageFoodCostPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {item.averageLaborCostPct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">
                            {item.averageOverheadPct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
