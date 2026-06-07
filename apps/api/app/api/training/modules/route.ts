import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
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

    const { createManifestRuntime } = await import("@/lib/manifest-runtime");

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
    const moduleId = crypto.randomUUID();

    const createdModule = await database.trainingModule.create({
      data: {
        id: moduleId,
        tenantId,
        title: commandPayload.title || "",
        description: commandPayload.description || null,
        contentType: commandPayload.contentType || "document",
        durationMinutes: commandPayload.durationMinutes
          ? Number(commandPayload.durationMinutes)
          : null,
        category: commandPayload.category || null,
        isRequired: commandPayload.isRequired === true,
        isActive: commandPayload.isActive !== false,
        contentUrl: commandPayload.contentUrl || null,
        createdBy: currentUser.id,
      },
    });

    return NextResponse.json({
      result: createdModule,
      events: result.emittedEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error("[training-module/create] Error:", error);
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
