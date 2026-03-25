import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { requireTenantId } from "@/app/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();
    const body = await request.json();

    const { query } = body as { query: string };

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const searchTerm = `%${query.trim().toLowerCase()}%`;

    // Search for ingredients matching the query
    const ingredients = await database.$queryRaw<
      { name: string }[]
    >(
      Prisma.sql`
        SELECT name
        FROM tenant_kitchen.ingredients
        WHERE tenant_id = ${tenantId}
          AND LOWER(name) LIKE ${searchTerm}
          AND deleted_at IS NULL
          AND is_active = true
        ORDER BY name ASC
        LIMIT 20
      `
    );

    return NextResponse.json({
      ingredients: ingredients.map((ing) => ing.name),
    });
  } catch (error) {
    console.error("Error searching ingredients:", error);
    return NextResponse.json(
      { error: "Failed to search ingredients" },
      { status: 500 }
    );
  }
}
