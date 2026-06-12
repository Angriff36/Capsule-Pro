import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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

    const rule = await database.sms_automation_rules.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!rule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    return manifestSuccessResponse({
      rule: {
        id: rule.id,
        tenantId: rule.tenant_id,
        name: rule.name,
        description: rule.description,
        triggerType: rule.trigger_type,
        triggerConfig: rule.trigger_config,
        templateId: rule.template_id,
        customMessage: rule.custom_message,
        recipientType: rule.recipient_type,
        recipientConfig: rule.recipient_config,
        isActive: rule.is_active,
        priority: rule.priority,
        createdAt: rule.created_at?.toISOString() ?? null,
        updatedAt: rule.updated_at?.toISOString() ?? null,
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

    const { id } = await params;
    const body = await request.json();

    // Verify rule exists and belongs to tenant
    const existingRule = await database.sms_automation_rules.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!existingRule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
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
        tenantId: existingRule.tenant_id,
        name: name ?? existingRule.name,
        description: description ?? existingRule.description,
        triggerType: existingRule.trigger_type,
        triggerConfig: triggerConfig ?? existingRule.trigger_config,
        templateId: templateId ?? existingRule.template_id,
        customMessage: customMessage ?? existingRule.custom_message,
        recipientType: recipientType ?? existingRule.recipient_type,
        recipientConfig: recipientConfig ?? existingRule.recipient_config,
        isActive: isActive ?? existingRule.is_active,
        priority: priority ?? existingRule.priority,
        createdAt: existingRule.created_at?.toISOString() ?? null,
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

    const { id } = await params;

    // Verify rule exists and belongs to tenant
    const existingRule = await database.sms_automation_rules.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        deleted_at: null,
      },
    });

    if (!existingRule) {
      return manifestErrorResponse("SMS automation rule not found", 404);
    }

    const runtime = await createManifestRuntime({
      user: { id: userId, tenantId },
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
