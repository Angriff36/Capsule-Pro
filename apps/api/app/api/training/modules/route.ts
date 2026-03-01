import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import type {
  ContentType,
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
 * Create a new training module via manifest runtime.
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "TrainingModule",
    commandName: "create",
    transformBody: (body, ctx) => ({
      ...body,
      tenantId: ctx.tenantId,
      createdBy: ctx.userId,
      isActive: true,
      contentType: body.contentType || body.content_type || "document",
      isRequired: body.isRequired || body.is_required,
      durationMinutes: body.durationMinutes || body.duration_minutes || 0,
      contentUrl: body.contentUrl || body.content_url || "",
    }),
  });
}
