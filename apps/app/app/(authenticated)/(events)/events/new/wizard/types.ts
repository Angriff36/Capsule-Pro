import type { EventDraftSnapshot } from "../../actions";

/**
 * Accumulated wizard state. Mirrors the Event fields the wizard owns, mapped to
 * the six steps: Details → Menu → Budget → Staffing → Logistics → Review.
 *
 * Each step owns a disjoint slice of this object so auto-save can send a
 * partial slice to the governed `Event.update` command and the server action
 * merges it onto the existing draft.
 */
export interface EventWizardData {
  accessibilityOptions: string[];
  budget: string;
  eventDate: string;
  eventFormat: string;
  eventType: string;
  featuredMediaUrl: string;
  guestCount: string;
  notes: string;
  tags: string[];
  ticketPrice: string;
  ticketTier: string;
  title: string;
  venueAddress: string;
  venueName: string;
}

export interface WizardStep {
  /** Which fields this step is responsible for auto-saving. */
  fields: ReadonlyArray<keyof EventWizardData>;
  icon: string;
  id: string;
  subtitle: string;
  title: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  {
    fields: ["title", "eventType", "eventDate", "guestCount", "eventFormat"],
    icon: "ClipboardList",
    id: "details",
    subtitle: "Name, type, date & headcount",
    title: "Details",
  },
  {
    fields: ["tags", "accessibilityOptions"],
    icon: "UtensilsCrossed",
    id: "menu",
    subtitle: "Cuisine tags & dietary needs",
    title: "Menu",
  },
  {
    fields: ["budget", "ticketPrice", "ticketTier"],
    icon: "DollarSign",
    id: "budget",
    subtitle: "Budget, ticketing & tiers",
    title: "Budget",
  },
  {
    fields: ["notes"],
    icon: "Users",
    id: "staffing",
    subtitle: "Service & staffing notes",
    title: "Staffing",
  },
  {
    fields: ["venueName", "venueAddress", "featuredMediaUrl"],
    icon: "MapPin",
    id: "logistics",
    subtitle: "Venue, address & media",
    title: "Logistics",
  },
  {
    fields: [],
    icon: "ClipboardCheck",
    id: "review",
    subtitle: "Review & confirm",
    title: "Review",
  },
];

export const REVIEW_STEP_INDEX = WIZARD_STEPS.length - 1;

export const EMPTY_WIZARD_DATA: EventWizardData = {
  accessibilityOptions: [],
  budget: "",
  eventDate: "",
  eventFormat: "in_person",
  eventType: "catering",
  featuredMediaUrl: "",
  guestCount: "1",
  notes: "",
  tags: [],
  ticketPrice: "",
  ticketTier: "",
  title: "",
  venueAddress: "",
  venueName: "",
};

/**
 * Rehydrate wizard state from a persisted draft. Only the scalar fields the
 * wizard controls are carried over; numeric fields render as strings so inputs
 * stay controlled.
 */
export function wizardDataFromSnapshot(
  snapshot: EventDraftSnapshot
): EventWizardData {
  return {
    accessibilityOptions: snapshot.accessibilityOptions,
    budget: snapshot.budget ? String(snapshot.budget) : "",
    eventDate: snapshot.eventDate ?? "",
    eventFormat: snapshot.eventFormat ?? "in_person",
    eventType: snapshot.eventType || "catering",
    featuredMediaUrl: snapshot.featuredMediaUrl ?? "",
    guestCount: String(snapshot.guestCount || 1),
    notes: snapshot.notes ?? "",
    tags: snapshot.tags,
    ticketPrice: snapshot.ticketPrice ? String(snapshot.ticketPrice) : "",
    ticketTier: snapshot.ticketTier ?? "",
    title: snapshot.title,
    venueAddress: snapshot.venueAddress ?? "",
    venueName: snapshot.venueName ?? "",
  };
}

/**
 * Derive a 0–100 completion percentage from a snapshot's filled fields.
 * Each of the five content steps contributes equally; the review step is the
 * finalize action and is not a completion contributor. Used on the events list
 * so in-progress drafts show how close they are to ready.
 */
export function computeCompletionPercent(
  snapshot: Pick<
    EventDraftSnapshot,
    | "title"
    | "eventType"
    | "eventDate"
    | "guestCount"
    | "tags"
    | "accessibilityOptions"
    | "budget"
    | "ticketPrice"
    | "notes"
    | "venueName"
    | "status"
  >
): number {
  if (snapshot.status !== "draft") {
    return 100;
  }

  const detailsDone =
    !!snapshot.title.trim() &&
    !!snapshot.eventType.trim() &&
    !!snapshot.eventDate &&
    Number(snapshot.guestCount) > 0;
  const menuDone =
    snapshot.tags.length > 0 || snapshot.accessibilityOptions.length > 0;
  const budgetDone =
    Number(snapshot.budget) > 0 || Number(snapshot.ticketPrice) > 0;
  const staffingDone = !!(snapshot.notes ?? "").trim();
  const logisticsDone = !!(snapshot.venueName ?? "").trim();

  const completed = [
    detailsDone,
    menuDone,
    budgetDone,
    staffingDone,
    logisticsDone,
  ].filter(Boolean).length;

  return Math.round((completed / 5) * 100);
}

/** Determine which step a resumed draft should land on. */
export function stepIndexFromCompletion(percent: number): number {
  if (percent >= 100) {
    return REVIEW_STEP_INDEX;
  }
  // Map 0–99 across the five content steps (0..4).
  const step = Math.floor((percent / 100) * 5);
  return Math.min(step, WIZARD_STEPS.length - 2);
}
