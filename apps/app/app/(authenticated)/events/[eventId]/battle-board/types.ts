export type TimelineTask = {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  startTime: string; // ISO time string for the event day
  endTime: string;
  status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  assigneeId?: string;
  assigneeName?: string;
  progress: number; // 0-100
  dependencies: string[]; // Array of task IDs this task depends on
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
  startTime: number; // Minutes from event start
  duration: number; // Minutes
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

export const TASK_STATUS_COLORS = {
  not_started: "bg-slate-100 text-slate-700 border-slate-300",
  in_progress: "bg-blue-50 text-blue-700 border-blue-300",
  completed: "bg-green-50 text-green-700 border-green-300",
  delayed: "bg-red-50 text-red-700 border-red-300",
  blocked: "bg-orange-50 text-orange-700 border-orange-300",
} as const;

export const TASK_STATUS_ICONS = {
  not_started: "○",
  in_progress: "◐",
  completed: "●",
  delayed: "!",
  blocked: "⊘",
} as const;

export const PRIORITY_ORDER = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
} as const;
