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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
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
  Info,
  Plus,
  Radio,
  Thermometer,
  Wifi,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom /api/kitchen/iot/* endpoints (probes, readings, alerts)
// — generated client uses /api/kitchen/temperature-probes/*, /api/kitchen/temperature-readings/*,
//   /api/kitchen/iot-alerts/* which are different routes with different response shapes
import { apiFetch } from "@/app/lib/api";

interface TemperatureProbe {
  areaId?: string;
  batteryLevel: number | null;
  calibrationIntervalDays: number | null;
  id: string;
  lastCalibration: Date | null;
  lastReading: number | null;
  lastReadingAt: Date | null;
  locationId?: string;
  maxTemp: number;
  minTemp: number;
  name: string;
  nextCalibration: Date | null;
  probeId: string;
  probeType: string;
  status: string;
}

interface TemperatureReading {
  batteryLevel: number | null;
  id: string;
  loggedAt: Date;
  probeId: string;
  signalStrength: number | null;
  temperature: number;
  unit: string;
}

interface IoTAlert {
  acknowledgedAt: Date | null;
  alertNumber: string;
  alertType: string;
  id: string;
  message: string | null;
  probeId: string | null;
  resolvedAt: Date | null;
  severity: string;
  status: string;
  temperature: number | null;
  threshold: number | null;
  title: string;
  triggeredAt: Date;
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

  // Register probe dialog
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    probeId: "",
    probeType: "bluetooth",
    locationId: "",
    minTemp: "-40",
    maxTemp: "300",
  });
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  // Log reading dialog
  const [readingDialogOpen, setReadingDialogOpen] = useState(false);
  const [readingProbeId, setReadingProbeId] = useState<string | null>(null);
  const [readingForm, setReadingForm] = useState({ temperature: "" });
  const [readingSubmitting, setReadingSubmitting] = useState(false);

  // Probe details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsProbe, setDetailsProbe] = useState<TemperatureProbe | null>(
    null
  );

  // Resolve alert dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([fetchProbes(), fetchAlerts()]);
  }, []);

  async function fetchProbes() {
    try {
      const res = await apiFetch("/api/kitchen/iot/probes");
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
      const res = await apiFetch(
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
      const res = await apiFetch("/api/kitchen/iot/alerts?status=active");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }

  async function handleRegisterProbe() {
    if (!(registerForm.name.trim() && registerForm.probeId.trim())) {
      toast.error("Name and Probe ID are required");
      return;
    }
    setRegisterSubmitting(true);
    try {
      const res = await apiFetch("/api/kitchen/iot/probes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerForm.name,
          probeId: registerForm.probeId,
          probeType: registerForm.probeType,
          locationId: registerForm.locationId || undefined,
          minTemp: Number(registerForm.minTemp),
          maxTemp: Number(registerForm.maxTemp),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register probe");
      }
      toast.success("Probe registered successfully");
      setRegisterDialogOpen(false);
      setRegisterForm({
        name: "",
        probeId: "",
        probeType: "bluetooth",
        locationId: "",
        minTemp: "-40",
        maxTemp: "300",
      });
      await fetchProbes();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to register probe"
      );
    } finally {
      setRegisterSubmitting(false);
    }
  }

  async function handleLogReading() {
    if (!(readingProbeId && readingForm.temperature)) {
      toast.error("Temperature is required");
      return;
    }
    setReadingSubmitting(true);
    try {
      const res = await apiFetch("/api/kitchen/iot/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          probeId: readingProbeId,
          temperature: Number(readingForm.temperature),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log reading");
      }
      toast.success("Reading logged successfully");
      setReadingDialogOpen(false);
      setReadingForm({ temperature: "" });
      await Promise.all([
        fetchProbes(),
        selectedProbe === readingProbeId
          ? fetchReadings(readingProbeId)
          : Promise.resolve(),
        fetchAlerts(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to log reading"
      );
    } finally {
      setReadingSubmitting(false);
    }
  }

  async function handleAcknowledgeAlert(alertId: string) {
    try {
      const res = await apiFetch(`/api/kitchen/iot/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acknowledged" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to acknowledge alert");
      }
      toast.success("Alert acknowledged");
      await fetchAlerts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to acknowledge alert"
      );
    }
  }

  async function handleResolveAlert() {
    if (!resolveAlertId) {
      return;
    }
    setResolveSubmitting(true);
    try {
      const res = await apiFetch(`/api/kitchen/iot/alerts/${resolveAlertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolutionNotes: resolutionNotes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve alert");
      }
      toast.success("Alert resolved");
      setResolveDialogOpen(false);
      setResolutionNotes("");
      setResolveAlertId(null);
      await fetchAlerts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resolve alert"
      );
    } finally {
      setResolveSubmitting(false);
    }
  }

  function openLogReadingDialog(probeId: string) {
    setReadingProbeId(probeId);
    setReadingForm({ temperature: "" });
    setReadingDialogOpen(true);
  }

  function openDetailsDialog(probe: TemperatureProbe) {
    setDetailsProbe(probe);
    setDetailsDialogOpen(true);
  }

  function openResolveDialog(alertId: string) {
    setResolveAlertId(alertId);
    setResolutionNotes("");
    setResolveDialogOpen(true);
  }

  function formatDate(date: Date | string | null): string {
    if (!date) {
      return "N/A";
    }
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  function formatDateTime(date: Date | string | null): string {
    if (!date) {
      return "N/A";
    }
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString();
  }

  function getBatteryColor(level: number | null): string {
    if (level === null) {
      return "text-gray-400";
    }
    if (level >= 70) {
      return "text-green-500";
    }
    if (level >= 30) {
      return "text-yellow-500";
    }
    return "text-red-500";
  }

  function getTemperatureColor(
    temp: number | null,
    min: number,
    max: number
  ): string {
    if (temp === null) {
      return "text-gray-400";
    }
    if (temp < min || temp > max) {
      return "text-red-500";
    }
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
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Kitchen IoT</h1>
          <p className="text-muted-foreground">
            Real-time temperature monitoring and probe management
          </p>
        </div>
        <Button onClick={() => setRegisterDialogOpen(true)} type="button">
          <Plus className="mr-2 h-4 w-4" />
          Register probe
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card
          className={
            criticalAlerts.length > 0 ? "border-red-500 bg-red-900/10" : ""
          }
          tone="canvas"
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <AlertTriangle className="h-4 w-4" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-red-600">
              {criticalAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Bell className="h-4 w-4" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-orange-600">
              {activeAlerts.length}
            </div>
          </CardContent>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Radio className="h-4 w-4" />
              Offline Probes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-gray-600">
              {offlineProbes.length}
            </div>
          </CardContent>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Wrench className="h-4 w-4" />
              Calibration Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-yellow-600">
              {calibrationDue.length}
            </div>
          </CardContent>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <Thermometer className="h-4 w-4" />
              Active Probes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl text-green-600">
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
          <TabsTrigger disabled={!selectedProbe} value="readings">
            <Radio className="mr-2 h-4 w-4" />
            Readings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="probes">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Temperature Probes</CardTitle>
              <CardDescription>
                Monitor and manage your IoT temperature probes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">
                  Loading probes...
                </div>
              ) : probes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
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
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                          selectedProbe === probe.id
                            ? "ring-2 ring-primary"
                            : ""
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
                          <div className="mt-2 flex items-center gap-4 text-muted-foreground text-sm">
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
                                  className={`font-semibold text-lg ${getTemperatureColor(
                                    probe.lastReading,
                                    probe.minTemp,
                                    probe.maxTemp
                                  )}`}
                                >
                                  {probe.lastReading.toFixed(1)}°F
                                </span>
                                {probe.lastReadingAt && (
                                  <span className="text-muted-foreground text-xs">
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
                                      ? "font-medium text-red-500"
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
                                      ? "font-medium text-orange-500"
                                      : ""
                                  }
                                >
                                  Calibration:{" "}
                                  {formatDate(probe.nextCalibration)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className="flex gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            onClick={() => openLogReadingDialog(probe.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <Thermometer className="mr-1 h-3 w-3" />
                            Log reading
                          </Button>
                          <Button
                            onClick={() => openDetailsDialog(probe)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            <Info className="mr-1 h-3 w-3" />
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
          <Card tone="canvas">
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
                <div className="py-8 text-center text-muted-foreground">
                  Loading alerts...
                </div>
              ) : activeAlerts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckIcon className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  No active alerts. All systems operating normally.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div
                      className="rounded-lg border border-l-4 p-4"
                      key={alert.id}
                      style={{
                        borderLeftColor:
                          alert.severity === "critical"
                            ? "var(--ds-severity-critical)"
                            : alert.severity === "high"
                              ? "var(--ds-severity-high)"
                              : alert.severity === "medium"
                                ? "var(--ds-severity-medium)"
                                : "var(--ds-severity-low)",
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
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
                            <p className="mb-2 text-sm">{alert.message}</p>
                          )}
                          <div className="flex items-center gap-4 text-muted-foreground text-sm">
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
                          <Button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Acknowledge
                          </Button>
                          <Button
                            onClick={() => openResolveDialog(alert.id)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
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
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Temperature Readings</CardTitle>
              <CardDescription>
                Historical readings for selected probe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {readings.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Select a probe to view readings
                </div>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {readings.map((reading) => (
                    <div
                      className="flex items-center justify-between rounded border p-3"
                      key={reading.id}
                    >
                      <div className="flex items-center gap-3">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {reading.temperature.toFixed(1)}°{reading.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-muted-foreground text-sm">
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

      {/* Register Probe Dialog */}
      <Dialog onOpenChange={setRegisterDialogOpen} open={registerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register New Probe</DialogTitle>
            <DialogDescription>
              Add a new IoT temperature probe to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="probe-name">Name</Label>
              <Input
                id="probe-name"
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Walk-in Freezer 1"
                value={registerForm.name}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="probe-id">Hardware Probe ID</Label>
              <Input
                id="probe-id"
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, probeId: e.target.value }))
                }
                placeholder="e.g. BT-SENSOR-001"
                value={registerForm.probeId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="probe-type">Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                id="probe-type"
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, probeType: e.target.value }))
                }
                value={registerForm.probeType}
              >
                <option value="bluetooth">Bluetooth</option>
                <option value="wifi">Wi-Fi</option>
                <option value="wired">Wired</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="probe-location">Location ID (optional)</Label>
              <Input
                id="probe-location"
                onChange={(e) =>
                  setRegisterForm((f) => ({
                    ...f,
                    locationId: e.target.value,
                  }))
                }
                placeholder="UUID of location"
                value={registerForm.locationId}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="probe-min-temp">Min Temp (°F)</Label>
                <Input
                  id="probe-min-temp"
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, minTemp: e.target.value }))
                  }
                  type="number"
                  value={registerForm.minTemp}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="probe-max-temp">Max Temp (°F)</Label>
                <Input
                  id="probe-max-temp"
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, maxTemp: e.target.value }))
                  }
                  type="number"
                  value={registerForm.maxTemp}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRegisterDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={registerSubmitting}
              onClick={handleRegisterProbe}
              type="button"
            >
              {registerSubmitting ? "Registering..." : "Register Probe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Reading Dialog */}
      <Dialog onOpenChange={setReadingDialogOpen} open={readingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Temperature Reading</DialogTitle>
            <DialogDescription>
              Manually record a temperature reading for this probe.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reading-temp">Temperature (°F)</Label>
              <Input
                id="reading-temp"
                onChange={(e) =>
                  setReadingForm({ temperature: e.target.value })
                }
                placeholder="e.g. 36.5"
                step="0.1"
                type="number"
                value={readingForm.temperature}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setReadingDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={readingSubmitting}
              onClick={handleLogReading}
              type="button"
            >
              {readingSubmitting ? "Logging..." : "Log Reading"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Probe Details Dialog */}
      <Dialog onOpenChange={setDetailsDialogOpen} open={detailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Probe Details</DialogTitle>
            <DialogDescription>
              {detailsProbe?.name ?? "Probe information"}
            </DialogDescription>
          </DialogHeader>
          {detailsProbe && (
            <div className="grid gap-3 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{detailsProbe.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hardware ID</span>
                <span className="font-medium">{detailsProbe.probeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{detailsProbe.probeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={
                    statusColors[
                      detailsProbe.status as keyof typeof statusColors
                    ]
                  }
                >
                  {detailsProbe.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Safe Range</span>
                <span className="font-medium">
                  {detailsProbe.minTemp}°F - {detailsProbe.maxTemp}°F
                </span>
              </div>
              {detailsProbe.lastReading !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Reading</span>
                  <span
                    className={`font-medium ${getTemperatureColor(
                      detailsProbe.lastReading,
                      detailsProbe.minTemp,
                      detailsProbe.maxTemp
                    )}`}
                  >
                    {detailsProbe.lastReading.toFixed(1)}°F
                  </span>
                </div>
              )}
              {detailsProbe.lastReadingAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Reading At</span>
                  <span className="font-medium">
                    {formatDateTime(detailsProbe.lastReadingAt)}
                  </span>
                </div>
              )}
              {detailsProbe.batteryLevel !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Battery</span>
                  <span
                    className={`font-medium ${getBatteryColor(detailsProbe.batteryLevel)}`}
                  >
                    {detailsProbe.batteryLevel}%
                  </span>
                </div>
              )}
              {detailsProbe.lastCalibration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Last Calibration
                  </span>
                  <span className="font-medium">
                    {formatDate(detailsProbe.lastCalibration)}
                  </span>
                </div>
              )}
              {detailsProbe.nextCalibration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Next Calibration
                  </span>
                  <span
                    className={
                      new Date(detailsProbe.nextCalibration) <= new Date()
                        ? "font-medium text-orange-500"
                        : "font-medium"
                    }
                  >
                    {formatDate(detailsProbe.nextCalibration)}
                  </span>
                </div>
              )}
              {detailsProbe.calibrationIntervalDays && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Calibration Interval
                  </span>
                  <span className="font-medium">
                    {detailsProbe.calibrationIntervalDays} days
                  </span>
                </div>
              )}
              {detailsProbe.locationId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location ID</span>
                  <span className="font-medium font-mono text-xs">
                    {detailsProbe.locationId}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setDetailsDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Alert Dialog */}
      <Dialog onOpenChange={setResolveDialogOpen} open={resolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Mark this alert as resolved. Optionally add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="resolution-notes">
                Resolution Notes (optional)
              </Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                id="resolution-notes"
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe what action was taken..."
                value={resolutionNotes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setResolveDialogOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={resolveSubmitting}
              onClick={handleResolveAlert}
              type="button"
            >
              {resolveSubmitting ? "Resolving..." : "Resolve Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
