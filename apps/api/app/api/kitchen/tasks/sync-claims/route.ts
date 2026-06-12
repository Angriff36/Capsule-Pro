import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

interface ClaimAction {
  action: string;
  taskId: string;
  timestamp: string;
}

interface SyncResult {
  failed: Array<{ taskId: string; action: string; error: string }>;
  successful: Array<{ taskId: string; action: string }>;
}

interface CommandResult {
  error?: string;
  guardFailure?: { index: number; formatted: string };
  policyDenial?: { policyName: string };
  success: boolean;
}

function getErrorMessage(result: CommandResult): string {
  if (result.policyDenial) {
    return `Access denied: ${result.policyDenial.policyName}`;
  }
  if (result.guardFailure) {
    return `Guard ${result.guardFailure.index} failed: ${result.guardFailure.formatted}`;
  }
  return result.error ?? "Command failed";
}

/**
 * POST /api/kitchen/tasks/sync-claims
 *
 * Syncs offline claim operations from the client via manifest commands.
 * Each claim/release action is executed through the manifest runtime to
 * enforce guards, policies, and event emission.
 *
 * Expected body:
 * {
 *   claims: Array<{
 *     taskId: string;
 *     action: 'claim' | 'release';
 *     timestamp: string; // ISO timestamp of when action occurred offline
 *   }>
 * }
 */

async function processClaimAction(
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>,
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  log.debug("[KitchenTask/sync-claims] Processing claim action", {
    taskId,
    userId,
  });

  try {
    const result = await runtime.runCommand(
      "claim",
      { userId },
      { entityName: "KitchenTask", instanceId: taskId }
    );

    if (!result.success) {
      const errorMsg = getErrorMessage(result);

      log.error("[KitchenTask/sync-claims] Claim command failed", {
        taskId,
        userId,
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
      });

      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = parseError(error);
    log.error("[KitchenTask/sync-claims] Claim action threw", {
      taskId,
      userId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function processReleaseAction(
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>,
  taskId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  log.debug("[KitchenTask/sync-claims] Processing release action", {
    taskId,
    userId,
  });

  try {
    const result = await runtime.runCommand(
      "release",
      { userId },
      { entityName: "KitchenTask", instanceId: taskId }
    );

    if (!result.success) {
      const errorMsg = getErrorMessage(result);

      log.error("[KitchenTask/sync-claims] Release command failed", {
        taskId,
        userId,
        policyDenial: result.policyDenial,
        guardFailure: result.guardFailure,
        error: result.error,
      });

      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = parseError(error);
    log.error("[KitchenTask/sync-claims] Release action threw", {
      taskId,
      userId,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function processSingleAction(
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>,
  claimAction: ClaimAction,
  userId: string,
  results: SyncResult
): Promise<void> {
  const { taskId, action } = claimAction;

  if (!(taskId && action)) {
    results.failed.push({
      taskId: taskId || "unknown",
      action: action || "unknown",
      error: "Missing taskId or action",
    });
    return;
  }

  if (action === "claim") {
    const result = await processClaimAction(runtime, taskId, userId);
    if (result.success) {
      results.successful.push({ taskId, action });
    } else {
      results.failed.push({
        taskId,
        action,
        error: result.error || "Unknown error",
      });
    }
    return;
  }

  if (action === "release") {
    const result = await processReleaseAction(runtime, taskId, userId);
    if (result.success) {
      results.successful.push({ taskId, action });
    } else {
      results.failed.push({
        taskId,
        action,
        error: result.error || "Unknown error",
      });
    }
    return;
  }

  results.failed.push({
    taskId,
    action,
    error: `Unknown action: ${action}`,
  });
}

export async function POST(request: Request) {
  const logPrefix = "[KitchenTask/sync-claims]";

  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(orgId && clerkId)) {
      log.error(`${logPrefix} Unauthorized: missing orgId or clerkId`);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      log.error(`${logPrefix} Tenant not found for orgId`, { orgId });
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    if (!(body.claims && Array.isArray(body.claims))) {
      log.error(`${logPrefix} Invalid request: 'claims' array required`, {
        bodyKeys: Object.keys(body),
      });
      return NextResponse.json(
        { message: "Invalid request: 'claims' array required" },
        { status: 400 }
      );
    }

    // Get current user by Clerk ID
    const currentUser = await database.user.findFirst({
      where: {
        AND: [{ tenantId }, { authUserId: clerkId }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!currentUser) {
      log.error(`${logPrefix} User not found in database`, {
        clerkId,
        tenantId,
      });
      return NextResponse.json(
        { message: "User not found in database" },
        { status: 400 }
      );
    }

    // Create a single manifest runtime for all operations in this sync batch
    const runtime = await createManifestRuntime({
      user: { id: currentUser.id, tenantId, role: currentUser.role },
      entityName: "KitchenTask",
    });

    log.info(`${logPrefix} Processing claim actions`, {
      userId: currentUser.id,
      tenantId,
      claimCount: body.claims.length,
    });

    const results: SyncResult = {
      successful: [],
      failed: [],
    };

    // Process each claim action through the manifest runtime
    for (const claimAction of body.claims as ClaimAction[]) {
      await processSingleAction(runtime, claimAction, currentUser.id, results);
    }

    log.info(`${logPrefix} Sync complete`, {
      total: body.claims.length,
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return NextResponse.json({
      results,
      summary: {
        total: body.claims.length,
        successful: results.successful.length,
        failed: results.failed.length,
      },
    });
  } catch (error) {
    log.error(`${logPrefix} Unhandled error`, { error });
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
