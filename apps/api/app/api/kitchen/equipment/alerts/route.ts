// Predictive Failure Alerts API Endpoint
//
// GET /api/kitchen/equipment/alerts - Get equipment predictive failure alerts
//
// Computes alerts based on usage approaching max, overdue maintenance,
// warranty expiration, condition degradation, and IoT disconnection.

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

type Severity = "critical" | "warning" | "info";

interface EquipmentAlert {
  alertType: string;
  currentValue: string;
  equipmentId: string;
  equipmentName: string;
  message: string;
  metric: string;
  severity: Severity;
  threshold: string;
}

export async function GET(_request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const equipment = await database.equipment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        workOrders: {
          where: { status: { in: ["open", "in_progress"] } },
          select: { id: true, type: true, status: true },
        },
      },
    });

    const alerts: EquipmentAlert[] = [];

    for (const eq of equipment) {
      const usageRatio = eq.usageHours / eq.maxUsageHours;

      // Usage approaching max
      if (usageRatio >= 0.9) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "usage_critical",
          severity: "critical",
          message: `${eq.name} has reached ${Math.round(usageRatio * 100)}% of max usage hours`,
          metric: "usage_hours",
          threshold: `${eq.maxUsageHours}h`,
          currentValue: `${Math.round(eq.usageHours)}h`,
        });
      } else if (usageRatio >= 0.8) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "usage_warning",
          severity: "warning",
          message: `${eq.name} approaching max usage (${Math.round(usageRatio * 100)}%)`,
          metric: "usage_hours",
          threshold: `${eq.maxUsageHours}h`,
          currentValue: `${Math.round(eq.usageHours)}h`,
        });
      }

      // Overdue maintenance
      if (eq.nextMaintenanceDate && eq.nextMaintenanceDate < now) {
        const daysOverdue = Math.floor(
          (now.getTime() - eq.nextMaintenanceDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "maintenance_overdue",
          severity: daysOverdue > 30 ? "critical" : "warning",
          message: `${eq.name} maintenance overdue by ${daysOverdue} days`,
          metric: "next_maintenance_date",
          threshold: "today",
          currentValue: eq.nextMaintenanceDate.toISOString().slice(0, 10),
        });
      }

      // Warranty expiring within 30 days
      if (
        eq.warrantyExpiry &&
        eq.warrantyExpiry <= thirtyDaysFromNow &&
        eq.warrantyExpiry > now
      ) {
        const daysLeft = Math.ceil(
          (eq.warrantyExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "warranty_expiring",
          severity: "info",
          message: `${eq.name} warranty expires in ${daysLeft} days`,
          metric: "warranty_expiry",
          threshold: "30 days",
          currentValue: eq.warrantyExpiry.toISOString().slice(0, 10),
        });
      } else if (eq.warrantyExpiry && eq.warrantyExpiry <= now) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "warranty_expired",
          severity: "warning",
          message: `${eq.name} warranty has expired`,
          metric: "warranty_expiry",
          threshold: "today",
          currentValue: eq.warrantyExpiry.toISOString().slice(0, 10),
        });
      }

      // Poor condition
      if (eq.condition === "poor" || eq.condition === "needs_replacement") {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "condition_degraded",
          severity:
            eq.condition === "needs_replacement" ? "critical" : "warning",
          message: `${eq.name} condition: ${eq.condition}`,
          metric: "condition",
          threshold: "good",
          currentValue: eq.condition,
        });
      }

      // IoT device disconnected
      if (eq.iotDeviceId && eq.connectionStatus === "disconnected") {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "iot_disconnected",
          severity: "info",
          message: `${eq.name} IoT device (${eq.iotDeviceId}) is disconnected`,
          metric: "connection_status",
          threshold: "connected",
          currentValue: "disconnected",
        });
      }
    }

    // Sort: critical first, then warning, then info
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    alerts.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    );

    const summary = {
      total: alerts.length,
      bySeverity: {
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
      },
    };

    return manifestSuccessResponse({ alerts, summary });
  } catch (error) {
    captureException(error);
    log.error("Error fetching equipment alerts:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
