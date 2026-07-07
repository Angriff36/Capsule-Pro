/**
 * Read-side draft completion calculation.
 *
 * Constitution §3: read paths may derive representations of domain state. This
 * mirrors the wizard's step model (Details → Menu → Budget → Staffing →
 * Logistics) so the events roster can show how close an in-progress draft is to
 * ready. Five content steps contribute equally; the review step is a finalize
 * action, not a completion contributor.
 *
 * Kept free of React/client imports so it can run in the server component that
 * queries the event list.
 */

interface DraftCompletionInput {
  accessibilityOptions: string[];
  budget: number;
  eventDate: string;
  eventType: string;
  guestCount: number;
  notes: string;
  status: string;
  tags: string[];
  ticketPrice: number;
  title: string;
  venueName: string;
}

export function computeDraftCompletion(input: DraftCompletionInput): number {
  if (input.status !== "draft") {
    return 100;
  }

  const detailsDone =
    !!input.title.trim() &&
    !!input.eventType.trim() &&
    !!input.eventDate &&
    input.guestCount > 0;
  const menuDone =
    input.tags.length > 0 || input.accessibilityOptions.length > 0;
  const budgetDone = input.budget > 0 || input.ticketPrice > 0;
  const staffingDone = !!input.notes.trim();
  const logisticsDone = !!input.venueName.trim();

  const completed = [
    detailsDone,
    menuDone,
    budgetDone,
    staffingDone,
    logisticsDone,
  ].filter(Boolean).length;

  return Math.round((completed / 5) * 100);
}
