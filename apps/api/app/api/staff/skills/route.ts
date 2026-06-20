import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET /api/staff/skills — tenant skill catalog
 * POST /api/staff/skills — create skill { name, category?, description? }
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const category = request.nextUrl.searchParams.get("category");

  const skills = await database.skills.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    success: true,
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      createdAt: s.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as {
    name?: string;
    category?: string;
    description?: string;
  };

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  try {
    const skill = await database.skills.create({
      data: {
        tenant_id: tenantId,
        name,
        category: body.category?.trim() || null,
        description: body.description?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      skill: {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
      },
    });
  } catch (error) {
    log.error("Failed to create skill", { error });
    return NextResponse.json(
      { message: "Failed to create skill (name may already exist)" },
      { status: 409 }
    );
  }
}
