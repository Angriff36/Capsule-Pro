import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

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

    const ingredients = await database.ingredient.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        name: { contains: query.trim(), mode: "insensitive" },
      },
      select: { name: true },
      orderBy: { name: "asc" },
      take: 20,
    });

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
