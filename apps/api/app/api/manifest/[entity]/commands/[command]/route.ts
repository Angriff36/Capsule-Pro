// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { resolveCommand } from "@/lib/manifest/command-resolver";
import { requireCurrentUser } from "@/app/lib/tenant";
import { InvariantError } from "@/app/lib/invariant";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command: commandSlug } = await params;

    // ── Resolve command slug → canonical camelCase command name ──
    // URL segment may be kebab-case (e.g. "soft-delete"), but manifest
    // commands use camelCase ("softDelete"). The resolver tries exact
    // match first, then kebab→camel conversion.
    const resolved = resolveCommand(entity, commandSlug);
    if (!resolved) {
      return manifestErrorResponse(
        `Unknown command: ${entity}.${commandSlug}. Verify the entity and command names against the manifest IR.`,
        404
      );
    }

    const command = resolved.command;

    // ── Auth / tenant / user resolution ──
    const currentUser = await requireCurrentUser();

    // ── Parse request body ──
    const body = await request.json().catch(() => ({}));

    console.log(`[manifest/${entity}/${command}] Executing:`, {
      slug: commandSlug,
      userId: currentUser.id,
      userRole: currentUser.role,
      tenantId: currentUser.tenantId,
      bodyKeys: Object.keys(body),
    });

    // ── Resolve instanceId from body ──
    // Instance-scoped commands need to identify the target entity row.
    // Convention: Shipment.* uses body.id; ShipmentItem.updateReceived uses
    // body.shipmentItemId. Create commands are entity-scoped (no instanceId).
    let instanceId: string | undefined;
    if (body.shipmentItemId) {
      instanceId = body.shipmentItemId;
    } else if (body.id && command !== "create") {
      instanceId = body.id;
    }

    // ── Build runtime + execute command ──
    const runtime = await createManifestRuntime({
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      entityName: entity,
    });

    const runArgs: { entityName: string; instanceId?: string } = {
      entityName: entity,
    };
    if (instanceId) {
      runArgs.instanceId = instanceId;
    }

    const result = await runtime.runCommand(command, body, runArgs);

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
    // Auth/tenant invariant violations must surface as 401, not 500.
    if (error instanceof InvariantError) {
      return manifestErrorResponse(error.message, 401);
    }
    console.error(`[manifest/dispatcher] Error:`, error);
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
