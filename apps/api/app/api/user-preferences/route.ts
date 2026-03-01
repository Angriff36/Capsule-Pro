import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/user-preferences
 * Get all preferences for the authenticated user, optionally filtered by category
 */
export async function GET(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    // Get user ID from session (this would typically come from Clerk session)
    // For now, we'll pass it via query param for testing
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Fetch user preferences using SQL query with optional category filter
    const preferencesList = await database.$queryRaw<
      Array<{
        id: string;
        preference_key: string;
        preference_value: unknown;
        category: string | null;
        notes: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
      SELECT
        id,
        preference_key,
        preference_value,
        category,
        notes,
        created_at,
        updated_at
      FROM tenant_staff.user_preferences
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND deleted_at IS NULL
        ${category ? Prisma.sql`AND category = ${category}` : Prisma.empty}
      ORDER BY category, preference_key ASC
      `
    );

    return NextResponse.json({ preferences: preferencesList });
  } catch (error) {
    console.error("Failed to fetch user preferences:", error);
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
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = await req.json();
    const { preferenceKey, preferenceValue, category, notes } = body;

    if (!preferenceKey || preferenceValue === undefined) {
      return NextResponse.json(
        { error: "preferenceKey and preferenceValue are required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Upsert preference using INSERT ... ON CONFLICT
    await database.$executeRaw<
      Array<{
        id: string;
        preference_key: string;
        preference_value: unknown;
      }>
    >(
      Prisma.sql`
      INSERT INTO tenant_staff.user_preferences (tenant_id, id, user_id, preference_key, preference_value, category, notes, created_at, updated_at)
      VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${userId},
        ${preferenceKey},
        ${preferenceValue}::jsonb,
        ${category || null},
        ${notes || null},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (tenant_id, user_id, preference_key, category)
      DO UPDATE SET
        preference_value = EXCLUDED.preference_value,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_staff.user_preferences.tenant_id = EXCLUDED.tenant_id
        AND tenant_staff.user_preferences.user_id = EXCLUDED.user_id
        AND tenant_staff.user_preferences.preference_key = EXCLUDED.preference_key
        AND tenant_staff.user_preferences.category = EXCLUDED.category
      RETURNING id, preference_key, preference_value
      `
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save user preference:", error);
    return NextResponse.json(
      { error: "Failed to save user preference" },
      { status: 500 }
    );
  }
}
