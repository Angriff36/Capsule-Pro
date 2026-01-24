export type TimelineTask = {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  assigneeId?: string;
  assigneeName?: string;
  progress: number;
  dependencies: string[];
  isOnCriticalPath: boolean;
  slackMinutes: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
export type StaffMember = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  availability: "available" | "at_capacity" | "overbooked";
  currentTaskCount: number;
  skills: string[];
};
export type TimelineState = {
  tasks: TimelineTask[];
  staff: StaffMember[];
  selectedTaskIds: string[];
  viewport: {
    zoom: number;
    scrollX: number;
    scrollY: number;
  };
  showDependencies: boolean;
  showCriticalPath: boolean;
};
export type TaskPosition = {
  startTime: number;
  duration: number;
  row: number;
};
export type DragState = {
  isDragging: boolean;
  taskId: string | null;
  startX: number;
  startY: number;
  originalStartTime: number;
  originalDuration: number;
};
export declare const TASK_STATUS_COLORS: {
  readonly not_started: "bg-slate-100 text-slate-700 border-slate-300";
  readonly in_progress: "bg-blue-50 text-blue-700 border-blue-300";
  readonly completed: "bg-green-50 text-green-700 border-green-300";
  readonly delayed: "bg-red-50 text-red-700 border-red-300";
  readonly blocked: "bg-orange-50 text-orange-700 border-orange-300";
};
export declare const TASK_STATUS_ICONS: {
  readonly not_started: "○";
  readonly in_progress: "◐";
  readonly completed: "●";
  readonly delayed: "!";
  readonly blocked: "⊘";
};
export declare const PRIORITY_ORDER: {
  readonly low: 0;
  readonly medium: 1;
  readonly high: 2;
  readonly critical: 3;
};
//# sourceMappingURL=types.d.ts.map
