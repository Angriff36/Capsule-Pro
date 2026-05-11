import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/kitchen/iot/alerts/[id]
 * Acknowledge or resolve an IoT alert
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

    if (!status || !["acknowledged", "resolved"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'acknowledged' or 'resolved'" },
        { status: 400 }
      );
    }

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

    const updateData: Record<string, unknown> = { status };
    if (status === "acknowledged") {
      updateData.acknowledgedAt = new Date();
      updateData.acknowledgedBy = currentUser.id;
    }
    if (status === "resolved") {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = currentUser.id;
      if (resolutionNotes) {
        updateData.resolutionNotes = resolutionNotes;
      }
      // If acknowledging for the first time while resolving, set both
      if (!existing.acknowledgedAt) {
        updateData.acknowledgedAt = new Date();
        updateData.acknowledgedBy = currentUser.id;
      }
    }

    const alert = await database.ioTAlert.update({
      where: { tenantId_id: { tenantId, id } },
      data: updateData,
    });

    log.info("[IoTAlert/PATCH] Alert updated", {
      id,
      status,
      userId: currentUser.id,
      tenantId,
    });

    return NextResponse.json({ alert });
  } catch (error) {
    captureException(error);
    log.error("Update IoT alert error:", error);
    return NextResponse.json(
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
