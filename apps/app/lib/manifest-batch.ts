/**
 * Manifest batch execution for app server actions.
 *
 * Forwards to apps/api `POST /api/manifest/batch`, which executes all
 * operations in one governed transaction or rolls the whole batch back.
 */

import { apiPostJsonServer } from "@/app/lib/api-server";

export interface ManifestBatchOperation {
  command: string;
  entity: string;
  params?: Record<string, unknown>;
}

export interface RunManifestBatchSuccess {
  ok: true;
  results: unknown[];
}

export interface RunManifestBatchFailure {
  httpStatus: number;
  message: string;
  ok: false;
}

export type RunManifestBatchResult =
  | RunManifestBatchSuccess
  | RunManifestBatchFailure;

export async function runManifestBatch(params: {
  operations: ManifestBatchOperation[];
}): Promise<RunManifestBatchResult> {
  let response: Response;
  try {
    response = await apiPostJsonServer("/api/manifest/batch", {
      operations: params.operations,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Manifest batch API unreachable",
      httpStatus: 500,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!response.ok || payload?.success !== true) {
    return {
      ok: false,
      message:
        (typeof payload?.error === "string" && payload.error) ||
        (typeof payload?.message === "string" && payload.message) ||
        `Batch request failed (${response.status})`,
      httpStatus: response.status,
    };
  }

  return {
    ok: true,
    results: Array.isArray(payload.results) ? payload.results : [],
  };
}
