/**
 * Event Edit Impact — pure delta computation + downstream mapping.
 *
 * Pre-commit "What will change?" preview for the Event Editor. Computes the
 * field-level delta between the current event and the form's pending values,
 * then maps each changed field to the downstream entity categories it affects
 * (kitchen prep, staffing, inventory, invoices, battle boards).
 *
 * The downstream-field→category mapping mirrors the propagation fan-out encoded
 * in `event-updated-board-sync-middleware` and the EventUpdated propagation
 * graph — i.e. it reflects what actually gets written when the Event.update
 * command commits.
 *
 * This module is PURE: no DB, no React, no server-only imports. Mirrors the
 * shape of `board/impact.ts` (computeStaffImpact) — a typed, deterministic
 * function suitable for unit testing.
 */

/** Downstream entity categories affected by an Event field change. */
export type ImpactCategory =
  | "kitchen_prep"
  | "staffing"
  | "inventory"
  | "invoices"
  | "battle_boards";

/** Display metadata for each downstream category. */
export const IMPACT_CATEGORY_META: Record<
  ImpactCategory,
  { label: string; description: string }
> = {
  kitchen_prep: {
    label: "Kitchen prep",
    description: "Prep tasks, menus, and dish timelines tied to the event",
  },
  staffing: {
    label: "Staffing",
    description: "Staff assignments and shift scheduling for the event",
  },
  inventory: {
    label: "Inventory",
    description: "Ingredient demand and stock reservations for the event",
  },
  invoices: {
    label: "Invoices",
    description: "Billing records and revenue projections for the event",
  },
  battle_boards: {
    label: "Battle boards",
    description: "Catering ops board snapshots synced from this event",
  },
};

/** Ordered list for stable UI rendering. */
export const IMPACT_CATEGORY_ORDER: ImpactCategory[] = [
  "kitchen_prep",
  "staffing",
  "inventory",
  "invoices",
  "battle_boards",
];

/**
 * Maps an Event field to the downstream categories it impacts when changed.
 *
 * Derived from the EventUpdated propagation fan-out: the
 * `event-updated-board-sync-middleware` re-syncs BattleBoard snapshots when
 * {eventDate, clientId, guestCount, venueName, venueAddress} change; kitchen
 * prep / staffing / inventory / invoices follow the event date and headcount.
 */
export const FIELD_IMPACT_MAP: Record<string, ImpactCategory[]> = {
  eventDate: ["kitchen_prep", "staffing", "inventory", "invoices", "battle_boards"],
  guestCount: ["kitchen_prep", "inventory", "invoices", "battle_boards"],
  clientId: ["invoices", "battle_boards"],
  venueName: ["battle_boards"],
  venueAddress: ["battle_boards"],
  title: ["battle_boards"],
  status: ["invoices"],
};

/** Human-readable labels for the diffed Event fields. */
export const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  eventDate: "Event date",
  guestCount: "Guest count",
  clientId: "Client",
  venueName: "Venue name",
  venueAddress: "Venue address",
  status: "Status",
  eventType: "Event type",
};

/** A single changed Event field and the categories it affects. */
export interface FieldChange {
  field: string;
  label: string;
  fromDisplay: string;
  toDisplay: string;
  affects: ImpactCategory[];
}

/** A concrete downstream entity that will be touched by the edit. */
export interface AffectedEntity {
  category: ImpactCategory;
  /** The downstream record's id (e.g. board id, assignment id, invoice id). */
  entityId: string;
  /** Display name for the entity (board name, staff name, dish title, etc.). */
  label: string;
  /** Fine-grained type label (e.g. "Staff assignment", "Prep task"). */
  subType: string;
  /** One-line reason this entity is affected. */
  reason: string;
}

/** Pre-commit preview payload returned by `previewEventEditImpact`. */
export interface EventEditImpact {
  eventId: string;
  generatedAt: number;
  /** Empty when the form matches the current event (no-op edit). */
  fieldChanges: FieldChange[];
  /** Concrete downstream records grouped + flattened. */
  affectedEntities: AffectedEntity[];
  summary: {
    totalAffected: number;
    byCategory: Record<ImpactCategory, number>;
  };
}

/** Empty (no-op) impact used as the initial state. */
export function emptyEventEditImpact(eventId: string): EventEditImpact {
  return {
    eventId,
    generatedAt: Date.now(),
    fieldChanges: [],
    affectedEntities: [],
    summary: {
      totalAffected: 0,
      byCategory: {
        kitchen_prep: 0,
        staffing: 0,
        inventory: 0,
        invoices: 0,
        battle_boards: 0,
      },
    },
  };
}

/**
 * Normalize a value for comparison + display. Coerces numbers/dates to strings
 * and trims. Returns the empty string for null/undefined so "was empty" vs
 * "now empty" diffs are stable.
 */
function normalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    // Date-only, UTC midnight-normalized for stable comparison across
    // form string formats ("YYYY-MM-DD" vs ISO).
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  return String(value).trim();
}

/** Human-friendly display for a field value (dates → readable, etc.). */
function displayValue(field: string, value: unknown): string {
  const normalized = normalize(value);
  if (normalized === "") {
    return "—";
  }
  if (field === "eventDate") {
    // Already YYYY-MM-DD from normalize; keep as-is for clarity.
    return normalized;
  }
  if (field === "guestCount") {
    return normalized;
  }
  return normalized;
}

/** Snapshot of the fields considered for the diff. */
export interface EventFieldSnapshot {
  title?: string | null;
  eventDate?: string | number | Date | null;
  guestCount?: number | string | null;
  clientId?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  status?: string | null;
  eventType?: string | null;
}

/**
 * Compute the set of field-level changes between the current event state and
 * the pending form values. Pure / deterministic.
 *
 * @returns FieldChange[] — only fields that actually differ.
 */
export function diffEventFields(
  before: EventFieldSnapshot,
  after: EventFieldSnapshot
): FieldChange[] {
  const keys = Object.keys(FIELD_IMPACT_MAP) as Array<keyof EventFieldSnapshot>;
  const changes: FieldChange[] = [];

  for (const key of keys) {
    const beforeRaw = before[key];
    const afterRaw = after[key];
    const beforeNorm = normalize(beforeRaw);
    const afterNorm = normalize(afterRaw);
    if (beforeNorm === afterNorm) {
      continue;
    }
    const affects = FIELD_IMPACT_MAP[key] ?? [];
    if (affects.length === 0) {
      continue;
    }
    changes.push({
      field: key,
      label: FIELD_LABELS[key] ?? key,
      fromDisplay: displayValue(key, beforeRaw),
      toDisplay: displayValue(key, afterRaw),
      affects,
    });
  }

  return changes;
}

/**
 * Union of categories touched by the given field changes. Used to decide which
 * downstream entity reads are worth doing.
 */
export function affectedCategoriesFromChanges(
  changes: FieldChange[]
): Set<ImpactCategory> {
  const set = new Set<ImpactCategory>();
  for (const change of changes) {
    for (const cat of change.affects) {
      set.add(cat);
    }
  }
  return set;
}

/**
 * Assemble the final impact payload from field changes + concrete downstream
 * entities. Pure (no I/O) — the caller supplies the DB-fetched entities.
 */
export function assembleEventEditImpact(
  eventId: string,
  fieldChanges: FieldChange[],
  affectedEntities: AffectedEntity[]
): EventEditImpact {
  const byCategory: Record<ImpactCategory, number> = {
    kitchen_prep: 0,
    staffing: 0,
    inventory: 0,
    invoices: 0,
    battle_boards: 0,
  };
  for (const entity of affectedEntities) {
    byCategory[entity.category] += 1;
  }

  return {
    eventId,
    generatedAt: Date.now(),
    fieldChanges,
    affectedEntities,
    summary: {
      totalAffected: affectedEntities.length,
      byCategory,
    },
  };
}
