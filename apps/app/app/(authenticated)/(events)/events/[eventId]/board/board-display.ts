import type { EventBoardData, PaletteStaff } from "./actions";
import type { CommitDialogDraft } from "./components/commit-dialog";
import type { StaffImpact } from "./impact";

export interface BoardDisplayRows {
  /** Display-ready conflict rows for the impact rail. */
  conflictRows: Array<{ key: string; text: string }>;
  /** Per-draft rows for the review-and-commit dialog. */
  dialogDrafts: CommitDialogDraft[];
  /** Display-ready names of staff with no hourly rate on file. */
  missingRateNames: string[];
}

function formatShift(startIso: string, endIso: string): string {
  if (!(startIso && endIso)) {
    return "—";
  }
  const start = new Date(startIso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endIso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

/**
 * Maps raw impact ids (staffMemberId / cardId) to display-ready rows so the
 * ImpactRail and CommitDialog stay purely presentational.
 */
export function buildBoardDisplayRows(input: {
  impact: StaffImpact | undefined;
  staffDrafts: EventBoardData["draftCards"];
  dishDrafts: EventBoardData["draftCards"];
  paletteById: Map<string, PaletteStaff>;
  committedStaff: EventBoardData["committedStaff"];
}): BoardDisplayRows {
  const { impact, staffDrafts, dishDrafts, paletteById, committedStaff } =
    input;

  const staffName = (staffMemberId: string) =>
    paletteById.get(staffMemberId)?.name ??
    committedStaff.find((s) => s.staffMemberId === staffMemberId)?.name ??
    "Unknown staff";

  const conflicts = impact?.conflicts ?? [];
  const conflictByCard = new Map(conflicts.map((c) => [c.cardId, c.with]));

  const staffRows: CommitDialogDraft[] = staffDrafts.map((card) => {
    const params = card.envelope.draftAction.params;
    return {
      cardId: card.cardId,
      kind: "staff",
      name: card.title,
      subtitle: params.role ?? "",
      detail: formatShift(params.shiftStart ?? "", params.shiftEnd ?? ""),
      conflictWith: conflictByCard.get(card.cardId),
    };
  });

  const dishRows: CommitDialogDraft[] = dishDrafts.map((card) => {
    const params = card.envelope.draftAction.params;
    return {
      cardId: card.cardId,
      kind: "dish",
      name: card.title,
      subtitle: params.course ?? "",
      detail: `×${params.quantityServings ?? "?"} servings`,
    };
  });

  return {
    conflictRows: conflicts.map((c) => ({
      key: c.cardId,
      text: `${staffName(c.staffMemberId)} — conflicts with ${c.with}`,
    })),
    // Dedupe: missingRateStaffIds is per-draft, so a rate-less member with two
    // drafted shifts would otherwise be listed twice.
    missingRateNames: [...new Set(impact?.missingRateStaffIds ?? [])].map(
      staffName
    ),
    dialogDrafts: [...staffRows, ...dishRows],
  };
}
