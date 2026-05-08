import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const body = await request.json();
    const pushToken = body.pushToken;
    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json(
        { error: "pushToken is required" },
        { status: 400 },
      );
    }

    await database.userPreference.upsert({
      where: {
        tenantId_userId_preferenceKey_category: {
          tenantId: user.tenantId,
          userId: user.id,
          preferenceKey: "pushToken",
          category: "mobile",
        },
      },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        preferenceKey: "pushToken",
        preferenceValue: pushToken,
        category: "mobile",
      },
      update: {
        preferenceValue: pushToken,
      },
    });

    return NextResponse.json({ pushToken, success: true });
  } catch (error) {
    log.error("Error registering push token", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
