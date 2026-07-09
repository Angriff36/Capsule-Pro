/**
 * Mobile prep-item completion via the composite kitchen route.
 * Server resolves the actor (employee id) — the client must not send
 * completedByUserId or call PrepListItem.markCompleted directly.
 */

import { apiFetch } from "@/app/lib/api";

export interface SetPrepListItemCompletionInput {
  completed: boolean;
  itemId: string;
  prepListId: string;
}

export type SetPrepListItemCompletionResult =
  | { ok: true }
  | { ok: false; error: string };

interface CompleteResponse {
  error?: string;
  message?: string;
  success?: boolean;
}

/**
 * POST /api/kitchen/prep-lists/[id]/items/[itemId]/complete
 * Body: `{ completed }` only — actor identity stays server-owned.
 */
export async function setPrepListItemCompletionViaComposite(
  input: SetPrepListItemCompletionInput
): Promise<SetPrepListItemCompletionResult> {
  const path = `/api/kitchen/prep-lists/${encodeURIComponent(input.prepListId)}/items/${encodeURIComponent(input.itemId)}/complete`;

  const response = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ completed: input.completed }),
  });

  let json: CompleteResponse | null = null;
  try {
    json = (await response.json()) as CompleteResponse;
  } catch {
    json = null;
  }

  if (!(response.ok && json?.success === true)) {
    return {
      ok: false,
      error:
        json?.message ||
        json?.error ||
        `Failed to update prep item (HTTP ${response.status})`,
    };
  }

  return { ok: true };
}
