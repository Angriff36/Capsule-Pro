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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Bolt,
  Droplets,
  Flame,
  Gauge,
  Plus,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

interface UtilityMeter {
  id: string;
  name: string;
  meterType: string;
  utilityType: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  unit: string;
  multiplier: number;
  locationId: string;
  spaceId?: string;
  serviceAccount?: string;
  utilityProvider?: string;
  status: string;
  installDate?: Date;
  notes?: string;
}

interface UtilityReading {
  id: string;
  meterId: string;
  meterName: string;
  readingDate: Date;
  readingValue: number;
  previousValue?: number;
  usage?: number;
  cost?: number;
  rate?: number;
  readingType: string;
  source: string;
  isEstimated: boolean;
  notes?: string;
}

const meterTypeIcons = {
  electric: Bolt,
  gas: Flame,
  water: Droplets,
  steam: Zap,
  other: Gauge,
};

const meterTypeColors = {
  electric: "bg-yellow-500 text-white",
  gas: "bg-orange-500 text-white",
  water: "bg-blue-500 text-white",
  steam: "bg-purple-500 text-white",
  other: "bg-gray-500 text-white",
};

const statusColors = {
  active: "bg-green-500 text-white",
  inactive: "bg-gray-500 text-white",
  removed: "bg-red-500 text-white",
};

export function FacilityUtilitiesPageClient() {
  const [meters, setMeters] = useState<UtilityMeter[]>([]);
  const [readings, setReadings] = useState<UtilityReading[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchMeters(), fetchReadings()]);
  }, []);

  async function fetchMeters() {
    try {
      const res = await fetch("/api/facility/utilities/meters/list");
      const data = await res.json();
      if (data.success) {
        setMeters(data.meters || []);
      }
    } catch (error) {
      console.error("Error fetching utility meters:", error);
    }
  }

  async function fetchReadings() {
    try {
      const res = await fetch("/api/facility/utilities/readings/list?limit=50");
      const data = await res.json();
      if (data.success) {
        setReadings(data.readings || []);
      }
    } catch (error) {
      console.error("Error fetching utility readings:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  function getTotalCostByType(meterType: string): number {
    const meterIds = meters
      .filter((m) => m.meterType === meterType)
      .map((m) => m.id);
    return readings
      .filter((r) => meterIds.includes(r.meterId))
      .reduce((sum, r) => sum + (r.cost || 0), 0);
  }

  function getTotalUsageByType(meterType: string): number {
    const meterIds = meters
      .filter((m) => m.meterType === meterType)
      .map((m) => m.id);
    return readings
      .filter((r) => meterIds.includes(r.meterId))
      .reduce((sum, r) => sum + (r.usage || 0), 0);
  }

  function getLatestReading(meterId: string): UtilityReading | undefined {
    return readings
      .filter((r) => r.meterId === meterId)
      .sort((a, b) => b.readingDate.getTime() - a.readingDate.getTime())[0];
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Utility Tracking</h1>
          <p className="text-muted-foreground">
            Track utility consumption, meter readings, and costs
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Meter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bolt className="h-4 w-4" />
              Electric Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getTotalCostByType("electric").toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getTotalUsageByType("electric").toFixed(0)} kWh
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Gas Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getTotalCostByType("gas").toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getTotalUsageByType("gas").toFixed(0)} therms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Droplets className="h-4 w-4" />
              Water Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getTotalCostByType("water").toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getTotalUsageByType("water").toFixed(0)} gallons
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Meters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meters.length}</div>
            <div className="text-xs text-muted-foreground">
              {meters.filter((m) => m.status === "active").length} active
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs className="space-y-4" defaultValue="meters">
        <TabsList>
          <TabsTrigger value="meters">
            <Gauge className="mr-2 h-4 w-4" />
            Meters
          </TabsTrigger>
          <TabsTrigger value="readings">
            <TrendingUp className="mr-2 h-4 w-4" />
            Readings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="meters">
          <Card>
            <CardHeader>
              <CardTitle>Utility Meters</CardTitle>
              <CardDescription>
                Manage utility meters for tracking consumption
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading meters...
                </div>
              ) : meters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gauge className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  No utility meters found. Add your first meter to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {meters.map((meter) => {
                    const Icon =
                      meterTypeIcons[
                        meter.meterType as keyof typeof meterTypeIcons
                      ] || Gauge;
                    const latestReading = getLatestReading(meter.id);

                    return (
                      <Card
                        className="hover:shadow-md transition-shadow"
                        key={meter.id}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <CardTitle className="text-lg">
                                {meter.name}
                              </CardTitle>
                            </div>
                            <Badge
                              className={
                                meterTypeColors[
                                  meter.meterType as keyof typeof meterTypeColors
                                ]
                              }
                            >
                              {meter.meterType}
                            </Badge>
                          </div>
                          <CardDescription>
                            {meter.utilityType || meter.meterType}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                statusColors[
                                  meter.status as keyof typeof statusColors
                                ]
                              }
                            >
                              {meter.status}
                            </Badge>
                            {meter.isEstimated && (
                              <Badge className="text-xs" variant="outline">
                                Estimated
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Unit:
                              </span>
                              <span>{meter.unit}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Multiplier:
                              </span>
                              <span>{meter.multiplier}x</span>
                            </div>
                            {meter.serviceAccount && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Account:
                                </span>
                                <span className="text-xs">
                                  {meter.serviceAccount}
                                </span>
                              </div>
                            )}
                          </div>
                          {latestReading && (
                            <div className="pt-2 border-t">
                              <div className="text-sm text-muted-foreground">
                                Latest Reading
                              </div>
                              <div className="font-semibold">
                                {latestReading.readingValue.toLocaleString()}{" "}
                                {meter.unit}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(latestReading.readingDate)}
                              </div>
                            </div>
                          )}
                          <div className="pt-2 border-t">
                            <div className="flex gap-2">
                              <Button
                                className="flex-1"
                                size="sm"
                                variant="outline"
                              >
                                Add Reading
                              </Button>
                              <Button size="sm" variant="ghost">
                                Edit
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="readings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Utility Readings</CardTitle>
                  <CardDescription>
                    View consumption history and costs
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Reading
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading readings...
                </div>
              ) : readings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  No readings found. Record your first meter reading.
                </div>
              ) : (
                <div className="space-y-4">
                  {readings.map((reading) => {
                    const meter = meters.find((m) => m.id === reading.meterId);
                    const Icon =
                      meterTypeIcons[
                        meter?.meterType as keyof typeof meterTypeIcons
                      ] || Gauge;

                    return (
                      <div
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        key={reading.id}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">
                              {reading.meterName}
                            </h3>
                            {meter && (
                              <Badge
                                className={
                                  meterTypeColors[
                                    meter.meterType as keyof typeof meterTypeColors
                                  ]
                                }
                              >
                                {meter.meterType}
                              </Badge>
                            )}
                            {reading.isEstimated && (
                              <Badge className="text-xs" variant="outline">
                                Estimated
                              </Badge>
                            )}
                            {reading.source && (
                              <Badge className="text-xs" variant="secondary">
                                {reading.source}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Date:
                              </span>{" "}
                              {formatDate(reading.readingDate)}
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Reading:
                              </span>{" "}
                              {reading.readingValue.toLocaleString()}{" "}
                              {meter?.unit || ""}
                            </div>
                            {reading.usage !== undefined &&
                              reading.usage > 0 && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Usage:
                                  </span>{" "}
                                  {reading.usage.toLocaleString()}{" "}
                                  {meter?.unit || ""}
                                </div>
                              )}
                            {reading.cost !== undefined && reading.cost > 0 && (
                              <div>
                                <span className="text-muted-foreground">
                                  Cost:
                                </span>{" "}
                                ${reading.cost.toFixed(2)}
                              </div>
                            )}
                          </div>
                          {reading.previousValue && (
                            <div className="text-sm text-muted-foreground">
                              Previous: {reading.previousValue.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
