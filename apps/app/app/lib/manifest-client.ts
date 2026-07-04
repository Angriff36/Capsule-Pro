/**
 * Typed Manifest command client.
 *
 * THE single way UI code should invoke a governed command. It enforces the canonical
 * contract so pages stop guessing fetch URLs and response shapes:
 *
 *   sync command  -> { success: true, result, events, constraintOutcomes? }
 *   async command -> { success: true, jobId, status, enqueuedAt }   (Manifest async commands)
 *   failure       -> { success: false, error|message, constraintOutcomes?, diagnostics? }
 *
 * (See docs/database/SCHEMA_PLACEMENT_POLICY.md + manifest/contract-alignment-plan.md.)
 * Do NOT read `result.signature` / `result.data` ad hoc in components — use this client.
 */

import { apiFetch } from "@/app/lib/api";

export interface CommandSuccess<T = unknown> {
  constraintOutcomes?: unknown[];
  enqueuedAt?: number;
  events?: unknown[];
  // async-command envelope (no `result`; the work runs later via the job queue)
  jobId?: string;
  result?: T;
  status?: "pending" | "running" | "completed" | "failed" | string;
  success: true;
}

export interface CommandError {
  constraintOutcomes?: unknown[];
  diagnostics?: unknown[];
  error?: string;
  /**
   * Plain-language explanation with a suggested fix and a link to the
   * blocking entity. Produced by the API's friendly-error-mapper.
   */
  friendlyError?: {
    title: string;
    message: string;
    suggestedFix?: string;
    blockingEntity?: {
      type: string;
      id?: string;
      label: string;
      link?: string;
      reason?: string;
    };
    category: string;
    severity: "info" | "warning" | "error";
  };
  /** Failure kind (`guard_failed`, `policy_denied`, …) — server-mapped. */
  kind?: string;
  message?: string;
  success: false;
}

export type CommandEnvelope<T = unknown> = CommandSuccess<T> | CommandError;

export class CommandFailedError extends Error {
  readonly status: number;
  readonly constraintOutcomes?: unknown[];
  readonly diagnostics?: unknown[];
  readonly kind?: string;
  readonly friendlyError?: CommandError["friendlyError"];
  constructor(
    message: string,
    status: number,
    constraintOutcomes?: unknown[],
    diagnostics?: unknown[],
    kind?: string,
    friendlyError?: CommandError["friendlyError"]
  ) {
    super(message);
    this.name = "CommandFailedError";
    this.status = status;
    this.constraintOutcomes = constraintOutcomes;
    this.diagnostics = diagnostics;
    this.kind = kind;
    this.friendlyError = friendlyError;
  }
}

/**
 * Normalize any command response body into its result payload.
 * Canonical is `{ result }`; tolerates legacy `{ data }` / one-off custom keys during
 * migration so a single bad route can't crash a page. Returns undefined for async jobs.
 */
export function unwrapCommandResult<T = unknown>(
  json: CommandEnvelope<T> | Record<string, unknown> | null | undefined
): T | undefined {
  if (json == null || typeof json !== "object") {
    return;
  }
  const obj = json as Record<string, unknown>;
  if ("result" in obj) {
    return obj.result as T;
  }
  if ("data" in obj) {
    return obj.data as T;
  }
  return;
}

const dispatcherPath = (entity: string, command: string) =>
  `/api/manifest/${encodeURIComponent(entity)}/commands/${encodeURIComponent(command)}`;

/**
 * Execute a governed Manifest command and return the typed success envelope.
 *
 * Defaults to the canonical dispatcher (`/api/manifest/{entity}/commands/{command}`).
 * Pass `opts.path` to target a legacy/domain route during migration (it must still
 * return the canonical `{ success, result, events }` shape — most already do).
 *
 * Throws {@link CommandFailedError} on a non-2xx or `{ success: false }` response.
 */
export async function executeCommand<T = unknown>(
  entity: string,
  command: string,
  body: Record<string, unknown> = {},
  opts?: { path?: string; idempotencyKey?: string }
): Promise<CommandSuccess<T>> {
  const res = await apiFetch(opts?.path ?? dispatcherPath(entity, command), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.idempotencyKey
        ? { "Idempotency-Key": opts.idempotencyKey }
        : {}),
    },
    body: JSON.stringify(body),
  });

  let json: CommandEnvelope<T> | null = null;
  try {
    json = (await res.json()) as CommandEnvelope<T>;
  } catch {
    json = null;
  }

  if (!(res.ok && json) || json.success === false) {
    const errObj = json as CommandError | null;
    // Prefer the server's plain-language explanation so every call site that
    // toasts `err.message` shows the friendly text without per-site changes.
    // The raw `error`/`message` and the full `friendlyError` object are still
    // carried on the thrown error for richer UIs / debugging.
    const message =
      errObj?.friendlyError?.message ||
      errObj?.error ||
      errObj?.message ||
      `Command ${entity}.${command} failed (HTTP ${res.status})`;
    throw new CommandFailedError(
      message,
      res.status,
      errObj?.constraintOutcomes,
      errObj?.diagnostics,
      errObj?.kind,
      errObj?.friendlyError
    );
  }

  return json;
}

export interface ManifestBatchOperation {
  command: string;
  entity: string;
  params?: Record<string, unknown>;
}

export interface BatchOpResult<T = unknown> {
  events?: unknown[];
  noop?: boolean;
  result?: T;
}

/**
 * Execute an ordered array of governed commands as ONE server-side transaction
 * (POST /api/manifest/batch): every op commits together or the first failure
 * rolls the whole batch back. Returns the per-op results on success; throws
 * {@link CommandFailedError} on failure (the server message names the failing
 * op index). The server caps a batch at 50 ops (MANIFEST_BATCH_MAX_SIZE) —
 * chunk larger selections before calling.
 */
export async function executeCommandBatch<T = unknown>(
  operations: ManifestBatchOperation[]
): Promise<BatchOpResult<T>[]> {
  const res = await apiFetch("/api/manifest/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations }),
  });

  let json:
    | { results?: BatchOpResult<T>[]; success: true }
    | CommandError
    | null = null;
  try {
    json = (await res.json()) as
      | { results?: BatchOpResult<T>[]; success: true }
      | CommandError;
  } catch {
    json = null;
  }

  if (!(res.ok && json) || json.success !== true) {
    const errObj = json as CommandError | null;
    const message =
      errObj?.friendlyError?.message ||
      errObj?.error ||
      errObj?.message ||
      `Batch failed (HTTP ${res.status})`;
    throw new CommandFailedError(
      message,
      res.status,
      errObj?.constraintOutcomes,
      errObj?.diagnostics,
      errObj?.kind,
      errObj?.friendlyError
    );
  }

  return json.results ?? [];
}
