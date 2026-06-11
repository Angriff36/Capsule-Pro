import type { EventBoardData, PaletteStaff } from "./actions";
import type { CommitDialogDraft } from "./components/commit-dialog";
import type { StaffImpact } from "./impact";

export interface BoardDisplayRows {
  /** Display-ready conflict rows for the impact rail. */
  conflictRows: Array<{ key: string; text: string }>;
  /** Display-ready names of staff with no hourly rate on file. */
  missingRateNames: string[];
  /** Per-draft rows for the review-and-commit dialog. */
  dialogDrafts: CommitDialogDraft[];
}

/**
 * Maps raw impact ids (staffMemberId / cardId) to display-ready rows so the
 * ImpactRail and CommitDialog stay purely presentational.
 */
export function buildBoardDisplayRows(input: {
  impact: StaffImpact | undefined;
  staffDrafts: EventBoardData["draftCards"];
  paletteById: Map<string, PaletteStaff>;
  committedStaff: EventBoardData["committedStaff"];
}): BoardDisplayRows {
  const { impact, staffDrafts, paletteById, committedStaff } = input;

  const staffName = (staffMemberId: string) =>
    paletteById.get(staffMemberId)?.name ??
    committedStaff.find((s) => s.staffMemberId === staffMemberId)?.name ??
    "Unknown staff";

  const conflicts = impact?.conflicts ?? [];
  const conflictByCard = new Map(conflicts.map((c) => [c.cardId, c.with]));

  return {
    conflictRows: conflicts.map((c) => ({
      key: c.cardId,
      text: `${staffName(c.staffMemberId)} — conflicts with ${c.with}`,
    })),
    // Dedupe: missingRateStaffIds is per-draft, so a rate-less member with two
    // drafted shifts would otherwise be listed twice.
    missingRateNames: [...new Set(impact?.missingRateStaffIds ?? [])].map(staffName),
    dialogDrafts: staffDrafts.map((card) => {
      const params = card.envelope.draftAction.params;
      return {
        cardId: card.cardId,
        name: card.title,
        role: params.role ?? "",
        shiftStart: params.shiftStart ?? "",
        shiftEnd: params.shiftEnd ?? "",
        conflictWith: conflictByCard.get(card.cardId),
      };
    }),
  };
}
