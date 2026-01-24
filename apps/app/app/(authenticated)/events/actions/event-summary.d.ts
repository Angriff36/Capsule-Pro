export type SummarySection =
  | "highlights"
  | "issues"
  | "financialPerformance"
  | "clientFeedback"
  | "insights";
export interface SummaryItem {
  title: string;
  description: string;
  severity?: "info" | "success" | "warning" | "critical";
  metric?: string;
}
export interface EventSummaryData {
  highlights: SummaryItem[];
  issues: SummaryItem[];
  financialPerformance: SummaryItem[];
  clientFeedback: SummaryItem[];
  insights: SummaryItem[];
  overallSummary: string;
}
export interface GeneratedEventSummary {
  id: string;
  eventId: string;
  highlights: SummaryItem[];
  issues: SummaryItem[];
  financialPerformance: SummaryItem[];
  clientFeedback: SummaryItem[];
  insights: SummaryItem[];
  overallSummary: string;
  generatedAt: Date;
  generationDurationMs: number;
}
export interface GetEventSummaryResult {
  success: boolean;
  summary?: GeneratedEventSummary;
  error?: string;
}
export declare function getEventSummary(
  eventId: string
): Promise<GetEventSummaryResult>;
export declare function generateEventSummary(
  eventId: string
): Promise<GeneratedEventSummary>;
export declare function deleteEventSummary(summaryId: string): Promise<void>;
//# sourceMappingURL=event-summary.d.ts.map
