/**
 * @module SensorReadingsAPI
 * @query Fetch sensor readings for equipment
 * @description Get historical sensor data for IoT-enabled equipment
 * @domain Kitchen
 * @tags iot, sensor-readings, api
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
    const sensorType = searchParams.get("sensor_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const where: Prisma.SensorReadingWhereInput = {
      tenantId,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (sensorType) {
      where.sensorType = sensorType;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    const readings = await database.sensorReading.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit ? Number.parseInt(limit, 10) : 100,
      skip: offset ? Number.parseInt(offset, 10) : 0,
    });

    const totalCount = await database.sensorReading.count({ where });

    return NextResponse.json({
      readings,
      pagination: {
        total: totalCount,
        limit: limit ? Number.parseInt(limit, 10) : 100,
        offset: offset ? Number.parseInt(offset, 10) : 0,
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
