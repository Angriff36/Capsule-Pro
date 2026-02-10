import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    invariant(eventId, "params.eventId must exist");

    // Authenticate the user
    const { userId, orgId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get tenant ID
    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const { searchParams } = new URL(request.url);
    const isAcknowledged = searchParams.get("isAcknowledged");

    // Validate the event exists and belongs to the tenant
    const event = await database.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Build query conditions
    const where: {
      eventId: string;
      tenantId: string;
      deletedAt: null;
      isAcknowledged?: boolean;
    } = {
      eventId,
      tenantId,
      deletedAt: null,
    };

    // Filter by acknowledgment status if provided
    if (isAcknowledged !== null) {
      where.isAcknowledged = isAcknowledged === "true";
    }

    // Fetch warnings
    const warnings = await database.allergenWarning.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(warnings);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error fetching allergen warnings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
