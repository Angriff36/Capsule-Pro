import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type {
  ContentType,
  TrainingModule,
  TrainingModulesListResponse,
} from "../types";

export const runtime = "nodejs";

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
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
  // Clamp pagination so a hostile or buggy client cannot ask for the entire
  // table (`?limit=999999`) or a negative page that produces a negative
  // OFFSET (which Postgres rejects with an error).
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const offset = (page - 1) * limit;
  const where: Prisma.TrainingModuleWhereInput = {
    tenantId,
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(isRequired ? { isRequired: isRequired === "true" } : {}),
    ...(isActive ? { isActive: isActive === "true" } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [moduleRecords, totalCount] = await Promise.all([
    database.trainingModule.findMany({
      where,
      include: {
        _count: {
          select: {
            assignments: { where: { deletedAt: null } },
            completions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    database.trainingModule.count({ where }),
  ]);

  const typedModules: TrainingModule[] = moduleRecords.map((mod) => ({
    id: mod.id,
    tenant_id: mod.tenantId,
    title: mod.title,
    description: mod.description,
    content_url: mod.contentUrl,
    content_type: mod.contentType as ContentType,
    duration_minutes: mod.durationMinutes,
    category: mod.category,
    is_required: mod.isRequired,
    is_active: mod.isActive,
    created_by: mod.createdBy,
    created_at: mod.createdAt,
    updated_at: mod.updatedAt,
    assignment_count: mod._count.assignments,
    completion_count: mod._count.completions,
  }));

  const response: TrainingModulesListResponse = {
    modules: typedModules,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };

  return NextResponse.json(response);
}

/**
 * POST /api/training/modules
 * Create a new training module via manifest runtime.
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "TrainingModule",
    command: "create",
    body: {
      title: rawBody.title || "",
      description: rawBody.description || null,
      contentType: rawBody.contentType || rawBody.content_type || "document",
      durationMinutes: rawBody.durationMinutes ?? rawBody.duration_minutes ?? 0,
      category: rawBody.category || null,
      isRequired: rawBody.isRequired ?? rawBody.is_required ?? false,
      isActive: rawBody.isActive ?? rawBody.is_active ?? true,
      contentUrl: rawBody.contentUrl ?? rawBody.content_url ?? null,
      createdBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
