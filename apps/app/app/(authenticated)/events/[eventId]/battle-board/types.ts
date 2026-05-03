export interface TimelineTask {
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
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  availability: "available" | "at_capacity" | "overbooked";
  currentTaskCount: number;
  skills: string[];
}

export interface TimelineState {
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
}

export interface TaskPosition {
  startTime: number; // Minutes from event start
  duration: number; // Minutes
  row: number;
}

export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  startX: number;
  startY: number;
  originalStartTime: number;
  originalDuration: number;
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
