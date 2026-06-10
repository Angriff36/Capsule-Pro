/**
 * Canonical Manifest saga execution (transport-agnostic).
 *
 * Sagas do not auto-run — callers must invoke `runtime.runSaga` explicitly
 * after resolving per-step instanceIds and command inputs.
 */

import type { EmittedEvent, RuntimeEngine } from "@angriff36/manifest";

type SagaStepResult = {
  step: string;
  command: string;
  status: string;
  result?: unknown;
  error?: string;
};

type SagaRunResult = {
  success: boolean;
  status: string;
  steps: SagaStepResult[];
  emittedEvents?: EmittedEvent[];
  failedStep?: string;
  error?: string;
};

export interface ManifestUserContext {
  id: string;
  tenantId: string;
  role: string;
}

export type SagaStepInput = {
  instanceId?: string;
  input?: Record<string, unknown>;
};

export interface RunManifestSagaCoreParams {
  saga: string;
  steps: Record<string, SagaStepInput>;
  user: ManifestUserContext;
  correlationId?: string;
}

export interface RunManifestSagaCoreDeps {
  createRuntime: (ctx: {
    user: ManifestUserContext;
  }) => Promise<RuntimeEngine>;
}

export type RunManifestSagaFailureKind =
  | "unknown_saga"
  | "bootstrap_failed"
  | "saga_failed"
  | "runtime_error";

export interface RunManifestSagaCoreSuccess {
  ok: true;
  saga: string;
  status: string;
  steps: SagaStepResult[];
  events?: EmittedEvent[];
}

export interface RunManifestSagaCoreFailure {
  ok: false;
  saga: string;
  kind: RunManifestSagaFailureKind;
  httpStatus: number;
  message: string;
  status?: string;
  failedStep?: string;
  steps?: SagaStepResult[];
  error?: unknown;
}

export type RunManifestSagaCoreResult =
  | RunManifestSagaCoreSuccess
  | RunManifestSagaCoreFailure;

export async function runManifestSagaCore(
  deps: RunManifestSagaCoreDeps,
  params: RunManifestSagaCoreParams
): Promise<RunManifestSagaCoreResult> {
  const { saga, steps, user, correlationId } = params;

  try {
    const runtime = await deps.createRuntime({ user });
    // RuntimeEngine keeps `ir` private; peek it structurally (via `unknown`) to
    // pre-validate the saga name and return a clean 404. If the shape isn't
    // present (upstream rename), `known` defaults to true and we let runSaga
    // surface the failure — graceful degradation, never a false negative.
    const sagas = (
      runtime as unknown as { ir?: { sagas?: Array<{ name: string }> } }
    ).ir?.sagas;
    const known = sagas?.some((entry) => entry.name === saga) ?? true;

    if (!known) {
      return {
        ok: false,
        saga,
        kind: "unknown_saga",
        httpStatus: 404,
        message: `Unknown saga: ${saga}. Verify the saga name against the manifest IR.`,
      };
    }

    const result = (await runtime.runSaga(
      saga,
      steps,
      { correlationId }
    )) as SagaRunResult;

    if (!result.success) {
      return {
        ok: false,
        saga,
        kind: "saga_failed",
        httpStatus: 422,
        message:
          result.error ??
          `Saga ${saga} failed at step ${result.failedStep ?? "unknown"}`,
        status: result.status,
        failedStep: result.failedStep,
        steps: result.steps,
      };
    }

    return {
      ok: true,
      saga,
      status: result.status,
      steps: result.steps,
      events: result.emittedEvents,
    };
  } catch (error) {
    return {
      ok: false,
      saga,
      kind: "runtime_error",
      httpStatus: 500,
      message: error instanceof Error ? error.message : "Saga runtime error",
      error,
    };
  }
}
