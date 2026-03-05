/**
 * IoT Alert Service
 *
 * Handles evaluation of IoT sensor readings against alert rules,
 * generates alerts when thresholds are breached, and manages
 * food safety compliance notifications.
 *
 * @module IotAlertService
 * @tags iot, monitoring, food-safety
 */

import type { IotAlert, IotAlertRule } from "@repo/database";
import { database } from "@repo/database";

// Food safety temperature thresholds (HACCP compliant)
export const FOOD_SAFETY_THRESHOLDS = {
  cold_holding: { min: -1, max: 4, unit: "celsius" }, // 34-39°F
  hot_holding: { min: 57, max: 63, unit: "celsius" }, // 135-145°F
  cooking: { min: 63, max: 74, unit: "celsius" }, // 145-165°F (poultry)
  freezing: { min: -18, max: -12, unit: "celsius" }, // 0-10°F
  danger_zone: { min: 5, max: 57, unit: "celsius" }, // 41-135°F
} as const;

export interface AlertEvaluation {
  shouldAlert: boolean;
  severity: "info" | "warning" | "critical" | "emergency";
  ruleId?: string;
  threshold?: number;
  message: string;
  haccpActionRequired: boolean;
}

/**
 * Evaluate a sensor reading against active alert rules for the equipment
 */
export async function evaluateReading(
  tenantId: string,
  equipmentId: string,
  reading: {
    sensorType: string;
    value: number;
    timestamp: Date;
  }
): Promise<AlertEvaluation[]> {
  // Fetch active alert rules for this equipment
  const rules = await database.iotAlertRule.findMany({
    where: {
      tenantId,
      equipmentId,
      isActive: true,
      deletedAt: null,
    },
  });

  const results: AlertEvaluation[] = [];

  for (const rule of rules) {
    if (rule.sensorType !== reading.sensorType) {
      continue;
    }

    const evaluation = evaluateRule(rule, reading.value);
    if (evaluation.shouldAlert) {
      results.push({
        ...evaluation,
        ruleId: rule.id,
      });
    }
  }

  // Auto-check food safety compliance for temperature sensors
  if (reading.sensorType === "temperature") {
    const foodSafetyEval = evaluateFoodSafetyCompliance(
      reading.value,
      reading.timestamp
    );
    if (foodSafetyEval.shouldAlert) {
      results.push(foodSafetyEval);
    }
  }

  return results;
}

/**
 * Evaluate a single alert rule against a sensor value
 */
function evaluateRule(rule: IotAlertRule, value: number): AlertEvaluation {
  const { condition, threshold, thresholdMin, thresholdMax, severity } = rule;

  let shouldAlert = false;

  switch (condition) {
    case "gt":
      shouldAlert = threshold !== null && value > threshold;
      break;
    case "lt":
      shouldAlert = threshold !== null && value < threshold;
      break;
    case "eq":
      shouldAlert = threshold !== null && value === threshold;
      break;
    case "gte":
      shouldAlert = threshold !== null && value >= threshold;
      break;
    case "lte":
      shouldAlert = threshold !== null && value <= threshold;
      break;
    case "outside_range":
      shouldAlert =
        thresholdMin !== null &&
        thresholdMax !== null &&
        (value < thresholdMin || value > thresholdMax);
      break;
    case "inside_range":
      shouldAlert =
        thresholdMin !== null &&
        thresholdMax !== null &&
        value >= thresholdMin &&
        value <= thresholdMax;
      break;
    default:
      shouldAlert = false;
  }

  return {
    shouldAlert,
    severity: (severity ?? "warning") as AlertEvaluation["severity"],
    threshold: threshold ?? thresholdMax,
    message: `Alert rule "${rule.name}" triggered: value ${value} ${condition} ${threshold ?? thresholdMin}`,
    haccpActionRequired:
      rule.severity === "critical" || rule.severity === "emergency",
  };
}

/**
 * Evaluate temperature reading against food safety thresholds
 */
function evaluateFoodSafetyCompliance(
  temperature: number,
  timestamp: Date
): AlertEvaluation {
  const hour = timestamp.getHours();

  // Different rules apply based on time of day
  // During service hours, cold holding must be stricter
  const isServiceHour = hour >= 10 && hour <= 22;

  let shouldAlert = false;
  let severity: AlertEvaluation["severity"] = "warning";
  let message = "";

  // Check danger zone (most critical)
  if (
    temperature > FOOD_SAFETY_THRESHOLDS.danger_zone.min &&
    temperature < FOOD_SAFETY_THRESHOLDS.danger_zone.max
  ) {
    shouldAlert = true;
    severity = "critical";
    message = `Temperature in DANGER ZONE: ${temperature}°C (${((temperature * 9) / 5 + 32).toFixed(1)}°F). Immediate action required!`;
  }
  // Check cold holding compliance
  else if (temperature > FOOD_SAFETY_THRESHOLDS.cold_holding.max) {
    shouldAlert = true;
    severity = isServiceHour ? "critical" : "warning";
    message = `Cold holding temperature exceeded: ${temperature}°C (max ${FOOD_SAFETY_THRESHOLDS.cold_holding.max}°C)`;
  }
  // Check freezer temperature
  else if (temperature > FOOD_SAFETY_THRESHOLDS.freezing.max) {
    shouldAlert = true;
    severity = "warning";
    message = `Freezer temperature too warm: ${temperature}°C (max ${FOOD_SAFETY_THRESHOLDS.freezing.max}°C)`;
  }

  return {
    shouldAlert,
    severity,
    message,
    threshold: FOOD_SAFETY_THRESHOLDS.cold_holding.max,
    haccpActionRequired: severity === "critical" || severity === "emergency",
  };
}

/**
 * Create an IoT alert from a sensor reading evaluation
 */
export async function createAlert(
  tenantId: string,
  equipmentId: string,
  evaluation: AlertEvaluation,
  reading: {
    sensorType: string;
    value: number;
    timestamp: Date;
  }
): Promise<IotAlert> {
  const alertType = getAlertType(evaluation, reading.sensorType);

  const alert = await database.iotAlert.create({
    data: {
      tenantId,
      equipmentId,
      alertRuleId: evaluation.ruleId,
      alertType,
      severity: evaluation.severity,
      status: "active",
      title: generateAlertTitle(alertType, evaluation.severity),
      description: evaluation.message,
      readingValue: reading.value,
      threshold: evaluation.threshold,
      requiresHaccpAction: evaluation.haccpActionRequired,
      triggeredAt: reading.timestamp,
    },
  });

  // Create a food safety log entry if this is a temperature alert
  if (reading.sensorType === "temperature" && evaluation.haccpActionRequired) {
    await createFoodSafetyLogFromAlert(alert);
  }

  return alert;
}

/**
 * Determine alert type from evaluation and sensor type
 */
function getAlertType(evaluation: AlertEvaluation, sensorType: string): string {
  const alertTypeMap: Record<string, string> = {
    temperature: "temperature_violation",
    door: "door_open",
    vibration: "equipment_vibration",
    energy: "energy_spike",
    humidity: "humidity_violation",
    pressure: "pressure_violation",
  };

  return alertTypeMap[sensorType] || "sensor_anomaly";
}

/**
 * Generate human-readable alert title
 */
function generateAlertTitle(alertType: string, severity: string): string {
  const titles: Record<string, string> = {
    temperature_violation: `Temperature Alert (${severity.toUpperCase()})`,
    door_open: "Door Open Alert",
    equipment_vibration: "Equipment Vibration Detected",
    energy_spike: "Energy Consumption Spike",
    humidity_violation: "Humidity Alert",
    pressure_violation: "Pressure Alert",
    sensor_anomaly: "Sensor Anomaly Detected",
    device_offline: "Device Offline",
  };

  return (
    titles[alertType] ?? `${alertType.replace(/_/g, " ").toUpperCase()} Alert`
  );
}

/**
 * Create a food safety log entry from an IoT alert
 */
async function createFoodSafetyLogFromAlert(alert: IotAlert): Promise<void> {
  if (!alert.readingValue) return;

  // Determine log type based on alert type
  const logTypeMap: Record<string, string> = {
    temperature_violation: "cold_holding",
    door_open: "cold_holding", // Door open affects cold holding
  };

  const logType = logTypeMap[alert.alertType] ?? "temperature_check";

  await database.foodSafetyLog.create({
    data: {
      tenantId: alert.tenantId,
      equipmentId: alert.equipmentId,
      logType,
      logDate: alert.triggeredAt,
      temperature: alert.readingValue,
      targetTempMin: FOOD_SAFETY_THRESHOLDS.cold_holding.min,
      targetTempMax: FOOD_SAFETY_THRESHOLDS.cold_holding.max,
      isInSafeZone: false,
      requiresAction: true,
      iotGenerated: true,
      notes: `Auto-generated from IoT alert: ${alert.description}`,
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
      },
    },
  });
}

/**
 * Check if a device has gone offline (no recent heartbeat)
 */
export async function checkDeviceHeartbeat(
  tenantId: string,
  equipmentId: string,
  deviceOfflineMinutes = 15
): Promise<boolean> {
  const equipment = await database.equipment.findUnique({
    where: {
      id: equipmentId,
    },
    select: {
      lastHeartbeat: true,
      connectionStatus: true,
    },
  });

  if (!equipment) {
    return false;
  }

  if (equipment.connectionStatus === "disconnected") {
    return true;
  }

  if (!equipment.lastHeartbeat) {
    return true;
  }

  const offlineThreshold = new Date(
    Date.now() - deviceOfflineMinutes * 60 * 1000
  );

  return equipment.lastHeartbeat < offlineThreshold;
}

/**
 * Create an offline alert for a device that hasn't sent data recently
 */
export async function createOfflineAlert(
  tenantId: string,
  equipmentId: string,
  lastSeen: Date
): Promise<IotAlert | null> {
  // Check if there's already an active offline alert
  const existingAlert = await database.iotAlert.findFirst({
    where: {
      tenantId,
      equipmentId,
      alertType: "device_offline",
      status: "active",
    },
  });

  if (existingAlert) {
    return existingAlert;
  }

  return database.iotAlert.create({
    data: {
      tenantId,
      equipmentId,
      alertType: "device_offline",
      severity: "warning",
      status: "active",
      title: "Device Offline",
      description: `IoT device has not reported data since ${lastSeen.toISOString()}`,
      triggeredAt: new Date(),
    },
  });
}

/**
 * Resolve alerts that are no longer applicable
 */
export async function resolveStaleAlerts(
  tenantId: string,
  equipmentId: string,
  sensorType: string,
  currentValue: number
): Promise<void> {
  const activeAlerts = await database.iotAlert.findMany({
    where: {
      tenantId,
      equipmentId,
      status: "active",
    },
  });

  for (const alert of activeAlerts) {
    let shouldResolve = false;

    // Resolve if value is now within acceptable range
    if (alert.threshold && alert.readingValue) {
      const threshold = alert.threshold;
      const wasAbove = alert.readingValue > threshold;
      const isAbove = currentValue > threshold;

      if (wasAbove !== isAbove) {
        // Value crossed the threshold back to normal
        shouldResolve = true;
      }
    }

    if (shouldResolve) {
      await database.iotAlert.update({
        where: {
          tenantId_id: {
            tenantId: alert.tenantId,
            id: alert.id,
          },
        },
        data: {
          status: "resolved",
          resolvedAt: new Date(),
        },
      });
    }
  }
}
