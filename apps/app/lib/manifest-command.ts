/**
 * Manifest command execution for app server actions.
 *
 * Uses the same {@link runManifestCommandCore} entry as the API dispatcher.
 * Runtime is created via the shared factory with app-level DB/logging injection.
 */

import { database } from "@repo/database";
import {
  createManifestRuntime as createSharedRuntime,
  type ManifestRuntimeContext,
} from "@repo/manifest-runtime/manifest-runtime-factory";
import {
  runManifestCommandCore,
  type ManifestUserContext,
  type RunManifestCommandCoreParams,
  type RunManifestCommandCoreResult,
} from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";

export type {
  ManifestUserContext,
  RunManifestCommandCoreParams as RunManifestCommandParams,
  RunManifestCommandCoreResult as RunManifestCommandResult,
};

async function createAppManifestRuntime(ctx: ManifestRuntimeContext) {
  return createSharedRuntime(
    {
      prisma: database,
      log,
      captureException,
      telemetry: undefined,
    },
    ctx
  );
}

/**
 * Execute a governed Manifest command from a server action.
 *
 * Returns a structured result (not an HTTP Response). On failure, inspect
 * `kind`, `message`, and `constraintOutcomes` for UI handling.
 */
export async function runManifestCommand(
  params: RunManifestCommandCoreParams
): Promise<RunManifestCommandCoreResult> {
  return runManifestCommandCore(
    {
      createRuntime: ({ user, entityName }) =>
        createAppManifestRuntime({
          user: {
            id: user.id,
            tenantId: user.tenantId,
            role: user.role,
          },
          entityName,
        }),
    },
    params
  );
}
