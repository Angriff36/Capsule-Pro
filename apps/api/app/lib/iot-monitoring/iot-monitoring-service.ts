/**
 * IoT Monitoring Service
 *
 * Core service for ingesting IoT sensor data, managing device connections,
 * and coordinating alert evaluation for kitchen equipment monitoring.
 *
 * @module IotMonitoringService
 * @tags iot, monitoring, kitchen
 */

import type { Equipment, SensorReading } from "@repo/database";
import { database } from "@repo/database";
import {
  checkDeviceHeartbeat,
  createAlert,
  createOfflineAlert,
  evaluateReading,
  resolveStaleAlerts,
} from "./iot-alert-service";

export interface SensorDataIngest {
  equipmentId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
  deviceId?: string;
}

export interface IngestResult {
  success: boolean;
  reading?: SensorReading;
  alertsCreated: number;
  connectionStatusUpdated: boolean;
  errors?: string[];
}

/**
 * Ingest sensor data from IoT devices
 *
 * This is the main entry point for IoT sensor data. It:
 * 1. Validates the equipment exists and has IoT enabled
 * 2. Stores the sensor reading
 * 3. Updates equipment connection status
 * 4. Evaluates alert rules and creates alerts if needed
 * 5. Checks for offline devices
 */
export async function ingestSensorData(
  tenantId: string,
  data: SensorDataIngest
): Promise<IngestResult> {
  const errors: string[] = [];
  let reading: SensorReading | undefined;
  let alertsCreated = 0;
  let connectionStatusUpdated = false;

  try {
    // Fetch equipment to validate and get current state
    const equipment = await database.equipment.findUnique({
      where: { id: data.equipmentId },
      select: {
        id: true,
        tenantId: true,
        iotDeviceId: true,
        iotDeviceType: true,
        connectionStatus: true,
        lastHeartbeat: true,
        name: true,
      },
    });

    if (!equipment) {
      return {
        success: false,
        errors: ["Equipment not found"],
        alertsCreated: 0,
        connectionStatusUpdated: false,
      };
    }

    if (equipment.tenantId !== tenantId) {
      return {
        success: false,
        errors: ["Equipment tenant mismatch"],
        alertsCreated: 0,
        connectionStatusUpdated: false,
      };
    }

    // Update IoT device registration if provided
    if (data.deviceId && data.deviceId !== equipment.iotDeviceId) {
      await database.equipment.update({
        where: { id: data.equipmentId },
        data: { iotDeviceId: data.deviceId },
      });
    }

    // Store sensor reading
    reading = await database.sensorReading.create({
      data: {
        tenantId,
        equipmentId: data.equipmentId,
        sensorType: data.sensorType,
        value: data.value,
        unit: data.unit,
        status: determineReadingStatus(data.sensorType, data.value),
        timestamp: data.timestamp ?? new Date(),
        metadata: data.metadata as Record<string, unknown> | null,
      },
    });

    // Update equipment connection status and last heartbeat
    const now = new Date();
    await database.equipment.update({
      where: { id: data.equipmentId },
      data: {
        connectionStatus: "connected",
        lastHeartbeat: now,
        currentSensorData: {
          [data.sensorType]: {
            value: data.value,
            unit: data.unit,
            timestamp: now.toISOString(),
          },
        },
      },
    });
    connectionStatusUpdated = true;

    // Evaluate alert rules
    const evaluations = await evaluateReading(tenantId, data.equipmentId, {
      sensorType: data.sensorType,
      value: data.value,
      timestamp: reading.timestamp,
    });

    // Create alerts for any triggered rules
    for (const evaluation of evaluations) {
      await createAlert(tenantId, data.equipmentId, evaluation, {
        sensorType: data.sensorType,
        value: data.value,
        timestamp: reading.timestamp,
      });
      alertsCreated++;
    }

    // Resolve any stale alerts if value is back to normal
    await resolveStaleAlerts(
      tenantId,
      data.equipmentId,
      data.sensorType,
      data.value
    );

    return {
      success: true,
      reading,
      alertsCreated,
      connectionStatusUpdated,
    };
  } catch (error) {
    console.error("Error ingesting sensor data:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      alertsCreated,
      connectionStatusUpdated,
    };
  }
}

/**
 * Determine the status of a sensor reading based on value
 */
function determineReadingStatus(sensorType: string, value: number): string {
  // Food safety thresholds (HACCP compliant)
  const COLD_HOLDING_MAX = 4; // °C
  const HOT_HOLDING_MIN = 57; // °C
  const DANGER_ZONE_MIN = 5; // °C
  const DANGER_ZONE_MAX = 57; // °C
  const FREEZER_MAX = -18; // °C

  switch (sensorType) {
    case "temperature":
      if (value >= DANGER_ZONE_MIN && value <= DANGER_ZONE_MAX) {
        return "critical"; // Danger zone!
      }
      if (value > COLD_HOLDING_MAX && value < HOT_HOLDING_MIN) {
        return "warning"; // Between safe cold and hot holding
      }
      if (value > FREEZER_MAX && value < COLD_HOLDING_MAX) {
        return "normal";
      }
      if (value > HOT_HOLDING_MIN) {
        return "normal"; // Hot holding is good
      }
      if (value <= FREEZER_MAX) {
        return "normal"; // Freezer is good
      }
      return "warning";

    case "humidity":
      if (value < 30 || value > 70) {
        return "warning";
      }
      return "normal";

    case "door":
      // Boolean: 1 = open (warning), 0 = closed (normal)
      return value > 0 ? "warning" : "normal";

    case "vibration":
      // Vibration in Hz - high values indicate issues
      if (value > 100) {
        return "critical";
      }
      if (value > 50) {
        return "warning";
      }
      return "normal";

    case "energy":
      // Energy in kW - spike detection
      if (value > 50) {
        return "critical";
      }
      if (value > 30) {
        return "warning";
      }
      return "normal";

    case "pressure":
      // Pressure in PSI
      if (value < 10 || value > 100) {
        return "critical";
      }
      if (value < 20 || value > 80) {
        return "warning";
      }
      return "normal";

    default:
      return "normal";
  }
}

/**
 * Batch ingest multiple sensor readings
 */
export async function batchIngestSensorData(
  tenantId: string,
  readings: SensorDataIngest[]
): Promise<IngestResult[]> {
  const results = await Promise.all(
    readings.map((reading) => ingestSensorData(tenantId, reading))
  );
  return results;
}

/**
 * Get current sensor data for equipment
 */
export async function getEquipmentSensorData(
  tenantId: string,
  equipmentId: string
): Promise<{
  equipment: Pick<
    Equipment,
    "id" | "name" | "connectionStatus" | "lastHeartbeat" | "currentSensorData"
  >;
  latestReadings: SensorReading[];
  activeAlerts: number;
}> {
  const equipment = await database.equipment.findUnique({
    where: { id: equipmentId },
    select: {
      id: true,
      name: true,
      connectionStatus: true,
      lastHeartbeat: true,
      currentSensorData: true,
    },
  });

  if (!equipment) {
    throw new Error("Equipment not found");
  }

  // Get latest readings from last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const latestReadings = await database.sensorReading.findMany({
    where: {
      tenantId,
      equipmentId,
      timestamp: { gte: oneHourAgo },
    },
    orderBy: { timestamp: "desc" },
    take: 60, // Last 60 readings (assuming 1/min interval)
  });

  // Count active alerts
  const activeAlerts = await database.iotAlert.count({
    where: {
      tenantId,
      equipmentId,
      status: "active",
    },
  });

  return {
    equipment,
    latestReadings,
    activeAlerts,
  };
}

/**
 * Get all IoT-enabled equipment for a tenant
 */
export async function getIoTEquipment(
  tenantId: string,
  locationId?: string
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    locationId: string;
    iotDeviceId: string | null;
    connectionStatus: string;
    lastHeartbeat: Date | null;
    currentSensorData: Record<string, unknown> | null;
  }>
> {
  const equipment = await database.equipment.findMany({
    where: {
      tenantId,
      locationId: locationId ?? undefined,
      iotDeviceId: { not: null },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      locationId: true,
      iotDeviceId: true,
      connectionStatus: true,
      lastHeartbeat: true,
      currentSensorData: true,
    },
  });

  return equipment;
}

/**
 * Check all IoT devices for offline status and create alerts
 */
export async function checkAllDevicesHeartbeat(
  tenantId: string,
  offlineMinutes = 15
): Promise<void> {
  const iotEquipment = await getIoTEquipment(tenantId);

  const offlineThreshold = new Date(Date.now() - offlineMinutes * 60 * 1000);

  for (const equipment of iotEquipment) {
    const isOffline = await checkDeviceHeartbeat(
      tenantId,
      equipment.id,
      offlineMinutes
    );

    if (isOffline && equipment.lastHeartbeat) {
      await createOfflineAlert(tenantId, equipment.id, equipment.lastHeartbeat);

      // Update connection status
      await database.equipment.update({
        where: { id: equipment.id },
        data: { connectionStatus: "disconnected" },
      });
    }
  }
}

/**
 * Register a new IoT device for equipment
 */
export async function registerIoTDevice(
  tenantId: string,
  equipmentId: string,
  deviceData: {
    deviceId: string;
    deviceType: string;
    manufacturer?: string;
    model?: string;
  }
): Promise<Equipment> {
  return database.equipment.update({
    where: { id: equipmentId },
    data: {
      iotDeviceId: deviceData.deviceId,
      iotDeviceType: deviceData.deviceType,
      connectionStatus: "connected",
      lastHeartbeat: new Date(),
    },
  });
}

/**
 * Get sensor readings for a time range (for charts/history)
 */
export async function getSensorReadingsHistory(
  tenantId: string,
  equipmentId: string,
  sensorType: string,
  startDate: Date,
  endDate: Date
): Promise<SensorReading[]> {
  return database.sensorReading.findMany({
    where: {
      tenantId,
      equipmentId,
      sensorType,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: "asc" },
  });
}
