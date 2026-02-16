import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// POST /api/inventory/alerts/subscribe
// Body: {channel: "email"|"slack"|"webhook", destination}
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user and tenant
    const { orgId, userId: clerkId } = await auth();
    if (!(orgId && clerkId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const { channel, destination } = await request.json();

    if (!(channel && destination)) {
      return NextResponse.json(
        { error: "Missing channel or destination" },
        { status: 400 }
      );
    }

    const config = await database.alertsConfig.create({
      data: {
        tenantId,
        channel,
        destination,
      },
    });

    return NextResponse.json(config);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to subscribe to alerts" },
      { status: 500 }
    );
  }
}
