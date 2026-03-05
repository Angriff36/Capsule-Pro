/**
 * @module IotAlertsAPI
 * @query Fetch IoT alerts
 * @description Get IoT monitoring alerts with filtering
 * @domain Kitchen
 * @tags iot, alerts, api
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
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const alertType = searchParams.get("alert_type");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const where: Prisma.IotAlertWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (alertType) {
      where.alertType = alertType;
    }

    const alerts = await database.iotAlert.findMany({
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
      orderBy: { triggeredAt: "desc" },
      take: limit ? Number.parseInt(limit, 10) : 50,
      skip: offset ? Number.parseInt(offset, 10) : 0,
    });

    const totalCount = await database.iotAlert.count({ where });

    return NextResponse.json({
      alerts,
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
