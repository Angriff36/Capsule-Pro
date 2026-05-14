// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
// Compiled command registry — source of truth for which entity.command pairs exist.
// Generated from packages/manifest-ir/ir/kitchen/kitchen.commands.json
import commandsJson from "@/../../packages/manifest-ir/ir/kitchen/kitchen.commands.json";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Build a lookup set: "EntityName.commandName" → true
const COMMAND_REGISTRY: Set<string> = new Set(
  (commandsJson as Array<{ entity: string; command: string }>).map(
    (c) => `${c.entity}.${c.command}`
  )
);

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // ── Validation: command must exist in compiled IR ──
    const commandKey = `${entity}.${command}`;
    if (!COMMAND_REGISTRY.has(commandKey)) {
      return manifestErrorResponse(
        `Unknown command: ${commandKey}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
    });

    // ── Handle failures ──
    if (!result.success) {
      console.error(`[manifest/${entity}/${command}] Failed:`, {
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
        userRole: currentUser.role,
      });

      if (result.policyDenial) {
        return manifestErrorResponse(
          `Access denied: ${result.policyDenial.policyName} (role=${currentUser.role})`,
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

    // ── Success ──
    return manifestSuccessResponse({
      result: result.result,
      events: result.emittedEvents,
    });
  } catch (error) {
    // ── Auth/tenant resolution failures → 401 ──
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    console.error("[manifest/dispatcher] Error:", error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
