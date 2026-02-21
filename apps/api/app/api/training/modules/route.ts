import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  ContentType,
  CreateTrainingModuleInput,
  TrainingModule,
  TrainingModulesListResponse,
} from "../types";

/**
 * GET /api/training/modules
 * List training modules with optional filtering
 *
 * Query params:
 * - category: Filter by category
 * - isRequired: Filter required modules (true/false)
 * - isActive: Filter active modules (true/false)
 * - search: Search by title or description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
export async function GET(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const isRequired = searchParams.get("isRequired");
  const isActive = searchParams.get("isActive");
  const search = searchParams.get("search");
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  const modules = await database.$queryRaw<
    Array<{
      id: string;
      tenant_id: string;
      title: string;
      description: string | null;
      content_url: string | null;
      content_type: string;
      duration_minutes: number | null;
      category: string | null;
      is_required: boolean;
      is_active: boolean;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
      assignment_count: bigint;
      completion_count: bigint;
    }>
  >(
    Prisma.sql`
      SELECT
        tm.id,
        tm.tenant_id,
        tm.title,
        tm.description,
        tm.content_url,
        tm.content_type,
        tm.duration_minutes,
        tm.category,
        tm.is_required,
        tm.is_active,
        tm.created_by,
        tm.created_at,
        tm.updated_at,
        COUNT(DISTINCT ta.id) AS assignment_count,
        COUNT(DISTINCT tc.id) AS completion_count
      FROM tenant_staff.training_modules tm
      LEFT JOIN tenant_staff.training_assignments ta
        ON ta.tenant_id = tm.tenant_id
        AND ta.module_id = tm.id
        AND ta.deleted_at IS NULL
      LEFT JOIN tenant_staff.training_completions tc
        ON tc.tenant_id = tm.tenant_id
        AND tc.module_id = tm.id
      WHERE tm.tenant_id = ${tenantId}
        AND tm.deleted_at IS NULL
        ${category ? Prisma.sql`AND tm.category = ${category}` : Prisma.empty}
        ${isRequired ? Prisma.sql`AND tm.is_required = ${isRequired === "true"}` : Prisma.empty}
        ${isActive ? Prisma.sql`AND tm.is_active = ${isActive === "true"}` : Prisma.empty}
        ${search ? Prisma.sql`AND (tm.title ILIKE ${`%${search}%`} OR tm.description ILIKE ${`%${search}%`})` : Prisma.empty}
      GROUP BY tm.id, tm.tenant_id, tm.title, tm.description, tm.content_url,
               tm.content_type, tm.duration_minutes, tm.category, tm.is_required,
               tm.is_active, tm.created_by, tm.created_at, tm.updated_at
      ORDER BY tm.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `
  );

  const totalCountResult = await database.$queryRaw<[{ count: bigint }]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint
      FROM tenant_staff.training_modules tm
      WHERE tm.tenant_id = ${tenantId}
        AND tm.deleted_at IS NULL
        ${category ? Prisma.sql`AND tm.category = ${category}` : Prisma.empty}
        ${isRequired ? Prisma.sql`AND tm.is_required = ${isRequired === "true"}` : Prisma.empty}
        ${isActive ? Prisma.sql`AND tm.is_active = ${isActive === "true"}` : Prisma.empty}
        ${search ? Prisma.sql`AND (tm.title ILIKE ${`%${search}%`} OR tm.description ILIKE ${`%${search}%`})` : Prisma.empty}
    `
  );

  const typedModules: TrainingModule[] = modules.map((mod) => ({
    ...mod,
    content_type: mod.content_type as ContentType,
    assignment_count: Number(mod.assignment_count),
    completion_count: Number(mod.completion_count),
  }));

  const response: TrainingModulesListResponse = {
    modules: typedModules,
    pagination: {
      page,
      limit,
      total: Number(totalCountResult[0].count),
      totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/training/modules
 * Create a new training module
 *
 * Required fields:
 * - title: Module title
 *
 * Optional fields:
 * - description: Module description
 * - contentUrl: URL to training content
 * - contentType: Type of content (document, video, quiz, interactive)
 * - durationMinutes: Estimated duration
 * - category: Module category
 * - isRequired: Whether this is required training
 */
export async function POST(request: Request) {
  const { orgId, userId } = await auth();
  if (!(orgId && userId)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = (await request.json()) as CreateTrainingModuleInput;

  if (!body.title) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  try {
    const result = await database.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string | null;
        content_type: string;
        is_required: boolean;
        is_active: boolean;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.training_modules (
          tenant_id,
          title,
          description,
          content_url,
          content_type,
          duration_minutes,
          category,
          is_required,
          is_active,
          created_by
        )
        VALUES (
          ${tenantId},
          ${body.title},
          ${body.description || null},
          ${body.contentUrl || null},
          ${body.contentType || "document"},
          ${body.durationMinutes || null},
          ${body.category || null},
          ${body.isRequired ?? false},
          true,
          ${userId}
        )
        RETURNING id, title, description, content_type, is_required, is_active
      `
    );

    return NextResponse.json({ module: result[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating training module:", error);
    return NextResponse.json(
      { message: "Failed to create training module" },
      { status: 500 }
    );
  }
}
