import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

// GET /api/communications/sms/automation-rules/[id] - Get a single SMS automation rule
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const rule = await database.smsAutomationRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!rule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    return manifestSuccessResponse({
      rule: {
        id: rule.id,
        tenantId: rule.tenantId,
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        triggerConfig: rule.triggerConfig,
        templateId: rule.templateId,
        customMessage: rule.customMessage,
        recipientType: rule.recipientType,
        recipientConfig: rule.recipientConfig,
        isActive: rule.isActive,
        priority: rule.priority,
        createdAt: rule.createdAt?.toISOString() ?? null,
        updatedAt: rule.updatedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("Error getting SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// PATCH /api/communications/sms/automation-rules/[id] - Update an SMS automation rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const employeeId = (await requireCurrentUser()).id;

    const { id } = await params;
    const body = await request.json();

    // Verify rule exists and belongs to tenant
    const existingRule = await database.smsAutomationRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingRule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    const runtime = await createManifestRuntime({
      user: { id: employeeId, tenantId },
    });

    const result = await runtime.runCommand(
      "update",
      {
        id,
        ...body,
      },
      {
        entityName: "SmsAutomationRule",
        instanceId: id,
      }
    );

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName}`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    const {
      name,
      description,
      triggerConfig,
      templateId,
      customMessage,
      recipientType,
      recipientConfig,
      isActive,
      priority,
    } = body;

    return manifestSuccessResponse({
      rule: {
        id: existingRule.id,
        tenantId: existingRule.tenantId,
        name: name ?? existingRule.name,
        description: description ?? existingRule.description,
        triggerType: existingRule.triggerType,
        triggerConfig: triggerConfig ?? existingRule.triggerConfig,
        templateId: templateId ?? existingRule.templateId,
        customMessage: customMessage ?? existingRule.customMessage,
        recipientType: recipientType ?? existingRule.recipientType,
        recipientConfig: recipientConfig ?? existingRule.recipientConfig,
        isActive: isActive ?? existingRule.isActive,
        priority: priority ?? existingRule.priority,
        createdAt: existingRule.createdAt?.toISOString() ?? null,
        updatedAt: new Date().toISOString(),
      },
      events: result.emittedEvents,
    });
  } catch (error) {
    captureException(error);
    log.error("Error updating SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

// DELETE /api/communications/sms/automation-rules/[id] - Soft delete an SMS automation rule
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const employeeId = (await requireCurrentUser()).id;

    const { id } = await params;

    // Verify rule exists and belongs to tenant
    const existingRule = await database.smsAutomationRule.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existingRule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    const runtime = await createManifestRuntime({
      user: { id: employeeId, tenantId },
    });

    const result = await runtime.runCommand(
      "softDelete",
      { id },
      {
        entityName: "SmsAutomationRule",
        instanceId: id,
      }
    );

    if (!result.success) {
      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName}`,
          403
        );
      }
      if (result.guardFailure) {
        return manifestErrorResponse(
          `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`,
          422
        );
      }
      return manifestErrorResponse(result.error ?? "Command failed", 400);
    }

    return manifestSuccessResponse({
      success: true,
      events: result.emittedEvents,
    });
  } catch (error) {
    captureException(error);
    log.error("Error deleting SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
