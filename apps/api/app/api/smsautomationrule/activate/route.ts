// DEPRECATED ALIAS — canonical dispatcher: /api/manifest/SmsAutomationRule/commands/update
//
// Blocker (structural): SmsAutomationRule is NOT in ENTITIES_WITH_SPECIFIC_STORES
// (packages/manifest-adapters/src/manifest-runtime-factory.ts), so the runtime
// falls back to PrismaJsonStore — which writes the entity to a generic JSON
// column, NOT to the relational `sms_automation_rules` table. Without the
// secondary direct `database.sms_automation_rules.update` here, the legacy
// columns (is_active, ...) would never flip and existing reads (this same
// route's GET handler, downstream automation runners) would see stale state.
//
// To remove this alias safely:
//   1. Implement a dedicated SmsAutomationRule PrismaStore (analogous to the
//      ones in packages/manifest-adapters/src/prisma-stores/*) that maps every
//      manifest field to the snake_case relational column.
//   2. Add "SmsAutomationRule" to ENTITIES_WITH_SPECIFIC_STORES.
//   3. Confirm runtime.runCommand("update", { id, isActive: true }) updates
//      `sms_automation_rules.is_active` directly.
//   4. Then this route can be deleted (or converted to a thin forwarder for
//      backward compatibility).
//
// Migration path for clients: POST {id, isActive: true} to
// /api/manifest/SmsAutomationRule/commands/update.

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
        isActive: true,
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
        is_active: true,
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
    log.error("Error activating SMS automation rule:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
