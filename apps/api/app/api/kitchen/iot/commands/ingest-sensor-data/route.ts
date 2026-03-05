/**
 * @module IngestSensorData
 * @command Ingest IoT sensor data
 * @description Receive and process sensor readings from IoT devices
 * @domain Kitchen
 * @tags iot, sensor-ingest, command
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { ingestSensorData } from "@/app/lib/iot-monitoring";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const body = await request.json();

    // Validate required fields
    const { equipment_id, sensor_type, value, unit } = body;

    if (!(equipment_id && sensor_type) || value === undefined || !unit) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["equipment_id", "sensor_type", "value", "unit"],
        },
        { status: 400 }
      );
    }

    // Ingest the sensor data
    const result = await ingestSensorData(tenantId, {
      equipmentId: equipment_id,
      sensorType: sensor_type,
      value: Number.parseFloat(String(value)),
      unit,
      timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
      metadata: body.metadata,
      deviceId: body.device_id,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to ingest sensor data",
          details: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reading: result.reading,
      alerts_created: result.alertsCreated,
      connection_status_updated: result.connectionStatusUpdated,
    });
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
