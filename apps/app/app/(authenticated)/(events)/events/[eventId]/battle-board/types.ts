export interface TimelineTask {
  assigneeId?: string;
  assigneeName?: string;
  category: string;
  createdAt: string;
  dependencies: string[]; // Array of task IDs this task depends on
  description?: string;
  endTime: string;
  eventId: string;
  id: string;
  isOnCriticalPath: boolean;
  notes?: string;
  priority: "low" | "medium" | "high" | "critical";
  progress: number; // 0-100
  slackMinutes: number;
  startTime: string; // ISO time string for the event day
  status: "not_started" | "in_progress" | "completed" | "delayed" | "blocked";
  title: string;
  updatedAt: string;
}

export interface StaffMember {
  availability: "available" | "at_capacity" | "overbooked";
  avatarUrl?: string;
  currentTaskCount: number;
  id: string;
  name: string;
  role: string;
  skills: string[];
}

export interface TimelineState {
  selectedTaskIds: string[];
  showCriticalPath: boolean;
  showDependencies: boolean;
  staff: StaffMember[];
  tasks: TimelineTask[];
  viewport: {
    zoom: number;
    scrollX: number;
    scrollY: number;
  };
}

export interface TaskPosition {
  duration: number; // Minutes
  row: number;
  startTime: number; // Minutes from event start
}

export interface DragState {
  isDragging: boolean;
  originalDuration: number;
  originalStartTime: number;
  startX: number;
  startY: number;
  taskId: string | null;
}

export const TASK_STATUS_COLORS = {
  not_started: "bg-muted/20 text-muted-foreground border-muted/50",
  in_progress: "bg-muted/20 text-muted-foreground border-muted/50",
  completed: "bg-muted/20 text-muted-foreground border-muted/50",
  delayed: "bg-muted/20 text-muted-foreground border-muted/50",
  blocked: "bg-muted/20 text-muted-foreground border-muted/50",
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
