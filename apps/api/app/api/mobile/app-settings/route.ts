import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

const SETTING_KEYS = [
  "hapticFeedback",
  "autoRefresh",
  "autoRefreshInterval",
] as const;

const DEFAULT_SETTINGS: Record<string, boolean | number> = {
  hapticFeedback: true,
  autoRefresh: true,
  autoRefreshInterval: 30,
};

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const settings = await database.userPreference.findMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        category: "mobile_app",
        preferenceKey: { in: [...SETTING_KEYS] },
      },
    });

    const result = { ...DEFAULT_SETTINGS };
    for (const setting of settings) {
      if (setting.preferenceKey in result) {
        (result as Record<string, unknown>)[setting.preferenceKey] =
          setting.preferenceValue;
      }
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    log.error("Error getting app settings", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const body = await request.json();
    const updates: Record<string, boolean | number> = {};

    for (const key of SETTING_KEYS) {
      if (key in body) {
        if (key === "autoRefreshInterval" && typeof body[key] === "number") {
          updates[key] = body[key];
        } else if (typeof body[key] === "boolean") {
          updates[key] = body[key];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid setting fields provided" },
        { status: 400 }
      );
    }

    await database.$transaction(
      Object.entries(updates).map(([key, value]) =>
        database.userPreference.upsert({
          where: {
            tenantId_userId_preferenceKey_category: {
              tenantId: user.tenantId,
              userId: user.id,
              preferenceKey: key,
              category: "mobile_app",
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: user.id,
            preferenceKey: key,
            preferenceValue: value,
            category: "mobile_app",
          },
          update: {
            preferenceValue: value,
          },
        })
      )
    );

    const refreshed = await database.userPreference.findMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        category: "mobile_app",
        preferenceKey: { in: [...SETTING_KEYS] },
      },
    });

    const result = { ...DEFAULT_SETTINGS };
    for (const setting of refreshed) {
      if (setting.preferenceKey in result) {
        (result as Record<string, unknown>)[setting.preferenceKey] =
          setting.preferenceValue;
      }
    }

    return NextResponse.json({ settings: result });
  } catch (error) {
    log.error("Error updating app settings", { error: String(error) });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
