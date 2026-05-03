import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { likeContains } from "@/lib/sql-like";
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
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
  // Clamp pagination so a hostile or buggy client cannot ask for the entire
  // table (`?limit=999999`) or a negative page that produces a negative
  // OFFSET (which Postgres rejects with an error).
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
  const offset = (page - 1) * limit;
  // Escape ILIKE metacharacters from user-supplied search so `%` and `_`
  // are treated as literal characters, not pattern wildcards. The matching
  // `ESCAPE '\'` clause is included in the WHERE fragment below. Computing
  // once and reusing avoids re-escaping on every reference.
  const searchPattern = search ? likeContains(search) : null;

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
        ${searchPattern ? Prisma.sql`AND (tm.title ILIKE ${searchPattern} ESCAPE '\\' OR tm.description ILIKE ${searchPattern} ESCAPE '\\')` : Prisma.empty}
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
        ${searchPattern ? Prisma.sql`AND (tm.title ILIKE ${searchPattern} ESCAPE '\\' OR tm.description ILIKE ${searchPattern} ESCAPE '\\')` : Prisma.empty}
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
 *
 * Uses runCommand for guard/policy validation then createInstance for
 * actual DB persistence. executeManifestCommand only runs the command
 * in-memory — it does NOT persist entities (same bug as email-templates).
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 400 });
    }

    const currentUser = await database.user.findFirst({
      where: { AND: [{ tenantId }, { authUserId: clerkId }] },
    });
    if (!currentUser) {
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const commandPayload = {
      ...body,
      createdBy: currentUser.id,
      contentType: body.contentType || body.content_type || "document",
      isRequired: body.isRequired ?? body.is_required ?? false,
      durationMinutes: body.durationMinutes ?? body.duration_minutes ?? 0,
      contentUrl: body.contentUrl ?? body.content_url ?? "",
    };

    const { createManifestRuntime } = await import(
      "@/lib/manifest-runtime"
    );

    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId,
        role: currentUser.role,
      },
      entityName: "TrainingModule",
    });

    // Step 1: Validate via manifest runtime (guards, policies)
    const result = await runtime.runCommand("create", commandPayload, {
      entityName: "TrainingModule",
    });

    if (!result.success) {
      if (result.policyDenial) {
        return NextResponse.json(
          {
            message: `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
          },
          { status: 403 }
        );
      }
      if (result.guardFailure) {
        return NextResponse.json(
          {
            message: `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { message: result.error ?? "Command failed" },
        { status: 400 }
      );
    }

    // Step 2: Persist directly to tenant_staff.training_modules.
    // createInstance() writes to the generic PrismaJsonStore (JSON blob),
    // but the GET handler queries tenant_staff.training_modules directly.
    // TrainingModule is NOT in ENTITIES_WITH_SPECIFIC_STORES, so we must
    // use raw SQL INSERT to match the GET handler's storage.
    const moduleId = crypto.randomUUID();

    const createdModule = await database.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        title: string;
        description: string | null;
        content_type: string;
        duration_minutes: number | null;
        category: string | null;
        is_required: boolean;
        is_active: boolean;
        content_url: string | null;
        created_by: string | null;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      Prisma.sql`
        INSERT INTO tenant_staff.training_modules (
          id, tenant_id, title, description, content_type,
          duration_minutes, category, is_required, is_active,
          content_url, created_by
        )
        VALUES (
          ${moduleId}::uuid,
          ${tenantId}::uuid,
          ${commandPayload.title || ""},
          ${commandPayload.description || null},
          ${commandPayload.contentType || "document"},
          ${commandPayload.durationMinutes ? Number(commandPayload.durationMinutes) : null}::smallint,
          ${commandPayload.category || null},
          ${commandPayload.isRequired === true},
          ${commandPayload.isActive !== false},
          ${commandPayload.contentUrl || null},
          ${currentUser.id}::uuid
        )
        RETURNING *
      `
    );

    if (!createdModule || createdModule.length === 0) {
      return NextResponse.json(
        {
          message:
            "Failed to create training module.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      result: createdModule[0],
      events: result.emittedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[training-module/create] Error:", error);
    return NextResponse.json(
      {
        message:
          message.includes("Invalid") || message.includes("required")
            ? message
            : "Internal server error",
      },
      {
        status:
          message.includes("Invalid") || message.includes("required")
            ? 400
            : 500,
      }
    );
  }
}
