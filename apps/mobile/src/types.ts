// Shared types for native mobile kitchen app

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
  id: string;
  taskId: string;
  action: "claim" | "release" | "start" | "complete" | "markPrepComplete" | "updatePrepNotes";
  payload?: Record<string, unknown>;
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
  prepListIds: string[];
}

export const priorityConfig: Record<number, { label: string; color: string }> = {
  1: { label: "CRITICAL", color: "#f43f5e" },
  2: { label: "URGENT", color: "#ef4444" },
  3: { label: "HIGH", color: "#f97316" },
  4: { label: "MED-HIGH", color: "#f59e0b" },
  5: { label: "MEDIUM", color: "#eab308" },
  6: { label: "MED-LOW", color: "#84cc16" },
  7: { label: "LOW", color: "#22c55e" },
  8: { label: "VERY LOW", color: "#10b981" },
  9: { label: "MINIMAL", color: "#14b8a6" },
  10: { label: "NONE", color: "#64748b" },
};

// Bundle claim types
export interface BundleClaimRequest {
  taskIds: string[];
}

export interface BundleClaimResponse {
  success: boolean;
  data?: {
    claimed: Array<{
      taskId: string;
      claimId: string;
      status: string;
    }>;
    totalClaimed: number;
  };
  message?: string;
  errorCode?: string;
  alreadyClaimedTaskIds?: string[];
  notFoundTaskIds?: string[];
}

export interface TaskFilter {
  station?: string;
  priority?: number;
  eventId?: string;
}

export interface FilterState {
  station: string | null;
  minPriority: number | null;
  eventId: string | null;
  myStation: string | null;
}

// Navigation types
export type RootTabParamList = {
  TodayTab: undefined;
  TasksTab: undefined;
  PrepListsTab: undefined;
  MyWorkTab: undefined;
};

export type PrepListDetailParams = {
  id: string;
  eventId?: string;
};

// Stack navigation types
export type PrepListStackParamList = {
  PrepListsIndex: undefined;
  PrepListDetail: PrepListDetailParams;
};
