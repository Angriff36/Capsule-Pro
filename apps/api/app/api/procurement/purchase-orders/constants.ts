/**
 * Purchase Order domain constants.
 *
 * Extracted from hardcoded values per BUG-2 audit.
 * These should eventually be driven by manifest config, but are now at least
 * centrally defined and importable.
 */

/** Valid state transitions for purchase orders */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["ordered", "cancelled"],
  ordered: ["received", "cancelled"],
  received: [],
  cancelled: [],
  rejected: [],
};

/** PO status values */
export const PO_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  APPROVED: "approved",
  ORDERED: "ordered",
  RECEIVED: "received",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
} as const;

/** PO item quality status values */
export const QUALITY_STATUS = {
  ACCEPTED: "accepted",
  PARTIAL: "partial",
  REJECTED: "rejected",
} as const;
