/**
 * Runtime helpers over the generated {@link MANIFEST_FIELD_HINTS} artifact.
 * Pure + client-safe: no `node:fs`, no server context. Import from any client
 * or server component to resolve the Manifest constraint messages governing a
 * given entity field.
 */
import {
  MANIFEST_FIELD_HINTS,
  type ManifestFieldHint,
} from "@/app/lib/manifest-field-hints.generated";

export type {
  ManifestFieldHint,
  ManifestFieldHintSeverity,
} from "@/app/lib/manifest-field-hints.generated";

/**
 * All hints registered for an entity, keyed by property name. Returns an empty
 * object when the entity has no governed fields (or is unknown to the IR).
 *
 * @example
 *   const hints = getFieldHints("EventBudget");
 *   // → { totalBudgetAmount: [...], eventId: [...], ... }
 */
export function getFieldHints(entityName: string): Record<string, ManifestFieldHint[]> {
  return MANIFEST_FIELD_HINTS[entityName] ?? {};
}

/**
 * The hints governing a single entity property. Empty array when the field is
 * ungoverned or unknown.
 *
 * @example
 *   getFieldHint("AllergenWarning", "allergens")
 *   // → [{ message: "Allergens list is required", severity: "block", ... }]
 */
export function getFieldHint(
  entityName: string,
  propertyName: string
): ManifestFieldHint[] {
  return getFieldHints(entityName)[propertyName] ?? [];
}

/**
 * The display text for a single governed field — joined when multiple
 * constraints apply. Use this when you only need a plain string for a tooltip
 * (e.g. when wiring the hint into a non-React label). Prefer {@link getFieldHint}
 * when you need per-rule severity.
 *
 * @example
 *   getFieldHintText("ProposalDraft", "depositAmount")
 *   // → "Deposit amount must be non-negative"
 */
export function getFieldHintText(
  entityName: string,
  propertyName: string
): string {
  return getFieldHint(entityName, propertyName)
    .map((h) => h.message)
    .join(" · ");
}

/**
 * Whether a property on an entity is governed by at least one Manifest
 * constraint. Use this to decide whether to render an info icon at all.
 */
export function hasFieldHint(
  entityName: string,
  propertyName: string
): boolean {
  return getFieldHint(entityName, propertyName).length > 0;
}
