// Shared types for mobile kitchen app

export interface Task {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  tags: string[];
  claims: Array<{
    id: string;
    employeeId: string;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null;
  }>;
  isClaimedByOthers?: boolean;
  isAvailable?: boolean;
  claimedAt?: string | null;
}

export interface ApiResponse {
  tasks: Task[];
  userId?: string;
}

export interface OfflineQueueItem {
  taskId: string;
  action: "claim" | "release" | "start";
  timestamp: string;
}

export interface PrepList {
  id: string;
  name: string;
  eventId: string | null;
  event?: {
    id: string;
    name: string;
    startTime: string | null;
    headcount: number | null;
  } | null;
  stationId: string | null;
  station?: {
    id: string;
    name: string;
  } | null;
  status: string;
  dueDate: string | null;
  completedCount: number;
  totalCount: number;
  items?: PrepListItem[];
}

export interface PrepListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  completed: boolean;
  notes: string | null;
  stationId: string | null;
  station?: {
    id: string;
    name: string;
  } | null;
}

export interface TodayEvent {
  id: string;
  name: string;
  startTime: string | null;
  headcount: number | null;
  unclaimedPrepCount: number;
  incompleteItemsCount: number;
  urgency: "critical" | "warning" | "ok";
}

export const priorityConfig: Record<number, { label: string; color: string }> =
  {
    1: { label: "CRITICAL", color: "bg-rose-500" },
    2: { label: "URGENT", color: "bg-red-500" },
    3: { label: "HIGH", color: "bg-orange-500" },
    4: { label: "MED-HIGH", color: "bg-amber-500" },
    5: { label: "MEDIUM", color: "bg-yellow-500" },
    6: { label: "MED-LOW", color: "bg-lime-500" },
    7: { label: "LOW", color: "bg-green-500" },
    8: { label: "VERY LOW", color: "bg-emerald-500" },
    9: { label: "MINIMAL", color: "bg-teal-500" },
    10: { label: "NONE", color: "bg-slate-400" },
  };
