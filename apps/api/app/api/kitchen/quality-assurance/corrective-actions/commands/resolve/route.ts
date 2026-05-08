import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";

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

    const body = await request.json();
    const {
      actionId,
      status,
      resolvedBy,
      resolutionNotes,
      verificationMethod,
      verifiedBy,
    } = body;

    if (!(actionId && status)) {
      return NextResponse.json(
        { error: "Action ID and status are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      resolvedAt: new Date(),
      resolvedBy: resolvedBy || userId,
      resolutionNotes,
    };

    if (status === "verified") {
      updateData.verificationMethod = verificationMethod;
      updateData.verifiedBy = verifiedBy || userId;
    }

    const action = await database.correctiveAction.update({
      where: {
        tenantId_id: { tenantId, id: actionId },
      },
      data: updateData,
    });

    return NextResponse.json({ success: true, action });
  } catch (error) {
    captureException(error);
    log.error("Error resolving corrective action:", error);
    return NextResponse.json(
      { error: "Failed to resolve corrective action" },
      { status: 500 }
    );
  }
}
