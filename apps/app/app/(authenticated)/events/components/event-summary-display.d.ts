import type { GeneratedEventSummary } from "../actions/event-summary";
interface EventSummaryDisplayProps {
  eventId: string;
  eventTitle: string;
  initialSummary?: GeneratedEventSummary | null;
  onGenerate?: () => Promise<GeneratedEventSummary>;
  onDelete?: () => Promise<void>;
}
export declare function EventSummaryDisplay({
  eventId,
  eventTitle,
  initialSummary,
  onGenerate,
  onDelete,
}: EventSummaryDisplayProps): import("react").JSX.Element;
export declare function EventSummarySkeleton(): import("react").JSX.Element;
interface GenerateEventSummaryModalProps {
  eventId: string;
  eventTitle: string;
  onGenerate: () => Promise<GeneratedEventSummary>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export declare function GenerateEventSummaryModal({
  eventId,
  eventTitle,
  onGenerate,
  isOpen,
  onOpenChange,
}: GenerateEventSummaryModalProps): import("react").JSX.Element;
//# sourceMappingURL=event-summary-display.d.ts.map
