export type ChecklistQuestionType = "single-select" | "yes-no" | "yes-no-na" | "text" | "textarea";
export interface ChecklistQuestionState {
    allowNotes?: boolean;
    autoFilled?: boolean;
    autoReason?: string;
    description?: string;
    id: string;
    notes?: string;
    options?: string[];
    prompt: string;
    required: boolean;
    type: ChecklistQuestionType;
    value: string | null;
}
export interface ChecklistSectionState {
    id: string;
    questions: ChecklistQuestionState[];
    summary?: string;
    title: string;
}
export interface EventChecklist {
    completedAt?: string;
    completion: number;
    generatedAt: string;
    sections: ChecklistSectionState[];
    updatedAt: string;
    version: string;
}
export interface AutoAnswer {
    autoReason?: string;
    notes?: string;
    value: string | null;
}
export declare const EVENT_TYPE_OPTIONS: readonly ["Bring Hot", "Full Service", "Delivery / Drop Off", "Action Station", "Vending", "Custom"];
export type EventTypeOption = (typeof EVENT_TYPE_OPTIONS)[number];
export declare const TIMELINE_ARRIVAL_OPTIONS: readonly ["No Change", "More", "Less"];
export type TimelineArrivalOption = (typeof TIMELINE_ARRIVAL_OPTIONS)[number];
//# sourceMappingURL=checklist.d.ts.map