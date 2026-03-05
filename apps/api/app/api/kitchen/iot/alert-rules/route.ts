/**
 * @module IotAlertRulesAPI
 * @query Fetch IoT alert rules
 * @description Get alert rule configurations for IoT equipment
 * @domain Kitchen
 * @tags iot, alert-rules, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get("equipment_id");
    const isActive = searchParams.get("is_active");

    const where: Prisma.IotAlertRuleWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    const rules = await database.iotAlertRule.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Create a new IoT alert rule
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const body = await request.json();

    const {
      equipment_id,
      name,
      description,
      sensor_type,
      condition,
      threshold,
      threshold_min,
      threshold_min,
      threshold_max,
      severity,
      duration_ms,
      alert_action,
      notify_roles,
      notify_channels,
    } = body;

    if (!(equipment_id && name && sensor_type && condition)) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["equipment_id", "name", "sensor_type", "condition"],
        },
        { status: 400 }
      );
    }

    const validConditions = [
      "gt",
      "lt",
      "eq",
      "gte",
      "lte",
      "outside_range",
      "inside_range",
    ];
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        {
          error: "Invalid condition",
          valid_conditions: validConditions,
        },
        { status: 400 }
      );
    }

    const validSeverities = ["info", "warning", "critical", "emergency"];
    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        {
          error: "Invalid severity",
          valid_severities: validSeverities,
        },
        { status: 400 }
      );
    }

    const rule = await database.iotAlertRule.create({
      data: {
        tenantId,
        equipmentId: equipment_id,
        name,
        description,
        sensorType: sensor_type,
        condition,
        threshold:
          threshold !== undefined ? Number.parseFloat(String(threshold)) : null,
        thresholdMin:
          threshold_min !== undefined
            ? Number.parseFloat(String(threshold_min))
            : null,
        thresholdMax:
          threshold_max !== undefined
            ? Number.parseFloat(String(threshold_max))
            : null,
        severity: severity ?? "warning",
        durationMs: duration_ms ?? 0,
        alertAction: alert_action ?? "notification",
        notifyRoles: notify_roles ?? [],
        notifyChannels: notify_channels ?? ["in_app"],
        isActive: true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
