// Predictive Failure Alerts API Endpoint
//
// GET /api/kitchen/equipment/alerts - Get equipment predictive failure alerts
//
// This endpoint analyzes equipment data and provides predictive failure alerts based on:
// 1. Overdue maintenance schedules
// 2. High usage percentages approaching end of life
// 3. Equipment condition ratings
// 4. Warranty expiration status

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface PredictiveAlert {
  equipmentId: string;
  equipmentName: string;
  alertType:
    | "maintenance_overdue"
    | "high_usage"
    | "poor_condition"
    | "warranty_expiring"
    | "predicted_failure";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  details: Record<string, unknown>;
  recommendedAction: string;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const minSeverity = searchParams.get("minSeverity") || "low";

    const now = new Date();
    const alerts: PredictiveAlert[] = [];

    // Get all active equipment
    const equipment = await database.equipment.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { not: "retired" },
      },
    });

    for (const eq of equipment) {
      // Check for overdue maintenance
      if (eq.nextMaintenanceDate && eq.nextMaintenanceDate < now) {
        const daysOverdue = Math.floor(
          (now.getTime() - eq.nextMaintenanceDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "maintenance_overdue",
          severity:
            daysOverdue > 14 ? "critical" : daysOverdue > 7 ? "high" : "medium",
          message: `Maintenance for ${eq.name} is overdue by ${daysOverdue} day(s)`,
          details: {
            nextMaintenanceDate: eq.nextMaintenanceDate,
            daysOverdue,
          },
          recommendedAction:
            "Schedule maintenance immediately. Consider equipment status until maintenance is complete.",
        });
      }
      // Check for upcoming maintenance within 7 days
      else if (eq.nextMaintenanceDate) {
        const daysUntil = Math.floor(
          (eq.nextMaintenanceDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysUntil <= 7) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            alertType: "maintenance_overdue",
            severity: "low",
            message: `Maintenance for ${eq.name} is due in ${daysUntil} day(s)`,
            details: {
              nextMaintenanceDate: eq.nextMaintenanceDate,
              daysUntil,
            },
            recommendedAction:
              "Schedule maintenance to avoid conflicts with upcoming events.",
          });
        }
      }

      // Check for high usage
      if (eq.maxUsageHours > 0) {
        const usagePercentage = (eq.usageHours / eq.maxUsageHours) * 100;
        if (usagePercentage >= 90) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            alertType: "high_usage",
            severity: "critical",
            message: `${eq.name} has reached ${usagePercentage.toFixed(1)}% of its recommended usage limit`,
            details: {
              usageHours: eq.usageHours,
              maxUsageHours: eq.maxUsageHours,
              usagePercentage: usagePercentage.toFixed(1),
            },
            recommendedAction:
              "Plan for equipment replacement. Consider backup options for critical operations.",
          });
        } else if (usagePercentage >= 80) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            alertType: "high_usage",
            severity: "high",
            message: `${eq.name} has reached ${usagePercentage.toFixed(1)}% of its recommended usage limit`,
            details: {
              usageHours: eq.usageHours,
              maxUsageHours: eq.maxUsageHours,
              usagePercentage: usagePercentage.toFixed(1),
            },
            recommendedAction:
              "Monitor equipment closely and budget for replacement.",
          });
        }
      }

      // Check for poor condition
      if (eq.condition === "poor") {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "poor_condition",
          severity: "high",
          message: `${eq.name} is in poor condition and should be inspected`,
          details: {
            condition: eq.condition,
          },
          recommendedAction:
            "Schedule inspection and repair. Consider replacement if repair costs exceed replacement value.",
        });
      } else if (eq.condition === "fair") {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "poor_condition",
          severity: "medium",
          message: `${eq.name} is in fair condition - monitor performance`,
          details: {
            condition: eq.condition,
          },
          recommendedAction:
            "Increase inspection frequency. Plan for potential maintenance or replacement.",
        });
      }

      // Check for warranty expiration
      if (eq.warrantyExpiry) {
        const daysUntilWarrantyExpiry = Math.floor(
          (eq.warrantyExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilWarrantyExpiry < 0) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            alertType: "warranty_expiring",
            severity: "low",
            message: `Warranty for ${eq.name} has expired`,
            details: {
              warrantyExpiry: eq.warrantyExpiry,
              daysExpired: Math.abs(daysUntilWarrantyExpiry),
            },
            recommendedAction:
              "Budget for potential repairs as warranty coverage is no longer available.",
          });
        } else if (daysUntilWarrantyExpiry <= 30) {
          alerts.push({
            equipmentId: eq.id,
            equipmentName: eq.name,
            alertType: "warranty_expiring",
            severity: "low",
            message: `Warranty for ${eq.name} expires in ${daysUntilWarrantyExpiry} day(s)`,
            details: {
              warrantyExpiry: eq.warrantyExpiry,
              daysUntil: daysUntilWarrantyExpiry,
            },
            recommendedAction:
              "Schedule any warranty repairs before expiration. Consider extended warranty if available.",
          });
        }
      }

      // Predictive failure assessment based on combined factors
      const riskScore = calculatePredictiveFailureRisk(eq);
      if (riskScore >= 0.7) {
        alerts.push({
          equipmentId: eq.id,
          equipmentName: eq.name,
          alertType: "predicted_failure",
          severity: riskScore >= 0.9 ? "critical" : "high",
          message: `High risk of equipment failure predicted for ${eq.name}`,
          details: {
            riskScore: riskScore.toFixed(2),
            factors: getRiskFactors(eq),
          },
          recommendedAction:
            "Immediately arrange backup equipment. Schedule urgent inspection and maintenance.",
        });
      }
    }

    // Filter by minimum severity
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
    const filteredAlerts = alerts.filter(
      (alert) =>
        severityRank[alert.severity] >=
        (severityRank[minSeverity as keyof typeof severityRank] || 0)
    );

    // Sort by severity (descending) and then by equipment name
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityRank[b.severity] - severityRank[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.equipmentName.localeCompare(b.equipmentName);
    });

    return manifestSuccessResponse({
      alerts: filteredAlerts,
      summary: {
        total: filteredAlerts.length,
        bySeverity: {
          critical: filteredAlerts.filter((a) => a.severity === "critical")
            .length,
          high: filteredAlerts.filter((a) => a.severity === "high").length,
          medium: filteredAlerts.filter((a) => a.severity === "medium").length,
          low: filteredAlerts.filter((a) => a.severity === "low").length,
        },
        byType: {
          maintenance_overdue: filteredAlerts.filter(
            (a) => a.alertType === "maintenance_overdue"
          ).length,
          high_usage: filteredAlerts.filter((a) => a.alertType === "high_usage")
            .length,
          poor_condition: filteredAlerts.filter(
            (a) => a.alertType === "poor_condition"
          ).length,
          warranty_expiring: filteredAlerts.filter(
            (a) => a.alertType === "warranty_expiring"
          ).length,
          predicted_failure: filteredAlerts.filter(
            (a) => a.alertType === "predicted_failure"
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching equipment alerts:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

function calculatePredictiveFailureRisk(equipment: {
  usageHours: number;
  maxUsageHours: number;
  condition: string;
  nextMaintenanceDate: Date | null;
  lastMaintenanceDate: Date | null;
  status: string;
}): number {
  let riskScore = 0;

  // Usage factor (0-0.4)
  if (equipment.maxUsageHours > 0) {
    const usageRatio = equipment.usageHours / equipment.maxUsageHours;
    riskScore += Math.min(usageRatio * 0.4, 0.4);
  }

  // Condition factor (0-0.3)
  const conditionScore: Record<string, number> = {
    excellent: 0,
    good: 0.05,
    fair: 0.15,
    poor: 0.3,
  };
  riskScore += conditionScore[equipment.condition] || 0.1;

  // Maintenance overdue factor (0-0.2)
  if (equipment.nextMaintenanceDate) {
    const daysOverdue = Math.floor(
      (Date.now() - equipment.nextMaintenanceDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysOverdue > 0) {
      riskScore += Math.min((daysOverdue / 60) * 0.2, 0.2); // Max at 60 days overdue
    }
  }

  // Status factor (0-0.1)
  if (equipment.status === "out_of_service") {
    riskScore += 0.1;
  }

  return Math.min(riskScore, 1);
}

function getRiskFactors(equipment: {
  usageHours: number;
  maxUsageHours: number;
  condition: string;
  nextMaintenanceDate: Date | null;
  status: string;
}): string[] {
  const factors: string[] = [];

  if (equipment.maxUsageHours > 0) {
    const usagePercentage =
      (equipment.usageHours / equipment.maxUsageHours) * 100;
    if (usagePercentage > 80) {
      factors.push(`High usage (${usagePercentage.toFixed(1)}% of lifespan)`);
    }
  }

  if (equipment.condition === "poor") {
    factors.push("Poor equipment condition");
  } else if (equipment.condition === "fair") {
    factors.push("Fair equipment condition");
  }

  if (
    equipment.nextMaintenanceDate &&
    equipment.nextMaintenanceDate < new Date()
  ) {
    factors.push("Overdue for maintenance");
  }

  if (equipment.status === "out_of_service") {
    factors.push("Currently out of service");
  }

  return factors.length > 0 ? factors : ["No specific risk factors identified"];
}
