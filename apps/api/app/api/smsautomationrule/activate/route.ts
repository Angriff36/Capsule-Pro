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

// POST /api/smsautomationrule/activate - Activate an SMS automation rule
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

    const employeeId = (await requireCurrentUser()).id;

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return manifestErrorResponse("Rule ID is required", 400);
    }

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

    // Use the dedicated `activate` command, not generic `update`. The dedicated
    // command enforces the activation transition guard (`isActive == false`) and
    // emits `SmsAutomationRuleActivated`; the generic `update` path emits only
    // `SmsAutomationRuleUpdated`, so activation never propagated to any reaction.
    const result = await runtime.runCommand(
      "activate",
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
      rule: {
        id: existingRule.id,
        tenantId: existingRule.tenantId,
        name: existingRule.name,
        description: existingRule.description,
        triggerType: existingRule.triggerType,
        triggerConfig: existingRule.triggerConfig,
        templateId: existingRule.templateId,
        customMessage: existingRule.customMessage,
        recipientType: existingRule.recipientType,
        recipientConfig: existingRule.recipientConfig,
        isActive: true,
        priority: existingRule.priority,
        createdAt: existingRule.createdAt?.toISOString() ?? null,
        updatedAt: new Date().toISOString(),
      },
      events: result.emittedEvents,
    });
  } catch (error) {
    captureException(error);
    log.error("Error activating SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
