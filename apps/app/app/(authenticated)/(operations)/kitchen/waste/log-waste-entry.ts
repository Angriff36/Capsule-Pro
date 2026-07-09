/**
 * Desktop waste logging via the composite kitchen waste route.
 * Server fills loggedBy, unitCost, eventId, notes, and unitId defaults —
 * the client must not reconstruct WasteEntry.create params.
 */

import { apiFetch } from "@/app/lib/api";

export interface LogWasteEntryInput {
  inventoryItemId: string;
  notes?: string;
  quantity: number;
  reasonId: number;
  /** Omitted when unset — composite route applies its own default. */
  unitId?: number;
}

export interface LoggedWasteEntry {
  id: string;
  totalCost: number;
  unitCost: number;
}

export type LogWasteEntryResult =
  | { ok: true; entry: LoggedWasteEntry }
  | { ok: false; error: string };

interface WasteCreateResponse {
  error?: string;
  message?: string;
  result?: Record<string, unknown> | null;
  success?: boolean;
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * POST /api/kitchen/waste/entries → WasteEntry.create (server-enriched).
 * Success only when the response is OK and carries a persisted result id.
 */
export async function logWasteEntryViaComposite(
  input: LogWasteEntryInput
): Promise<LogWasteEntryResult> {
  const body: Record<string, unknown> = {
    inventoryItemId: input.inventoryItemId,
    quantity: input.quantity,
    reasonId: input.reasonId,
  };
  if (input.unitId !== undefined) {
    body.unitId = input.unitId;
  }
  if (input.notes !== undefined && input.notes.length > 0) {
    body.notes = input.notes;
  }

  const response = await apiFetch("/api/kitchen/waste/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  let json: WasteCreateResponse | null = null;
  try {
    json = (await response.json()) as WasteCreateResponse;
  } catch {
    json = null;
  }

  const result = json?.result;
  if (!(response.ok && json?.success === true && result)) {
    return {
      ok: false,
      error:
        json?.message ||
        json?.error ||
        `Failed to log waste entry (HTTP ${response.status})`,
    };
  }

  const id = result.id;
  if (typeof id !== "string" || id.length === 0) {
    return {
      ok: false,
      error: "Waste entry response did not include a persisted id.",
    };
  }

  return {
    ok: true,
    entry: {
      id,
      unitCost: asFiniteNumber(result.unitCost),
      totalCost: asFiniteNumber(result.totalCost),
    },
  };
}
