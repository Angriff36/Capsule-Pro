import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/kitchen/iot/alerts/[id]
 * Acknowledge or resolve an IoT alert via Manifest runtime.
 * Pre-validation (existing alert lookup, status check) is a read per constitution §10.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const currentUser = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
    });
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status, resolutionNotes } = body as {
      status?: string;
      resolutionNotes?: string;
    };

    if (!(status && ["acknowledged", "resolved"].includes(status))) {
      return NextResponse.json(
        { error: "Status must be 'acknowledged' or 'resolved'" },
        { status: 400 }
      );
    }

    // Pre-validation: read existing alert (constitution §10 — reads bypass Manifest)
    const existing = await database.ioTAlert.findFirst({
      where: { tenantId, id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    if (existing.status === "resolved") {
      return NextResponse.json(
        { error: "Alert is already resolved" },
        { status: 400 }
      );
    }

    // If resolving an unacknowledged alert, acknowledge first (idempotent via Manifest)
    if (status === "resolved" && !existing.acknowledgedAt) {
      await runManifestCommand({
        entity: "IoTAlert",
        command: "acknowledge",
        body: {},
        user: { id: currentUser.id, tenantId, role: "" },
        instanceId: id,
      });
    }

    // Delegate status transition to Manifest runtime
    const command = status === "acknowledged" ? "acknowledge" : "markResolved";
    const commandBody: Record<string, unknown> = {};
    if (status === "resolved" && resolutionNotes) {
      commandBody.resolutionNotes = resolutionNotes;
    }

    log.info("[IoTAlert/PATCH] Delegating to Manifest runtime", {
      id,
      command,
      userId: currentUser.id,
      tenantId,
    });

    return runManifestCommand({
      entity: "IoTAlert",
      command,
      body: commandBody,
      user: { id: currentUser.id, tenantId, role: "" },
      instanceId: id,
    });
  } catch (error) {
    captureException(error);
    log.error("Update IoT alert error:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
