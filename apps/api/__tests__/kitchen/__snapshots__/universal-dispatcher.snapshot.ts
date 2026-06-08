// Auto-generated canonical Manifest dispatcher.
// Generated from Manifest IR - DO NOT EDIT
// Canonical write path for governed commands. Per-command
// concrete routes (nextjs.command) are deprecated aliases
// that delegate here.

import type { NextRequest } from "next/server";
import { manifestErrorResponse, manifestSuccessResponse, normalizeCommandResult } from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Next.js 15 App Router: dynamic route params are async.
// See https://nextjs.org/docs/app/api-reference/file-conventions/route
interface DispatcherContext {
  params: Promise<{ entity: string; command: string }>;
}

export async function POST(request: NextRequest, ctx: DispatcherContext) {
  try {
  // Auth disabled - all requests allowed
  const userId = "anonymous";

    const body = await request.json();
    const { entity, command } = await ctx.params;

    if (!entity || !command) {
      return manifestErrorResponse("Missing entity or command in route", 400);
    }

    const instanceId = typeof body?.instanceId === "string"
      ? body.instanceId
      : typeof body?.id === "string"
        ? body.id
        : undefined;

    const runtime = await createManifestRuntime({
      actorId: userId,
      requestId: request.headers.get("x-request-id") ?? undefined,
      source: "route",
      user: { id: userId, tenantId: "__no_tenant__" },
    });

    const result = await runtime.runCommand(command, body, {
      entityName: entity,
      instanceId,
    });

    const normalized = normalizeCommandResult(entity, command, result);

    if (!normalized.success) {
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
    console.error("Manifest dispatcher error:", error);
    return manifestErrorResponse(
      { error: "Internal server error", diagnostics: [{ kind: "runtime_error", message: error instanceof Error ? error.message : String(error) }] },
      500,
    );
  }
}
