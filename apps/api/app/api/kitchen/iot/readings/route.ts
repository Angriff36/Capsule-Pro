import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { clampLimit } from "@/lib/pagination";

/**
 * GET /api/kitchen/iot/readings
 * Get recent temperature readings from probes (read — bypasses Manifest per §10).
 */
export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const probeId = searchParams.get("probeId");
    const hours = Number.parseInt(searchParams.get("hours") || "24", 10);
    const limit = clampLimit(searchParams.get("limit"), 1000, 1000);

    const where: Record<string, unknown> = { tenantId };
    if (probeId) {
      where.probeId = probeId;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const readings = await database.temperatureReading.findMany({
      where: {
        ...where,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ readings });
  } catch (error) {
    captureException(error);
    log.error("List readings error:", error);
    return NextResponse.json(
      { error: "Failed to list readings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/readings
 * Record a new temperature reading from a probe via Manifest runtime.
 * Post-create side-effects (probe status update, conditional alert creation)
 * also route through Manifest commands.
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const employeeId = (await requireCurrentUser()).id;

    const body = await request.json();
    const { probeId, temperature } = body;

    if (!probeId || temperature === undefined) {
      return NextResponse.json(
        { error: "Probe ID and temperature are required" },
        { status: 400 }
      );
    }

    // withinRange is derived from the probe's thresholds, not client-supplied.
    const probeForRange = await database.temperatureProbe.findUnique({
      where: { tenantId_id: { tenantId, id: probeId } },
    });
    const withinRange = probeForRange
      ? temperature >= Number(probeForRange.minTemp) &&
        temperature <= Number(probeForRange.maxTemp)
      : true;

    // Delegate reading creation to Manifest runtime
    const result = await runManifestCommand({
      entity: "TemperatureReading",
      command: "create",
      body: {
        probeId,
        temperature,
        withinRange,
      },
      user: { id: employeeId, tenantId, role: "" },
    });

    // Side-effect: check for alerts via configurable alert rules, then probe thresholds
    // Alert reads are §10-compliant; alert creation delegates to Manifest
    try {
      const probe = await database.temperatureProbe.findUnique({
        where: { tenantId_id: { tenantId, id: probeId } },
      });

      let triggeredRule: {
        name: string;
        severity: string;
        condition: string;
        threshold: number | null;
        thresholdMin: number | null;
        thresholdMax: number | null;
      } | null = null;

      if (probe?.locationId) {
        const equipmentAtLocation = await database.equipment.findMany({
          where: { tenantId, locationId: probe.locationId, deletedAt: null },
          select: { id: true },
        });
        const equipmentIds = equipmentAtLocation.map((e) => e.id);

        if (equipmentIds.length > 0) {
          const activeRules = await database.iotAlertRule.findMany({
            where: {
              tenantId,
              equipmentId: { in: equipmentIds },
              sensorType: "temperature",
              isActive: true,
              deletedAt: null,
            },
          });

          for (const rule of activeRules) {
            let breached = false;
            if (rule.condition === "above" && rule.threshold !== null) {
              breached = temperature > rule.threshold;
            } else if (rule.condition === "below" && rule.threshold !== null) {
              breached = temperature < rule.threshold;
            } else if (
              rule.condition === "outside_range" &&
              rule.thresholdMin !== null &&
              rule.thresholdMax !== null
            ) {
              breached =
                temperature < rule.thresholdMin ||
                temperature > rule.thresholdMax;
            }
            if (breached) {
              triggeredRule = rule;
              break;
            }
          }
        }
      }

      if (triggeredRule) {
        const alertCount = await database.ioTAlert.count({
          where: { tenantId },
        });
        const alertNumber = `ALT-${String(alertCount + 1).padStart(6, "0")}`;

        await runManifestCommand({
          entity: "IoTAlert",
          command: "create",
          body: {
            alertNumber,
            probeId,
            alertType: "rule_violation",
            severity: triggeredRule.severity || "warning",
            title: `Alert Rule: ${triggeredRule.name}`,
            message: `Temperature ${temperature}°C violated rule "${triggeredRule.name}" (${triggeredRule.condition})`,
            temperature,
            ruleId: "",
            value: 0,
            triggeredAt: new Date(),
          },
          user: { id: employeeId, tenantId, role: "" },
        });
      } else if (
        probe &&
        (temperature < probe.minTemp || temperature > probe.maxTemp)
      ) {
        const alertCount = await database.ioTAlert.count({
          where: { tenantId },
        });
        const alertNumber = `ALT-${String(alertCount + 1).padStart(6, "0")}`;

        await runManifestCommand({
          entity: "IoTAlert",
          command: "create",
          body: {
            alertNumber,
            probeId,
            alertType: temperature < probe.minTemp ? "low_temp" : "high_temp",
            severity: "warning",
            title:
              temperature < probe.minTemp
                ? "Low Temperature"
                : "High Temperature",
            message: `Temperature ${temperature}°C is outside safe range (${probe.minTemp}°C - ${probe.maxTemp}°C)`,
            temperature,
            ruleId: "",
            value: 0,
            triggeredAt: new Date(),
          },
          user: { id: employeeId, tenantId, role: "" },
        });
      }
    } catch (alertError) {
      // Alert creation is non-fatal — the reading was already recorded
      log.error("[IoTReadings/POST] Alert check failed:", alertError);
    }

    return result;
  } catch (error) {
    captureException(error);
    log.error("Create reading error:", error);
    return NextResponse.json(
      { error: "Failed to record reading" },
      { status: 500 }
    );
  }
}
