/**
 * GET /api/collaboration/notifications/email/workflows/[id]
 * PUT /api/collaboration/notifications/email/workflows/[id]
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 *
 * Get, update, or delete a specific email workflow
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  emailTemplateId: z.string().nullable().optional(),
  recipientConfig: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/collaboration/notifications/email/workflows/[id]
 * Get a specific email workflow
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await database.emailWorkflow.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        emailTemplate: {
          select: {
            id: true,
            name: true,
            subject: true,
            body: true,
            template_type: true,
            merge_fields: true,
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      workflow,
    });
  } catch (error) {
    console.error("Failed to fetch email workflow:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch email workflow: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/collaboration/notifications/email/workflows/[id]
 * Update an email workflow
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    // Verify workflow exists
    const existing = await database.emailWorkflow.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, triggerConfig, emailTemplateId, recipientConfig, isActive } =
      parsed.data;

    // If template ID is provided, verify it exists
    if (emailTemplateId) {
      const template = await database.email_templates.findFirst({
        where: {
          tenant_id: tenantId,
          id: emailTemplateId,
          is_active: true,
          deleted_at: null,
        },
      });

      if (!template) {
        return NextResponse.json(
          { error: "Email template not found or inactive" },
          { status: 400 }
        );
      }
    }

    const workflow = await database.emailWorkflow.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        ...(name !== undefined && { name }),
        ...(triggerConfig !== undefined && { triggerConfig }),
        ...(emailTemplateId !== undefined && {
          emailTemplateId: emailTemplateId ?? null,
          emailTemplateTenantId: emailTemplateId ? tenantId : null,
        }),
        ...(recipientConfig !== undefined && { recipientConfig }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        emailTemplate: {
          select: {
            id: true,
            name: true,
            subject: true,
            template_type: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Failed to update email workflow:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to update email workflow: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collaboration/notifications/email/workflows/[id]
 * Soft delete an email workflow
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const { id } = await params;

    // Verify workflow exists
    const existing = await database.emailWorkflow.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await database.emailWorkflow.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Workflow deleted",
    });
  } catch (error) {
    console.error("Failed to delete email workflow:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to delete email workflow: ${message}` },
      { status: 500 }
    );
  }
}
