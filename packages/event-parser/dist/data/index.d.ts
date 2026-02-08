/**
 * Static data exports for event-parser package
 * Contains checklist templates and reference data
 */
import type { ChecklistSectionState } from "../types/checklist.js";
export { DEFAULT_TASK_LIBRARY } from "../types/battleBoard.js";
/**
 * Pre-Event Review Checklist Template
 * This is the standard checklist that kitchen staff must complete for every event.
 * The checklist-builder adapter attempts to auto-fill these questions from parsed PDFs.
 */
export declare const PRE_EVENT_REVIEW_TEMPLATE: ChecklistSectionState[];
/**
 * Create a fresh checklist instance from the template
 */
export declare function createChecklistFromTemplate(): ChecklistSectionState[];
/**
 * Count total questions in checklist
 */
export declare function countChecklistQuestions(
  sections: ChecklistSectionState[]
): {
  total: number;
  required: number;
  answered: number;
  autoFilled: number;
};
/**
 * Allergen reference data
 */
export declare const COMMON_ALLERGENS: readonly [
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat",
  "Soy",
  "Sesame",
  "Gluten",
];
/**
 * Standard position/role mappings
 */
export declare const POSITION_ROLE_MAP: Record<string, string>;
//# sourceMappingURL=index.d.ts.map
