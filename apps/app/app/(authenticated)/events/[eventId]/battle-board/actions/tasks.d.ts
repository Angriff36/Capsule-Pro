export type CreateTimelineTaskInput = {
  eventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  assigneeId?: string;
  dependencies?: string[];
};
export type UpdateTimelineTaskInput = {
  id: string;
  eventId: string;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  status?: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  priority?: "low" | "medium" | "high" | "critical";
  category?: string;
  assigneeId?: string | null;
  progress?: number;
  dependencies?: string[];
  notes?: string;
};
export declare function getTimelineTasks(eventId: string): Promise<
  {
    id: string;
    eventId: string;
    title: string;
    description: string | undefined;
    startTime: string;
    endTime: string;
    status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
    priority: "low" | "medium" | "high" | "critical";
    category: string;
    assigneeId: string | undefined;
    assigneeName: string | undefined;
    progress: number;
    dependencies: string[];
    isOnCriticalPath: boolean;
    slackMinutes: number;
    notes: string | undefined;
    createdAt: string;
    updatedAt: string;
  }[]
>;
export declare function createTimelineTask(
  input: CreateTimelineTaskInput
): Promise<
  | {
      success: boolean;
      error: string;
      taskId?: undefined;
    }
  | {
      success: boolean;
      taskId: string;
      error?: undefined;
    }
>;
export declare function updateTimelineTask(
  input: UpdateTimelineTaskInput
): Promise<{
  success: boolean;
}>;
export declare function deleteTimelineTask(
  taskId: string,
  eventId: string
): Promise<{
  success: boolean;
}>;
export declare function getEventStaff(eventId: string): Promise<
  {
    id: string;
    name: string;
    role: string;
    avatarUrl: string | undefined;
    availability: "available" | "at_capacity" | "overbooked";
    currentTaskCount: number;
    skills: never[];
  }[]
>;
/**
 * Calculate and update the critical path for all tasks in an event.
 *
 * This function:
 * 1. Fetches all tasks for the event
 * 2. Calculates the critical path using the CPM algorithm
 * 3. Updates the is_on_critical_path and slack_minutes fields for each task
 * 4. Returns the updated critical path results
 *
 * @param eventId - The ID of the event
 * @returns Map of task ID to critical path calculation results
 */
export declare function calculateCriticalPath(
  eventId: string
): Promise<Map<any, any>>;
//# sourceMappingURL=tasks.d.ts.map
