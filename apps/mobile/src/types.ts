// Shared types for native mobile kitchen app

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
  action:
    | "claim"
    | "release"
    | "start"
    | "complete"
    | "markPrepComplete"
    | "updatePrepNotes";
  id: string;
  payload?: Record<string, unknown>;
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
  myStation: string | null;
  station: string | null;
}

// Navigation types - use type alias for React Navigation compatibility
export type RootTabParamList = {
  TodayTab: undefined;
  TasksTab: undefined;
  PrepListsTab: undefined;
  MyWorkTab: undefined;
  SearchTab: undefined;
  ProfileTab: undefined;
  SettingsTab: undefined;
};

export interface PrepListDetailParams {
  eventId?: string;
  id: string;
}

// Stack navigation types - use type alias for React Navigation compatibility
export type PrepListStackParamList = {
  PrepListsIndex: undefined;
  PrepListDetail: PrepListDetailParams;
};
