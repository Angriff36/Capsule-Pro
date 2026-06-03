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
  success: true;
  result?: T;
  events?: unknown[];
  constraintOutcomes?: unknown[];
  // async-command envelope (no `result`; the work runs later via the job queue)
  jobId?: string;
  status?: "pending" | "running" | "completed" | "failed" | string;
  enqueuedAt?: number;
}

export interface CommandError {
  success: false;
  error?: string;
  message?: string;
  constraintOutcomes?: unknown[];
  diagnostics?: unknown[];
}

export type CommandEnvelope<T = unknown> = CommandSuccess<T> | CommandError;

export class CommandFailedError extends Error {
  readonly status: number;
  readonly constraintOutcomes?: unknown[];
  readonly diagnostics?: unknown[];
  constructor(
    message: string,
    status: number,
    constraintOutcomes?: unknown[],
    diagnostics?: unknown[]
  ) {
    super(message);
    this.name = "CommandFailedError";
    this.status = status;
    this.constraintOutcomes = constraintOutcomes;
    this.diagnostics = diagnostics;
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
  if (json == null || typeof json !== "object") return undefined;
  const obj = json as Record<string, unknown>;
  if ("result" in obj) return obj.result as T;
  if ("data" in obj) return obj.data as T;
  return undefined;
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

  if (!res.ok || !json || json.success === false) {
    const errObj = json as CommandError | null;
    const message =
      errObj?.error ||
      errObj?.message ||
      `Command ${entity}.${command} failed (HTTP ${res.status})`;
    throw new CommandFailedError(
      message,
      res.status,
      errObj?.constraintOutcomes,
      errObj?.diagnostics
    );
  }

  return json;
}
