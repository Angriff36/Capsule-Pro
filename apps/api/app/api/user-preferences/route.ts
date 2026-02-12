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
 * GET /api/user-preferences/[key]
 * Get a specific preference by key for the authenticated user
 */
export async function GET_KEY(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const keyParts = req.url.split("/").filter(Boolean);
    const preferenceKey = keyParts[keyParts.length - 1];

    if (!preferenceKey) {
      return NextResponse.json({ error: "Preference key is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const preferenceResult = await database.$queryRaw<
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
        AND preference_key = ${preferenceKey}
        AND deleted_at IS NULL
      LIMIT 1
      `
    );

    if (preferenceResult.length === 0) {
      return NextResponse.json({ error: "Preference not found" }, { status: 404 });
    }

    return NextResponse.json({ preference: preferenceResult[0] });
  } catch (error) {
    console.error("Failed to fetch user preference:", error);
    return NextResponse.json(
      { error: "Failed to fetch user preference" },
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

/**
 * PUT /api/user-preferences/[key]
 * Update a specific preference by key
 */
export async function PUT_KEY(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const keyParts = req.url.split("/").filter(Boolean);
    const preferenceKey = keyParts[keyParts.length - 1];

    if (!preferenceKey) {
      return NextResponse.json({ error: "Preference key is required" }, { status: 400 });
    }

    const body = await req.json();
    const { preferenceValue, category, notes } = body;

    if (preferenceValue === undefined) {
      return NextResponse.json(
        { error: "preferenceValue is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const updateResult = await database.$executeRaw<
      Array<{ id: string; preference_key: string }>
    >(
      Prisma.sql`
      UPDATE tenant_staff.user_preferences
      SET
        preference_value = ${preferenceValue}::jsonb,
        category = ${category || null},
        notes = ${notes || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND preference_key = ${preferenceKey}
        AND deleted_at IS NULL
      RETURNING id, preference_key
      `
    );

    if (updateResult.length === 0) {
      return NextResponse.json({ error: "Preference not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user preference:", error);
    return NextResponse.json(
      { error: "Failed to update user preference" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user-preferences/[key]
 * Delete (soft-delete) a specific preference by key
 */
export async function DELETE_KEY(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return Next.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const keyParts = req.url.split("/").filter(Boolean);
    const preferenceKey = keyParts[keyParts.length - 1];

    if (!preferenceKey) {
      return NextResponse.json({ error: "Preference key is required" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const deleteResult = await database.$executeRaw<
      Array<{ id: string }>
    >(
      Prisma.sql`
      UPDATE tenant_staff.user_preferences
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE tenant_id = ${tenantId}
        AND user_id = ${userId}
        AND preference_key = ${preferenceKey}
        AND deleted_at IS NULL
      RETURNING id
      `
    );

    if (deleteResult.length === 0) {
      return NextResponse.json({ error: "Preference not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user preference:", error);
    return NextResponse.json(
      { error: "Failed to delete user preference" },
      { status: 500 }
    );
  }
}
