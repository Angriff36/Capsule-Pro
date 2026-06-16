/**
 * Typed Manifest command client — compile-to-Convex path.
 *
 * All governed writes invoke generated Convex mutations (policies/guards/reactions
 * compiled in). No HTTP dispatcher, no RuntimeEngine.
 */

import { runConvexCommandBrowser } from "@/app/lib/convex/command-bridge-browser";
import { runConvexCommandAction } from "@/app/lib/convex/run-command.action";

export interface CommandSuccess<T = unknown> {
  constraintOutcomes?: unknown[];
  enqueuedAt?: number;
  events?: unknown[];
  jobId?: string;
  result?: T;
  status?: "pending" | "running" | "completed" | "failed" | string;
  success: true;
}

export interface CommandError {
  constraintOutcomes?: unknown[];
  diagnostics?: unknown[];
  error?: string;
  message?: string;
  success: false;
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

/**
 * Execute a governed Manifest command via the generated Convex mutation.
 */
export async function executeCommand<T = unknown>(
  entity: string,
  command: string,
  body: Record<string, unknown> = {},
  _opts?: { path?: string; idempotencyKey?: string }
): Promise<CommandSuccess<T>> {
  try {
    if (typeof window !== "undefined") {
      const result = await runConvexCommandBrowser<T>(entity, command, body);
      return { success: true, result, events: [] };
    }
    return await runConvexCommandAction<T>({ entity, command, body });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : `Command ${entity}.${command} failed`;
    throw new CommandFailedError(message, 400);
  }
}
