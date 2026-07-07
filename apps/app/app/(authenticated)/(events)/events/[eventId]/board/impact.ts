export interface StaffDraftInput {
  cardId: string;
  shiftEnd: string; // ISO
  shiftStart: string; // ISO
  staffMemberId: string;
}

export interface BusyInterval {
  end: string;
  label: string;
  start: string;
}

export interface StaffImpactInput {
  /** staffMemberId -> existing commitments */
  busyIntervals: Record<string, BusyInterval[]>;
  drafts: StaffDraftInput[];
  /** staffMemberId -> hourly rate as fixed-2 string (Decimal.toFixed(2)) */
  rates: Record<string, string>;
}

export interface StaffConflict {
  cardId: string;
  staffMemberId: string;
  with: string;
}

export interface StaffImpact {
  conflicts: StaffConflict[];
  laborCost: string; // fixed-2
  missingRateStaffIds: string[];
  totalHours: number;
}

function hoursBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return ms > 0 ? ms / 3_600_000 : 0;
}

function overlaps(aStart: string, aEnd: string, b: BusyInterval): boolean {
  return (
    new Date(aStart) < new Date(b.end) && new Date(b.start) < new Date(aEnd)
  );
}

export function computeStaffImpact(input: StaffImpactInput): StaffImpact {
  let laborCents = 0;
  let totalHours = 0;
  const missingRateStaffIds: string[] = [];
  const conflicts: StaffConflict[] = [];

  for (const draft of input.drafts) {
    const hours = hoursBetween(draft.shiftStart, draft.shiftEnd);
    totalHours += hours;
    const rate = input.rates[draft.staffMemberId];
    if (rate === undefined) {
      missingRateStaffIds.push(draft.staffMemberId);
    } else {
      laborCents += Math.round(Number(rate) * 100 * hours);
    }
    for (const busy of input.busyIntervals[draft.staffMemberId] ?? []) {
      if (overlaps(draft.shiftStart, draft.shiftEnd, busy)) {
        conflicts.push({
          cardId: draft.cardId,
          staffMemberId: draft.staffMemberId,
          with: busy.label,
        });
        break; // one conflict per draft is enough to surface
      }
    }
  }

  return {
    laborCost: (laborCents / 100).toFixed(2),
    totalHours,
    missingRateStaffIds,
    conflicts,
  };
}
