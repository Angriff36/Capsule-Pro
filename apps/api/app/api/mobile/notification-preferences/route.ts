import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

const NOTIFICATION_KEYS = [
  "taskAssigned",
  "taskCompleted",
  "eventReminder",
  "scheduleChange",
  "inventoryAlert",
] as const;

const DEFAULT_PREFERENCES: Record<string, boolean> = {
  taskAssigned: true,
  taskCompleted: true,
  eventReminder: true,
  scheduleChange: true,
  inventoryAlert: true,
};

export async function GET() {
  try {
    const user = await requireCurrentUser();

    const prefs = await database.userPreference.findMany({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        category: "mobile_notifications",
        preferenceKey: { in: [...NOTIFICATION_KEYS] },
      },
    });

    const preferences = { ...DEFAULT_PREFERENCES };
    for (const pref of prefs) {
      if (pref.preferenceKey in preferences) {
        preferences[pref.preferenceKey] = pref.preferenceValue === true;
      }
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    log.error("Error getting notification preferences", {
      error: String(error),
    });
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
    const updates: Record<string, boolean> = {};

    for (const key of NOTIFICATION_KEYS) {
      if (key in body && typeof body[key] === "boolean") {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid preference fields provided" },
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
              category: "mobile_notifications",
            },
          },
          create: {
            tenantId: user.tenantId,
            userId: user.id,
            preferenceKey: key,
            preferenceValue: value,
            category: "mobile_notifications",
          },
          update: {
            preferenceValue: value,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Error updating notification preferences", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
