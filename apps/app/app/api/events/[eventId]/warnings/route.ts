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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orgId } = session;
    invariant(orgId, "auth.orgId must exist");

    // Get tenant ID
    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const { searchParams } = new URL(request.url);
    const isAcknowledged = searchParams.get("is_acknowledged");

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
    const where: any = {
      eventId,
      tenantId,
      deletedAt: null,
    };

    // Filter by acknowledgment status if provided
    if (isAcknowledged !== null) {
      where.isAcknowledged = isAcknowledged === "true";
    }

    // Fetch warnings with related dish and guest information
    const warnings = await database.allergenWarning.findMany({
      where,
      include: {
        dish: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dietaryRestrictions: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        acknowledgedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
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
