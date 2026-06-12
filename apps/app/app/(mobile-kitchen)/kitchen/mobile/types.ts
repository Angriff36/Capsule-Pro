// Shared types for mobile kitchen app

export interface Task {
  claimedAt?: string | null;
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
  dueDate: string | null;
  id: string;
  isAvailable?: boolean;
  isClaimedByOthers?: boolean;
  priority: number;
  status: string;
  summary: string | null;
  tags: string[];
  title: string;
}

export interface ApiResponse {
  tasks: Task[];
  userId?: string;
}

export interface OfflineQueueItem {
  action: "claim" | "release" | "start";
  taskId: string;
  timestamp: string;
}

export interface PrepList {
  completedCount: number;
  dueDate: string | null;
  event?: {
    id: string;
    name: string;
    startTime: string | null;
    headcount: number | null;
  } | null;
  eventId: string | null;
  id: string;
  items?: PrepListItem[];
  name: string;
  station?: {
    id: string;
    name: string;
  } | null;
  stationId: string | null;
  status: string;
  totalCount: number;
}

export interface PrepListItem {
  completed: boolean;
  id: string;
  name: string;
  notes: string | null;
  quantity: number;
  station?: {
    id: string;
    name: string;
  } | null;
  stationId: string | null;
  unit: string | null;
}

export interface TodayEvent {
  headcount: number | null;
  id: string;
  incompleteItemsCount: number;
  name: string;
  prepListIds: string[];
  startTime: string | null;
  unclaimedPrepCount: number;
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

// Bundle claim types
export interface BundleClaimRequest {
  taskIds: string[];
}

export interface BundleClaimResponse {
  alreadyClaimedTaskIds?: string[];
  data?: {
    claimed: Array<{
      taskId: string;
      claimId: string;
      status: string;
    }>;
    totalClaimed: number;
  };
  errorCode?: string;
  message?: string;
  notFoundTaskIds?: string[];
  success: boolean;
}

export interface TaskFilter {
  eventId?: string;
  priority?: number;
  station?: string;
}

export interface FilterState {
  eventId: string | null;
  minPriority: number | null;
  myStation: string | null; // localStorage-backed quick filter
  station: string | null;
}
