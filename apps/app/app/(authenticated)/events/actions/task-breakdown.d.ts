export type TaskSection = "prep" | "setup" | "cleanup";
export interface TaskBreakdownItem {
  id: string;
  name: string;
  description?: string;
  section: TaskSection;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  relativeTime?: string;
  assignment?: string;
  ingredients?: string[];
  steps?: string[];
  isCritical: boolean;
  dueInHours?: number;
  historicalContext?: string;
  confidence?: number;
}
export interface TaskBreakdown {
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
  totalPrepTime: number;
  totalSetupTime: number;
  totalCleanupTime: number;
  guestCount: number;
  eventDate: Date;
  generatedAt: Date;
  historicalEventCount?: number;
  disclaimer?: string;
}
export interface GenerateTaskBreakdownParams {
  eventId: string;
  customInstructions?: string;
}
export declare function generateTaskBreakdown({
  eventId,
  customInstructions,
}: GenerateTaskBreakdownParams): Promise<TaskBreakdown>;
export declare function saveTaskBreakdown(
  eventId: string,
  breakdown: TaskBreakdown
): Promise<void>;
//# sourceMappingURL=task-breakdown.d.ts.map
