"use client";

/**
 * Optimistic governed-command dispatch.
 *
 * Wraps {@link executeCommand} so a UI surface can apply a change *immediately*
 * (before the Manifest runtime responds), then reconcile with the authoritative
 * server result on success — or revert to the exact pre-command value on failure
 * and surface the runtime's translated (friendly) error.
 *
 * The runtime is the only authority for governed mutations (constitution §5/§6);
 * this hook owns presentation only. The optimistic value is a UI prediction that
 * the server response confirms or overrides — it never bypasses the command path.
 *
 * Per-command rollback snapshots are kept in React state (`snapshots`), captured
 * the instant before the optimistic value is applied, so a failed write restores
 * precisely what the user saw beforehand.
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { type CommandSuccess, executeCommand } from "@/app/lib/manifest-client";

export interface OptimisticRunOptions<T> {
  /** Fallback toast on failure when the thrown error carries no message. */
  errorMessage?: string;
  /** Value shown immediately, before the dispatcher responds. */
  optimistic: T;
  /**
   * Derive the displayed value from the server result. Defaults to keeping the
   * optimistic value (correct when the user-entered value is the new truth).
   */
  reconcile?: (success: CommandSuccess) => T;
  /** Toast on success (omit to stay silent). */
  successMessage?: string;
}

export function useOptimisticCommand<T>(serverValue: T) {
  // `override` masks `serverValue` while a command is in flight and after it
  // reconciles; null means "defer to the server value". Wrapped in an object so
  // a legitimate `null`/`undefined` T can still be an active override.
  const [override, setOverride] = useState<{ value: T } | null>(null);
  const [pending, setPending] = useState(false);
  // Pre-command rollback snapshots, keyed by command, kept in React state so a
  // failure restores the exact prior value (and callers can inspect what's in
  // flight). One field runs one command at a time, but keying by command keeps
  // concurrent dispatches independent.
  const [snapshots, setSnapshots] = useState<Record<string, T>>({});

  const value = override ? override.value : serverValue;

  const run = useCallback(
    async (
      entity: string,
      command: string,
      body: Record<string, unknown>,
      opts: OptimisticRunOptions<T>
    ): Promise<CommandSuccess | null> => {
      const snapshot = override ? override.value : serverValue;
      setSnapshots((s) => ({ ...s, [command]: snapshot }));
      setOverride({ value: opts.optimistic }); // apply immediately
      setPending(true);
      try {
        const res = await executeCommand(entity, command, body);
        // Reconcile the displayed value with the authoritative server response.
        setOverride({
          value: opts.reconcile ? opts.reconcile(res) : opts.optimistic,
        });
        if (opts.successMessage) {
          toast.success(opts.successMessage);
        }
        return res;
      } catch (err) {
        // Revert to the snapshot captured before this command ran, and surface
        // the runtime's friendly error (already mapped by executeCommand).
        setOverride({ value: snapshot });
        toast.error(
          err instanceof Error
            ? err.message
            : (opts.errorMessage ?? `Could not ${command}`)
        );
        return null;
      } finally {
        setPending(false);
        setSnapshots(({ [command]: _discard, ...rest }) => rest);
      }
    },
    [override, serverValue]
  );

  return { value, pending, snapshots, run };
}
