import type { TaskBreakdown } from "../actions/task-breakdown";
interface TaskBreakdownDisplayProps {
  breakdown: TaskBreakdown;
  onRegenerate?: () => void;
  onExport?: () => void;
  onSave?: () => void;
  isGenerating?: boolean;
  generationProgress?: string;
}
export declare function TaskBreakdownDisplay({
  breakdown,
  onRegenerate,
  onExport,
  onSave,
  isGenerating,
  generationProgress,
}: TaskBreakdownDisplayProps): import("react").JSX.Element;
interface TaskBreakdownSkeletonProps {
  sections?: number;
}
export declare function TaskBreakdownSkeleton({
  sections,
}: TaskBreakdownSkeletonProps): import("react").JSX.Element;
interface GenerateTaskBreakdownModalProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  guestCount: number;
  venueName?: string;
  onGenerate: (customInstructions?: string) => Promise<void>;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export declare function GenerateTaskBreakdownModal({
  eventId,
  eventTitle,
  eventDate,
  guestCount,
  venueName,
  onGenerate,
  isOpen,
  onOpenChange,
}: GenerateTaskBreakdownModalProps): import("react").JSX.Element;
//# sourceMappingURL=task-breakdown-display.d.ts.map
