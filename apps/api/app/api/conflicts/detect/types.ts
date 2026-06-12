export const ConflictSeverity = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

export type ConflictSeverity =
  (typeof ConflictSeverity)[keyof typeof ConflictSeverity];

export const ConflictType = {
  scheduling: "scheduling",
  resource: "resource",
  staff: "staff",
  inventory: "inventory",
  equipment: "equipment",
  timeline: "timeline",
  venue: "venue",
  financial: "financial",
} as const;

export type ConflictType = (typeof ConflictType)[keyof typeof ConflictType];

export interface Conflict {
  affectedEntities: {
    type: "event" | "task" | "employee" | "inventory" | "equipment" | "venue";
    id: string;
    name: string;
  }[];
  createdAt: Date;
  description: string;
  id: string;
  resolutionOptions?: ResolutionOption[];
  severity: ConflictSeverity;
  suggestedAction?: string;
  title: string;
  type: ConflictType;
}

export interface ResolutionOption {
  affectedEntities: {
    type: "event" | "task" | "employee" | "inventory" | "equipment" | "venue";
    id: string;
    name: string;
  }[];
  description: string;
  estimatedImpact: "low" | "medium" | "high";
  type: "reassign" | "reschedule" | "substitute" | "cancel" | "split";
}

export interface ConflictDetectionRequest {
  boardId?: string;
  entityTypes?: ConflictType[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface DetectorWarning {
  detectorType: ConflictType;
  message: string;
}

export interface ConflictDetectionResult {
  analyzedAt: Date;
  conflicts: Conflict[];
  summary: {
    total: number;
    bySeverity: Record<ConflictSeverity, number>;
    byType: Record<ConflictType, number>;
  };
  /** Warnings from individual detectors that partially failed */
  warnings?: DetectorWarning[];
}

/** Typed error response for conflict detection API */
export interface ConflictApiError {
  code:
    | "AUTH_REQUIRED"
    | "UNAUTHORIZED"
    | "TENANT_NOT_FOUND"
    | "INVALID_TENANT_ID"
    | "USER_NOT_FOUND"
    | "INVALID_REQUEST"
    | "VALIDATION_ERROR"
    | "DETECTION_FAILED";
  /** Correlation ID for end-to-end tracing */
  correlationId?: string;
  /** Guidance for the user on how to proceed */
  guidance?: string;
  message: string;
}
