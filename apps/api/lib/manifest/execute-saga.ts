/**
 * HTTP transport wrapper for Manifest saga execution.
 */

import {
  type ManifestUserContext,
  type RunManifestSagaCoreParams,
  runManifestSagaCore,
} from "@repo/manifest-runtime/run-manifest-saga-core";
import { captureException } from "@sentry/nextjs";
import { logManifestIssue } from "@/lib/manifest/issue-log";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export type {
  ManifestUserContext,
  RunManifestSagaCoreParams as RunManifestSagaParams,
};

export async function runManifestSaga(
  params: RunManifestSagaCoreParams
): Promise<Response> {
  const { user } = params;

  try {
    const result = await runManifestSagaCore(
      {
        createRuntime: async ({ user: sagaUser }) =>
          createManifestRuntime({
            user: sagaUser,
            source: "api.saga",
          }),
      },
      params
    );

    if (!result.ok) {
      logManifestIssue({
        kind: "command_failed",
        entity: params.saga,
        command: "runSaga",
        message: result.message,
        tenantId: user.tenantId,
        userId: user.id,
        userRole: user.role,
        httpStatus: result.httpStatus,
        details: {
          failedStep: result.failedStep,
          status: result.status,
        },
      });
      return manifestErrorResponse(result.message, result.httpStatus);
    }

    return manifestSuccessResponse({
      saga: result.saga,
      status: result.status,
      steps: result.steps,
      events: result.events,
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
