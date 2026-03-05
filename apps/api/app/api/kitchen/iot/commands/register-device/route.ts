/**
 * @module RegisterIoTDevice
 * @command Register IoT device to equipment
 * @description Associate an IoT device with kitchen equipment for monitoring
 * @domain Kitchen
 * @tags iot, device-registration, command
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { registerIoTDevice } from "@/app/lib/iot-monitoring";
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

    const { equipment_id, device_id, device_type } = body;

    if (!(equipment_id && device_id && device_type)) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["equipment_id", "device_id", "device_type"],
        },
        { status: 400 }
      );
    }

    const validDeviceTypes = [
      "temperature_probe",
      "door_sensor",
      "vibration_monitor",
      "energy_meter",
      "humidity_sensor",
      "pressure_sensor",
    ];

    if (!validDeviceTypes.includes(device_type)) {
      return NextResponse.json(
        {
          error: "Invalid device_type",
          valid_types: validDeviceTypes,
        },
        { status: 400 }
      );
    }

    const equipment = await registerIoTDevice(tenantId, equipment_id, {
      deviceId: device_id,
      deviceType: device_type,
      manufacturer: body.manufacturer,
      model: body.model,
    });

    return NextResponse.json({
      success: true,
      equipment: {
        id: equipment.id,
        name: equipment.name,
        iotDeviceId: equipment.iotDeviceId,
        iotDeviceType: equipment.iotDeviceType,
        connectionStatus: equipment.connectionStatus,
      },
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
