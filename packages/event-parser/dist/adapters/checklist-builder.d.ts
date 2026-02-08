/**
 * Checklist Builder
 * Builds Pre-Event Review checklist from parsed event data
 * Auto-fills answers based on extracted information
 */
import type {
  ChecklistQuestionState,
  ChecklistSectionState,
  EventChecklist,
} from "../types/checklist.js";
import type { ParsedEvent } from "../types/event.js";
export interface ChecklistBuildResult {
  checklist: EventChecklist;
  autoFilledCount: number;
  totalQuestions: number;
  warnings: string[];
  missingFields: string[];
}
/**
 * Build initial checklist with auto-filled answers from parsed event
 */
export declare function buildInitialChecklist(
  event: ParsedEvent
): ChecklistBuildResult;
/**
 * Update a single question in the checklist
 */
export declare function updateChecklistQuestion(
  checklist: EventChecklist,
  questionId: string,
  updates: {
    value?: string | null;
    notes?: string | null;
  }
): EventChecklist;
/**
 * Mark checklist as completed
 */
export declare function markChecklistCompleted(
  checklist: EventChecklist
): EventChecklist;
/**
 * Reopen a completed checklist
 */
export declare function reopenChecklist(
  checklist: EventChecklist
): EventChecklist;
/**
 * Check if a question has been answered
 */
export declare function isQuestionAnswered(
  question: ChecklistQuestionState
): boolean;
/**
 * Compute completion percentage
 */
export declare function computeChecklistCompletion(
  sections: ChecklistSectionState[]
): number;
//# sourceMappingURL=checklist-builder.d.ts.map
