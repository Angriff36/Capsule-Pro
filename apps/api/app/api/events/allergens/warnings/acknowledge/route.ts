import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant ID
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { warningId, overrideReason, resolved = false } = body;

    // Validate required fields
    if (!warningId) {
      return NextResponse.json(
        { error: "warningId is required" },
        { status: 400 }
      );
    }

    if (resolved && !overrideReason) {
      return NextResponse.json(
        {
          error:
            "overrideReason is required when resolving an allergen warning",
        },
        { status: 400 }
      );
    }

    // Validate the warning exists and belongs to the tenant
    const warning = await database.allergenWarning.findFirst({
      where: {
        id: warningId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!warning) {
      return NextResponse.json(
        { error: "Allergen warning not found" },
        { status: 404 }
      );
    }

    // Update the warning using the correct composite key format
    const updatedWarning = await database.allergenWarning.update({
      where: { tenantId_id: { tenantId, id: warningId } },
      data: {
        isAcknowledged: true,
        acknowledgedBy: orgId,
        acknowledgedAt: new Date(),
        overrideReason,
        resolved,
        resolvedAt: resolved ? new Date() : undefined,
      },
    });

    return NextResponse.json(updatedWarning);
  } catch (error) {
    console.error("Error acknowledging allergen warning:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}