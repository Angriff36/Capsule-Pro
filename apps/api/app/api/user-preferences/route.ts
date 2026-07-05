import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";

/**
 * GET /api/user-preferences
 * Get all preferences for the authenticated user, optionally filtered by category
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    // user_preferences.user_id is a uuid (employee id) — the raw Clerk id
    // ("user_…") fails the column cast with a 500 on every page load.
    const employeeId = (await requireCurrentUser()).id;

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const preferences = await database.userPreference.findMany({
      where: {
        tenantId,
        userId: employeeId,
        deletedAt: null,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { preferenceKey: "asc" }],
    });
    const preferencesList = preferences.map((preference) => ({
      id: preference.id,
      preference_key: preference.preferenceKey,
      preference_value: preference.preferenceValue,
      category: preference.category,
      notes: preference.notes,
      created_at: preference.createdAt,
      updated_at: preference.updatedAt,
    }));

    return NextResponse.json({ preferences: preferencesList });
  } catch (error) {
    captureException(error);
    log.error("Failed to fetch user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch user preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-preferences
 * Create or update a user preference
 */
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const employeeId = (await requireCurrentUser()).id;

    const body = await req.json();
    const { preferenceKey, preferenceValue, category, notes } = body;

    if (!preferenceKey || preferenceValue === undefined) {
      return NextResponse.json(
        { error: "preferenceKey and preferenceValue are required" },
        { status: 400 }
      );
    }

    await database.userPreference.upsert({
      where: {
        tenantId_userId_preferenceKey_category: {
          tenantId,
          userId: employeeId,
          preferenceKey,
          category: category || null,
        },
      },
      create: {
        tenantId,
        userId: employeeId,
        preferenceKey,
        preferenceValue,
        category: category || null,
        notes: notes || null,
      },
      update: {
        preferenceValue,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    captureException(error);
    log.error("Failed to save user preference:", error);
    return NextResponse.json(
      { error: "Failed to save user preference" },
      { status: 500 }
    );
  }
}
