// Pre-Event Review checklist types

export type ChecklistQuestionType =
  | 'single-select'
  | 'yes-no'
  | 'yes-no-na'
  | 'text'
  | 'textarea';

export interface ChecklistQuestionState {
  id: string;
  type: ChecklistQuestionType;
  prompt: string;
  description?: string;
  required: boolean;
  options?: string[];
  allowNotes?: boolean;
  value: string | null;
  notes?: string;
  autoFilled?: boolean;
  autoReason?: string;
}

export interface ChecklistSectionState {
  id: string;
  title: string;
  summary?: string;
  questions: ChecklistQuestionState[];
}

export interface EventChecklist {
  version: string;
  generatedAt: string;
  updatedAt: string;
  completedAt?: string;
  completion: number;
  sections: ChecklistSectionState[];
}

export interface AutoAnswer {
  value: string | null;
  notes?: string;
  autoReason?: string;
}

// Event type options for checklist
export const EVENT_TYPE_OPTIONS = [
  'Bring Hot',
  'Full Service',
  'Delivery / Drop Off',
  'Action Station',
  'Vending',
  'Custom',
] as const;

export type EventTypeOption = (typeof EVENT_TYPE_OPTIONS)[number];

// Timeline arrival options
export const TIMELINE_ARRIVAL_OPTIONS = ['No Change', 'More', 'Less'] as const;

export type TimelineArrivalOption = (typeof TIMELINE_ARRIVAL_OPTIONS)[number];
