/**
 * @module FoodSafetyLogsAPI
 * @query Fetch food safety compliance logs
 * @description Get HACCP compliance logs with filtering
 * @domain Kitchen
 * @tags food-safety, haccp, logs, api
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
    const logType = searchParams.get("log_type");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const iotGenerated = searchParams.get("iot_generated");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const where: Prisma.FoodSafetyLogWhereInput = {
      tenantId,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (logType) {
      where.logType = logType;
    }

    if (startDate || endDate) {
      where.logDate = {};
      if (startDate) {
        where.logDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.logDate.lte = new Date(endDate);
      }
    }

    if (iotGenerated !== null) {
      where.iotGenerated = iotGenerated === "true";
    }

    const logs = await database.foodSafetyLog.findMany({
      where,
      orderBy: { logDate: "desc" },
      take: limit ? Number.parseInt(limit, 10) : 50,
      skip: offset ? Number.parseInt(offset, 10) : 0,
    });

    const totalCount = await database.foodSafetyLog.count({ where });

    return NextResponse.json({
      logs,
      pagination: {
        total: totalCount,
        limit: limit ? Number.parseInt(limit, 10) : 50,
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

/**
 * Create a manual food safety log entry
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
      log_type,
      temperature,
      notes,
      requires_action,
      action_taken,
    } = body;

    if (!(equipment_id && log_type)) {
      return NextResponse.json(
        { error: "Missing required fields: equipment_id, log_type" },
        { status: 400 }
      );
    }

    const validLogTypes = [
      "temperature_check",
      "thawing",
      "cooking",
      "cooling",
      "reheating",
      "hot_holding",
      "cold_holding",
      "corrective_action",
    ];

    if (!validLogTypes.includes(log_type)) {
      return NextResponse.json(
        {
          error: "Invalid log_type",
          valid_types: validLogTypes,
        },
        { status: 400 }
      );
    }

    const log = await database.foodSafetyLog.create({
      data: {
        tenantId,
        equipmentId: equipment_id,
        logType: log_type,
        logDate: new Date(),
        temperature:
          temperature !== undefined
            ? Number.parseFloat(String(temperature))
            : null,
        loggedBy: userId,
        requiresAction: requires_action ?? false,
        actionTaken: action_taken,
        iotGenerated: false,
        notes,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
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
