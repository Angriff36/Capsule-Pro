/**
 * Mobile prep-item toggle orchestration: optimistic UI, composite persist,
 * revert on failure. Actor identity is never client-supplied.
 */

import {
  type SetPrepListItemCompletionResult,
  setPrepListItemCompletionViaComposite,
} from "./set-prep-list-item-completion";

export interface TogglePrepListItemCompletionDeps {
  applyOptimistic: (completed: boolean) => void;
  /** Current completion before toggle. */
  currentlyCompleted: boolean;
  isOnline: boolean;
  itemId: string;
  prepListId: string;
  queueOffline: (item: { itemId: string; completed: boolean }) => void;
  revert: () => Promise<void>;
  setCompletion?: (input: {
    completed: boolean;
    itemId: string;
    prepListId: string;
  }) => Promise<SetPrepListItemCompletionResult>;
}

export type TogglePrepListItemCompletionResult =
  | { ok: true; completed: boolean; queuedOffline?: boolean }
  | { ok: false; completed: boolean; error: string };

/**
 * Flip completion: optimistic first, then composite route when online.
 * On composite failure, calls `revert` so UI does not keep a false success.
 */
export async function togglePrepListItemCompletion(
  deps: TogglePrepListItemCompletionDeps
): Promise<TogglePrepListItemCompletionResult> {
  const nextCompleted = !deps.currentlyCompleted;
  deps.applyOptimistic(nextCompleted);

  if (!deps.isOnline) {
    deps.queueOffline({ itemId: deps.itemId, completed: nextCompleted });
    return { ok: true, completed: nextCompleted, queuedOffline: true };
  }

  const setCompletion =
    deps.setCompletion ?? setPrepListItemCompletionViaComposite;
  const result = await setCompletion({
    prepListId: deps.prepListId,
    itemId: deps.itemId,
    completed: nextCompleted,
  });

  if (!result.ok) {
    await deps.revert();
    return {
      ok: false,
      completed: nextCompleted,
      error: result.error,
    };
  }

  return { ok: true, completed: nextCompleted };
}
