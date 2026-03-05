"use client";

/**
 * IoT Monitoring Dashboard Client Component
 *
 * Client-side component that fetches and displays IoT monitoring data
 * with real-time updates via WebSocket.
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Thermometer,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import { useSession } from "@/auth/client";
import { IotMonitoringRealtime } from "./iot-monitoring-realtime";

interface EquipmentStatus {
  id: string;
  name: string;
  type: string;
  locationId: string;
  iotDeviceId: string | null;
  connectionStatus: "connected" | "disconnected" | "error";
  lastHeartbeat: string | null;
  currentSensorData: Record<string, unknown> | null;
  latestReadings?: Array<{
    id: string;
    sensorType: string;
    value: number;
    unit: string;
    status: string;
    timestamp: string;
  }>;
  activeAlerts?: number;
}

interface Alert {
  id: string;
  alertType: string;
  severity: "info" | "warning" | "critical" | "emergency";
  status: string;
  title: string;
  description: string | null;
  triggeredAt: string;
  equipment: {
    id: string;
    name: string;
    type: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function IotMonitoringDashboardClient() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId;

  const {
    data: equipmentData,
    error: equipmentError,
    mutate: mutateEquipment,
  } = useSWR<{ equipment: EquipmentStatus[] }>(
    "/api/kitchen/iot/equipment-status?include_latest_data=true",
    fetcher,
    {
      refreshInterval: 30_000, // Refresh every 30 seconds
    }
  );

  const { data: alertsData, mutate: mutateAlerts } = useSWR<{
    alerts: Alert[];
  }>("/api/kitchen/iot/alerts?status=active&limit=10", fetcher, {
    refreshInterval: 15_000, // Refresh alerts every 15 seconds
  });

  const equipment = equipmentData?.equipment ?? [];
  const alerts = alertsData?.alerts ?? [];

  // Calculate summary stats
  const connectedCount = equipment.filter(
    (e) => e.connectionStatus === "connected"
  ).length;
  const disconnectedCount = equipment.filter(
    (e) => e.connectionStatus === "disconnected"
  ).length;
  const criticalAlerts = alerts.filter(
    (a) => a.severity === "critical" || a.severity === "emergency"
  ).length;
  const warningAlerts = alerts.filter((a) => a.severity === "warning").length;

  // Get temperature readings for display
  const temperatureReadings = equipment
    .filter((e) =>
      e.latestReadings?.some((r) => r.sensorType === "temperature")
    )
    .map((e) => {
      const tempReading = e.latestReadings?.find(
        (r) => r.sensorType === "temperature"
      );
      return {
        equipment: e.name,
        temperature: tempReading?.value ?? 0,
        unit: tempReading?.unit ?? "C",
        status: tempReading?.status ?? "unknown",
        timestamp: tempReading?.timestamp ?? null,
      };
    });

  return (
    <div className="space-y-6">
      {/* Real-time updates component */}
      {tenantId && (
        <IotMonitoringRealtime
          onUpdate={() => {
            mutateEquipment();
            mutateAlerts();
          }}
          tenantId={tenantId}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Connected</p>
              <p className="text-2xl font-bold">{connectedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disconnected</p>
              <p className="text-2xl font-bold">{disconnectedCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Warnings</p>
              <p className="text-2xl font-bold">{warningAlerts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold">{criticalAlerts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Alerts
            </h2>
            <Button onClick={() => mutateAlerts()} size="sm" variant="outline">
              Refresh
            </Button>
          </div>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem
                alert={alert}
                key={alert.id}
                onResolve={() => mutateAlerts()}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Equipment Status Grid */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Equipment Status</h2>
          <Button onClick={() => mutateEquipment()} size="sm" variant="outline">
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => (
            <EquipmentCard equipment={eq} key={eq.id} />
          ))}
        </div>
        {equipment.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No IoT-enabled equipment found</p>
            <p className="text-sm">
              Register IoT devices to equipment to start monitoring
            </p>
          </div>
        )}
      </Card>

      {/* Temperature Monitoring */}
      {temperatureReadings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Thermometer className="h-5 w-5" />
            Temperature Monitoring
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {temperatureReadings.map((reading, index) => (
              <TemperatureCard key={index} reading={reading} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AlertItem({
  alert,
  onResolve,
}: {
  alert: Alert;
  onResolve: () => void;
}) {
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await fetch("/api/kitchen/iot/commands/acknowledge-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: alert.id }),
      });
      onResolve();
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  const severityColors: Record<string, string> = {
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    critical:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    emergency: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-background">
      <div className={`p-2 rounded-full ${severityColors[alert.severity]}`}>
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium truncate">{alert.title}</p>
          <Badge className="shrink-0" variant="outline">
            {alert.severity}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {alert.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {alert.equipment.name} •{" "}
          {new Date(alert.triggeredAt).toLocaleString()}
        </p>
      </div>
      {alert.status === "active" && (
        <Button
          disabled={isAcknowledging}
          onClick={handleAcknowledge}
          size="sm"
          variant="ghost"
        >
          {isAcknowledging ? "Acknowledging..." : "Acknowledge"}
        </Button>
      )}
    </div>
  );
}

function EquipmentCard({ equipment }: { equipment: EquipmentStatus }) {
  const isConnected = equipment.connectionStatus === "connected";
  const lastReading = equipment.latestReadings?.[0];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{equipment.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {equipment.type}
          </p>
        </div>
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {lastReading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">
              {lastReading.sensorType}
            </span>
            <span className="font-medium">
              {lastReading.value} {lastReading.unit}
            </span>
          </div>
          <Badge
            className="w-full justify-center"
            variant={
              lastReading.status === "normal" ? "default" : "destructive"
            }
          >
            {lastReading.status}
          </Badge>
        </div>
      )}

      {equipment.lastHeartbeat && (
        <p className="text-xs text-muted-foreground mt-3">
          Last seen: {new Date(equipment.lastHeartbeat).toLocaleString()}
        </p>
      )}
    </Card>
  );
}

function TemperatureCard({
  reading,
}: {
  reading: {
    equipment: string;
    temperature: number;
    unit: string;
    status: string;
    timestamp: string | null;
  };
}) {
  const isCelsius = reading.unit === "C" || reading.unit === "celsius";
  const displayTemp = Math.round(reading.temperature * 10) / 10;

  // Determine if temperature is in safe range
  const isSafe = reading.status === "normal";
  const isInDangerZone = reading.temperature >= 5 && reading.temperature <= 57;

  return (
    <Card
      className={`p-4 ${isInDangerZone ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">{reading.equipment}</h3>
        <Badge
          variant={
            isSafe ? "default" : isInDangerZone ? "destructive" : "secondary"
          }
        >
          {isInDangerZone ? "Danger Zone" : isSafe ? "Safe" : "Warning"}
        </Badge>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold">
          {displayTemp}°{isCelsius ? "C" : "F"}
        </span>
        {isCelsius && (
          <span className="text-sm text-muted-foreground mb-1">
            ({Math.round((displayTemp * 9) / 5 + 32)}°F)
          </span>
        )}
      </div>
      {reading.timestamp && (
        <p className="text-xs text-muted-foreground mt-2">
          Updated {new Date(reading.timestamp).toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}
