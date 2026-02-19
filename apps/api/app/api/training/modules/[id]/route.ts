import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  ContentType,
  TrainingModule,
  UpdateTrainingModuleInput,
} from "../../types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/training/modules/[id]
 * Get a single training module by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
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
 * Update a training module
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;
  const body = (await request.json()) as UpdateTrainingModuleInput;

  try {
    const result = await database.$queryRaw<
      Array<{
        id: string;
        title: string;
        is_active: boolean;
      }>
    >(
      Prisma.sql`
        UPDATE tenant_staff.training_modules
        SET
          title = COALESCE(${body.title}, title),
          description = COALESCE(${body.description}, description),
          content_url = COALESCE(${body.contentUrl}, content_url),
          content_type = COALESCE(${body.contentType}, content_type),
          duration_minutes = COALESCE(${body.durationMinutes}, duration_minutes),
          category = COALESCE(${body.category}, category),
          is_required = COALESCE(${body.isRequired}, is_required),
          is_active = COALESCE(${body.isActive}, is_active),
          updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
        RETURNING id, title, is_active
      `
    );

    if (result.length === 0) {
      return NextResponse.json(
        { message: "Training module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ module: result[0] });
  } catch (error) {
    console.error("Error updating training module:", error);
    return NextResponse.json(
      { message: "Failed to update training module" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/training/modules/[id]
 * Soft delete a training module
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  try {
    const result = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        UPDATE tenant_staff.training_modules
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE tenant_id = ${tenantId}
          AND id = ${id}
          AND deleted_at IS NULL
        RETURNING id
      `
    );

    if (result.length === 0) {
      return NextResponse.json(
        { message: "Training module not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting training module:", error);
    return NextResponse.json(
      { message: "Failed to delete training module" },
      { status: 500 }
    );
  }
}
