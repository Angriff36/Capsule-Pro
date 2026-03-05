/**
 * @module EquipmentStatusAPI
 * @query Get IoT-enabled equipment status
 * @description Get connection status and latest sensor data for IoT equipment
 * @domain Kitchen
 * @tags iot, equipment, status, api
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import {
  checkAllDevicesHeartbeat,
  getEquipmentSensorData,
  getIoTEquipment,
} from "@/app/lib/iot-monitoring";
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
    const locationId = searchParams.get("location_id");
    const includeLatestData =
      searchParams.get("include_latest_data") === "true";

    // Get all IoT-enabled equipment
    const equipment = await getIoTEquipment(tenantId, locationId ?? undefined);

    let equipmentWithStatus = equipment;

    // Optionally fetch latest sensor data for each equipment
    if (includeLatestData) {
      equipmentWithStatus = await Promise.all(
        equipment.map(async (eq) => {
          try {
            const sensorData = await getEquipmentSensorData(tenantId, eq.id);
            return {
              ...eq,
              latestReadings: sensorData.latestReadings,
              activeAlerts: sensorData.activeAlerts,
            };
          } catch {
            return eq;
          }
        })
      );
    }

    return NextResponse.json({
      equipment: equipmentWithStatus,
      total: equipment.length,
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

/**
 * Trigger a heartbeat check for all IoT devices
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
    const offlineMinutes = body.offline_minutes ?? 15;

    // Run heartbeat check asynchronously
    await checkAllDevicesHeartbeat(tenantId, offlineMinutes);

    return NextResponse.json({
      success: true,
      message: "Heartbeat check completed",
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
