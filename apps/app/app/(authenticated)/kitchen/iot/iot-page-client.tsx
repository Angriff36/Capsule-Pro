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
  AlertTriangle,
  Battery,
  Bell,
  Bluetooth,
  Calendar,
  Plus,
  Radio,
  Thermometer,
  Wifi,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TemperatureProbe {
  id: string;
  probeId: string;
  name: string;
  probeType: string;
  status: string;
  minTemp: number;
  maxTemp: number;
  lastReading: number | null;
  lastReadingAt: Date | null;
  batteryLevel: number | null;
  lastCalibration: Date | null;
  nextCalibration: Date | null;
  calibrationIntervalDays: number | null;
  locationId?: string;
  areaId?: string;
}

interface TemperatureReading {
  id: string;
  probeId: string;
  temperature: number;
  unit: string;
  loggedAt: Date;
  batteryLevel: number | null;
  signalStrength: number | null;
}

interface IoTAlert {
  id: string;
  alertNumber: string;
  probeId: string | null;
  alertType: string;
  severity: string;
  status: string;
  title: string;
  message: string | null;
  temperature: number | null;
  threshold: number | null;
  triggeredAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
}

const severityColors = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-blue-500 text-white",
};

const statusColors = {
  active: "bg-green-500 text-white",
  offline: "bg-gray-500 text-white",
  low_battery: "bg-yellow-500 text-black",
  calibration_due: "bg-orange-500 text-white",
  retired: "bg-gray-400 text-white",
};

const probeTypeIcons = {
  bluetooth: Bluetooth,
  wifi: Wifi,
  wired: Radio,
};

export function IoTPageClient() {
  const [probes, setProbes] = useState<TemperatureProbe[]>([]);
  const [readings, setReadings] = useState<TemperatureReading[]>([]);
  const [alerts, setAlerts] = useState<IoTAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProbe, setSelectedProbe] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProbes(), fetchAlerts()]);
  }, []);

  async function fetchProbes() {
    try {
      const res = await fetch("/api/kitchen/iot/probes");
      const data = await res.json();
      setProbes(data.probes || []);
    } catch (error) {
      console.error("Error fetching probes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReadings(probeId: string) {
    try {
      const res = await fetch(
        `/api/kitchen/iot/readings?probeId=${probeId}&limit=50`
      );
      const data = await res.json();
      setReadings(data.readings || []);
    } catch (error) {
      console.error("Error fetching readings:", error);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/kitchen/iot/alerts?status=active");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }

  function formatDate(date: Date | string | null): string {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  function formatDateTime(date: Date | string | null): string {
    if (!date) return "N/A";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString();
  }

  function getBatteryColor(level: number | null): string {
    if (level === null) return "text-gray-400";
    if (level >= 70) return "text-green-500";
    if (level >= 30) return "text-yellow-500";
    return "text-red-500";
  }

  function getTemperatureColor(
    temp: number | null,
    min: number,
    max: number
  ): string {
    if (temp === null) return "text-gray-400";
    if (temp < min || temp > max) return "text-red-500";
    return "text-green-500";
  }

  function getAlertCount(probeId: string): number {
    return alerts.filter((a) => a.probeId === probeId && a.status === "active")
      .length;
  }

  function handleProbeClick(probeId: string) {
    setSelectedProbe(probeId);
    fetchReadings(probeId);
  }

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
  const offlineProbes = probes.filter((p) => p.status === "offline");
  const calibrationDue = probes.filter(
    (p) => p.nextCalibration && new Date(p.nextCalibration) <= new Date()
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kitchen IoT</h1>
          <p className="text-muted-foreground">
            Real-time temperature monitoring and probe management
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Register Probe
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className={criticalAlerts.length > 0 ? "border-red-500 bg-red-50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {criticalAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {activeAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Offline Probes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {offlineProbes.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Calibration Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {calibrationDue.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Active Probes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {probes.filter((p) => p.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs className="space-y-4" defaultValue="probes">
        <TabsList>
          <TabsTrigger value="probes">
            <Thermometer className="mr-2 h-4 w-4" />
            Probes
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
            {activeAlerts.length > 0 && (
              <Badge className="ml-2 h-5 px-1.5 text-xs" variant="destructive">
                {activeAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="readings" disabled={!selectedProbe}>
            <Radio className="mr-2 h-4 w-4" />
            Readings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="probes">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Probes</CardTitle>
              <CardDescription>
                Monitor and manage your IoT temperature probes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading probes...
                </div>
              ) : probes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No probes registered. Register your first probe to start
                  monitoring temperatures.
                </div>
              ) : (
                <div className="space-y-4">
                  {probes.map((probe) => {
                    const ProbeIcon =
                      probeTypeIcons[
                        probe.probeType as keyof typeof probeTypeIcons
                      ] || Thermometer;
                    const alertCount = getAlertCount(probe.id);
                    return (
                      <div
                        className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer ${
                          selectedProbe === probe.id ? "ring-2 ring-primary" : ""
                        }`}
                        key={probe.id}
                        onClick={() => handleProbeClick(probe.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <ProbeIcon className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">{probe.name}</h3>
                            <Badge
                              className={
                                statusColors[
                                  probe.status as keyof typeof statusColors
                                ]
                              }
                            >
                              {probe.status.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="outline">{probe.probeType}</Badge>
                            {alertCount > 0 && (
                              <Badge variant="destructive">
                                {alertCount} alert{alertCount > 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>ID: {probe.probeId}</span>
                            <span>
                              Range: {probe.minTemp}°F - {probe.maxTemp}°F
                            </span>
                          </div>
                          <div className="mt-3 flex items-center gap-6">
                            {probe.lastReading !== null && (
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4" />
                                <span
                                  className={`text-lg font-semibold ${getTemperatureColor(
                                    probe.lastReading,
                                    probe.minTemp,
                                    probe.maxTemp
                                  )}`}
                                >
                                  {probe.lastReading.toFixed(1)}°F
                                </span>
                                {probe.lastReadingAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatDateTime(probe.lastReadingAt)}
                                  </span>
                                )}
                              </div>
                            )}
                            {probe.batteryLevel !== null && (
                              <div className="flex items-center gap-2">
                                <Battery
                                  className={`h-4 w-4 ${getBatteryColor(probe.batteryLevel)}`}
                                />
                                <span
                                  className={
                                    probe.batteryLevel < 20
                                      ? "text-red-500 font-medium"
                                      : ""
                                  }
                                >
                                  {probe.batteryLevel}%
                                </span>
                              </div>
                            )}
                            {probe.nextCalibration && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4" />
                                <span
                                  className={
                                    new Date(probe.nextCalibration) <=
                                    new Date()
                                      ? "text-orange-500 font-medium"
                                      : ""
                                  }
                                >
                                  Calibration: {formatDate(probe.nextCalibration)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Log Reading
                          </Button>
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

        <TabsContent className="space-y-4" value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                IoT Alerts
              </CardTitle>
              <CardDescription>
                Temperature anomalies, offline probes, and maintenance alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading alerts...
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  No active alerts. All systems operating normally.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div
                      className="p-4 border rounded-lg border-l-4"
                      key={alert.id}
                      style={{
                        borderLeftColor:
                          alert.severity === "critical"
                            ? "#ef4444"
                            : alert.severity === "high"
                              ? "#f97316"
                              : alert.severity === "medium"
                                ? "#eab308"
                                : "#3b82f6",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{alert.title}</h3>
                            <Badge
                              className={
                                severityColors[
                                  alert.severity as keyof typeof severityColors
                                ]
                              }
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">
                              {alert.alertType.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          {alert.message && (
                            <p className="text-sm mb-2">{alert.message}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Triggered: {formatDateTime(alert.triggeredAt)}
                            </span>
                            {alert.temperature !== null && (
                              <span>
                                Reading: {alert.temperature.toFixed(1)}°F
                              </span>
                            )}
                            {alert.threshold !== null && (
                              <span>
                                Threshold: {alert.threshold.toFixed(1)}°F
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Acknowledge
                          </Button>
                          <Button size="sm" variant="ghost">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-4" value="readings">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Readings</CardTitle>
              <CardDescription>
                Historical readings for selected probe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a probe to view readings
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {readings.map((reading) => (
                    <div
                      className="flex items-center justify-between p-3 border rounded"
                      key={reading.id}
                    >
                      <div className="flex items-center gap-3">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {reading.temperature.toFixed(1)}°{reading.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {reading.batteryLevel !== null && (
                          <span>Battery: {reading.batteryLevel}%</span>
                        )}
                        {reading.signalStrength !== null && (
                          <span>Signal: {reading.signalStrength}%</span>
                        )}
                        <span>{formatDateTime(reading.loggedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
