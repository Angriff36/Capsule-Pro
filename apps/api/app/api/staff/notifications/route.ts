import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

const SCHEDULING_TYPES = [
  "shift_assigned",
  "shift_changed",
  "shift_reminder",
  "time_off_status",
  "certification_expiration",
  "schedule_published",
] as const;

type SchedulingType = (typeof SCHEDULING_TYPES)[number];

function isSchedulingType(value: string): value is SchedulingType {
  return (SCHEDULING_TYPES as readonly string[]).includes(value);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "25", 10),
      100
    );
    const skip = (page - 1) * limit;
    const typeFilter = searchParams.get("type");
    const unreadOnly = searchParams.get("unread") === "true";

    const notificationTypes =
      typeFilter && isSchedulingType(typeFilter)
        ? [typeFilter]
        : [...SCHEDULING_TYPES];

    const where = {
      tenantId: user.tenantId,
      recipient_employee_id: user.id,
      notification_type: { in: notificationTypes },
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      database.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      database.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
