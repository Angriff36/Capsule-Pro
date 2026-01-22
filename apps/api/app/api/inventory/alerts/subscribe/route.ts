import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

// POST /api/inventory/alerts/subscribe
// Body: {channel: "email"|"slack"|"webhook", destination}
export async function POST(request: NextRequest) {
  try {
    const { channel, destination } = await request.json();

    if (!(channel && destination)) {
      return NextResponse.json(
        { error: "Missing channel or destination" },
        { status: 400 }
      );
    }

    // TODO: Get tenant from auth
    const tenantId = "placeholder";

    const config = await database.alertsConfig.create({
      data: {
        tenantId,
        channel,
        destination,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to subscribe to alerts" },
      { status: 500 }
    );
  }
}
