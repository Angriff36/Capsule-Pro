/**
 * @module AcknowledgeIotAlert
 * @command Acknowledge an IoT alert
 * @description Mark an IoT alert as acknowledged by a user
 * @domain Kitchen
 * @tags iot, alerts, command
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
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
    const { alert_id } = body;

    if (!alert_id) {
      return NextResponse.json(
        { error: "Missing required field: alert_id" },
        { status: 400 }
      );
    }

    // Verify the alert belongs to the tenant
    const alert = await database.iotAlert.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: alert_id,
        },
      });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Update the alert
    const updated = await database.iotAlert.update({
      where: {
        tenantId_id: {
          tenantId,
          id: alert_id,
        },
      },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      alert: updated,
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
