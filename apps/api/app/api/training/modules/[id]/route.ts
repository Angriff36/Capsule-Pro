import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type { ContentType, TrainingModule } from "../../types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/training/modules/[id]
 * Get a single training module by ID
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

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
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        tenant_id,
        title,
        description,
        content_url,
        content_type,
        duration_minutes,
        category,
        is_required,
        is_active,
        created_by,
        created_at,
        updated_at
      FROM tenant_staff.training_modules
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `
  );

  if (modules.length === 0) {
    return NextResponse.json(
      { message: "Training module not found" },
      { status: 404 }
    );
  }

  const typedModule: TrainingModule = {
    ...modules[0],
    content_type: modules[0].content_type as ContentType,
  };

  return NextResponse.json({ module: typedModule });
}

/**
 * PUT /api/training/modules/[id]
 * Update a training module via manifest runtime.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "TrainingModule",
    command: "update",
    body: {
      ...rawBody,
      id,
      title: rawBody.title,
      description: rawBody.description,
      contentUrl: rawBody.contentUrl || rawBody.content_url,
      contentType: rawBody.contentType || rawBody.content_type,
      durationMinutes: rawBody.durationMinutes || rawBody.duration_minutes,
      category: rawBody.category,
      isRequired: rawBody.isRequired ?? rawBody.is_required,
      isActive: rawBody.isActive ?? rawBody.is_active,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/training/modules/[id]
 * Soft delete a training module via manifest runtime.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "TrainingModule",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
