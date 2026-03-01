import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
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
  return executeManifestCommand(request, {
    entityName: "TrainingModule",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({
      ...body,
      title: body.title,
      description: body.description,
      contentUrl: body.contentUrl || body.content_url,
      contentType: body.contentType || body.content_type,
      durationMinutes: body.durationMinutes || body.duration_minutes,
      category: body.category,
      isRequired: body.isRequired ?? body.is_required,
      isActive: body.isActive ?? body.is_active,
    }),
  });
}

/**
 * DELETE /api/training/modules/[id]
 * Soft delete a training module via manifest runtime.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "TrainingModule",
    commandName: "softDelete",
    params: { id },
  });
}
