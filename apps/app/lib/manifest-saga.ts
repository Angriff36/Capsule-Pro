/**
 * Manifest saga execution for app server actions.
 *
 * Forwards to apps/api `POST /api/manifest/sagas/[saga]`.
 */

import { apiPostJsonServer } from "@/app/lib/api-server";
import type { ManifestUserContext } from "@/lib/manifest-command";

export type SagaStepInput = {
  instanceId?: string;
  input?: Record<string, unknown>;
};

export interface RunManifestSagaParams {
  correlationId?: string;
  saga: string;
  steps: Record<string, SagaStepInput>;
  user: ManifestUserContext;
}

export interface RunManifestSagaSuccess {
  events?: unknown[];
  ok: true;
  saga: string;
  status: string;
  steps: unknown;
}

export interface RunManifestSagaFailure {
  httpStatus: number;
  message: string;
  ok: false;
  saga: string;
}

export type RunManifestSagaResult =
  | RunManifestSagaSuccess
  | RunManifestSagaFailure;

export async function runManifestSaga(
  params: RunManifestSagaParams
): Promise<RunManifestSagaResult> {
  let response: Response;
  try {
    response = await apiPostJsonServer(
      `/api/manifest/sagas/${encodeURIComponent(params.saga)}`,
      {
        steps: params.steps,
        correlationId: params.correlationId,
      }
    );
  } catch (error) {
    return {
      ok: false,
      saga: params.saga,
      message:
        error instanceof Error
          ? error.message
          : "Manifest saga API unreachable",
      httpStatus: 500,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok || payload?.success !== true) {
    const message =
      (typeof payload?.error === "string" && payload.error) ||
      (typeof payload?.message === "string" && payload.message) ||
      `Saga request failed (${response.status})`;
    return {
      ok: false,
      saga: params.saga,
      message,
      httpStatus: response.status,
    };
  }

  return {
    ok: true,
    saga: typeof payload.saga === "string" ? payload.saga : params.saga,
    status: typeof payload.status === "string" ? payload.status : "completed",
    steps: payload.steps,
    ...(Array.isArray(payload.events) ? { events: payload.events } : {}),
  };
}
