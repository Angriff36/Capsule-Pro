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

// POST /api/smsautomationrule/deactivate - Deactivate an SMS automation rule
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return manifestErrorResponse("Rule ID is required", 400);
    }

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
        isActive: false,
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

    // Update the rule in the database
    const rule = await database.sms_automation_rules.update({
      where: { tenant_id_id: { tenant_id: tenantId, id } },
      data: {
        is_active: false,
      },
    });

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
      events: result.emittedEvents,
    });
  } catch (error) {
    captureException(error);
    log.error("Error deactivating SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
