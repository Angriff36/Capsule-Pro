// Auto-generated Next.js command handler for PrepTask.claim
// Generated from Manifest IR - DO NOT EDIT
//
// Writes MUST flow through runtime to enforce guards, policies, and constraints.

import type { NextRequest } from "next/server";
import { manifestErrorResponse, manifestSuccessResponse, normalizeCommandResult } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export async function POST(request: NextRequest) {
  try {
  // Auth disabled - all requests allowed
  const userId = "anonymous";

    const body = await request.json();

    const instanceId = typeof body?.instanceId === "string"
      ? body.instanceId
      : typeof body?.id === "string"
        ? body.id
        : undefined;

    const runtime = await createManifestRuntime({ user: { id: userId, tenantId: "__no_tenant__" } });
    const result = await runtime.runCommand("claim", body, {
      entityName: "PrepTask",
      instanceId,
    });

    const normalized = normalizeCommandResult("PrepTask", "claim", result);

    if (!normalized.success) {
      // Determine HTTP status based on diagnostic kind
      const firstDiagnostic = normalized.diagnostics?.[0];
      const status = firstDiagnostic?.kind === "policy_denial" ? 403
        : firstDiagnostic?.kind === "guard_failure" ? 422
        : firstDiagnostic?.kind === "constraint_block" ? 422
        : 400;
      return manifestErrorResponse({ error: normalized.error, diagnostics: normalized.diagnostics }, status);
    }

    return manifestSuccessResponse({ data: normalized.data, events: normalized.events, diagnostics: normalized.diagnostics });
  } catch (error) {
    // Auth helpers (clerk, next-auth, custom) may throw on invalid/expired
    // tokens. Goal step 4: auth failures MUST NEVER surface as 500.
    const isAuthError = error instanceof Error && (
      /unauth/i.test(error.message) ||
      /token/i.test(error.message) ||
      /session/i.test(error.message)
    );
    if (isAuthError) {
      return manifestErrorResponse({ error: "Unauthorized", diagnostics: [] }, 401);
    }
    console.error("Error executing PrepTask.claim:", error);
    return manifestErrorResponse(
      { error: "Internal server error", diagnostics: [{ kind: "runtime_error", message: error instanceof Error ? error.message : String(error) }] },
      500,
    );
  }
}
