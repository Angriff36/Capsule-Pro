/**
 * IoT Alerts API Routes
 *
 * POST creates alerts via Manifest runtime (after alert number generation pre-processing).
 * Email notification dispatch runs as a post-create side-effect (not a governed write).
 * GET reads bypass runtime per constitution §10.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { sendEmailNotification } from "@repo/notifications";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * GET /api/kitchen/iot/alerts
 * List active IoT alerts (read — bypasses Manifest per §10).
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
    const status = searchParams.get("status") || "active";

    const where: Record<string, unknown> = { tenantId, status };
    if (probeId) {
      where.probeId = probeId;
    }

    const alerts = await database.ioTAlert.findMany({
      where,
      include: {
        probe: true,
      },
      orderBy: { triggeredAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    captureException(error);
    log.error("List IoT alerts error:", error);
    return NextResponse.json(
      { error: "Failed to list alerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/kitchen/iot/alerts
 * Create/trigger an IoT alert via Manifest runtime.
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
    const { probeId, alertType, severity, message, temperature } = body;

    if (!(probeId && alertType && message)) {
      return NextResponse.json(
        { error: "Probe ID, alert type, and message are required" },
        { status: 400 }
      );
    }

    // Pre-processing: generate alert number (read — bypasses Manifest per §10)
    const alertCount = await database.ioTAlert.count({ where: { tenantId } });
    const alertNumber = `ALT-${String(alertCount + 1).padStart(6, "0")}`;

    // Delegate creation to Manifest runtime
    const result = await runManifestCommand({
      entity: "IoTAlert",
      command: "create",
      body: {
        probeId,
        ruleId: "",
        severity: severity || "warning",
        message,
        value: 0,
        triggeredAt: new Date(),
        alertNumber,
        alertType,
        title: alertType,
        temperature: temperature ?? 0,
      },
      user: { id: employeeId, tenantId, role: "" },
    });

    // Post-create side-effect: dispatch email notification to managers/kitchen staff
    try {
      const staff = await database.user.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          role: { in: ["admin", "manager", "kitchen_manager"] },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
        take: 50,
      });

      if (staff.length > 0) {
        const tempStr =
          temperature == null ? "N/A" : `${Number(temperature).toFixed(1)}°F`;
        const subject = `[IoT Alert] ${alertType} — ${probeId ?? "Unknown probe"}`;
        const emailBody = [
          "<h2>IoT Temperature Alert</h2>",
          `<p><strong>Alert:</strong> ${alertType}</p>`,
          `<p><strong>Probe:</strong> ${probeId ?? "Unknown"}</p>`,
          `<p><strong>Temperature:</strong> ${tempStr}</p>`,
          `<p><strong>Severity:</strong> ${severity || "warning"}</p>`,
          `<p><strong>Message:</strong> ${message}</p>`,
          `<p><strong>Alert #:</strong> ${alertNumber}</p>`,
          `<p><em>Triggered at ${new Date().toISOString()}</em></p>`,
        ].join("\n");

        const recipients = staff.map((s) => ({
          email: s.email,
          employeeId: s.id,
          name: `${s.firstName} ${s.lastName}`.trim(),
        }));

        await sendEmailNotification(database, {
          tenantId,
          notificationType: "iot_alert",
          recipients,
          subject,
          body: emailBody,
        });
      }
    } catch (notifError) {
      // Notification failure must not block the alert write
      captureException(notifError);
      log.error("IoT alert notification dispatch failed:", notifError);
    }

    return NextResponse.json({ alert: result });
  } catch (error) {
    captureException(error);
    log.error("Create IoT alert error:", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
