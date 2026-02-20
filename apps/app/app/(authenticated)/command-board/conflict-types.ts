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
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedEntities: {
    type: "event" | "task" | "employee" | "inventory" | "equipment" | "venue";
    id: string;
    name: string;
  }[];
  suggestedAction?: string;
  resolutionOptions?: ResolutionOption[];
  createdAt: Date;
}

export interface ResolutionOption {
  type: "reassign" | "reschedule" | "substitute" | "cancel" | "split";
  description: string;
  affectedEntities: {
    type: "event" | "task" | "employee" | "inventory" | "equipment" | "venue";
    id: string;
    name: string;
  }[];
  estimatedImpact: "low" | "medium" | "high";
}

export interface ConflictDetectionRequest {
  boardId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  entityTypes?: ConflictType[];
}

/** Warning from a detector that partially failed */
export interface DetectorWarning {
  detectorType: ConflictType;
  message: string;
}

export interface ConflictDetectionResult {
  conflicts: Conflict[];
  summary: {
    total: number;
    bySeverity: Record<ConflictSeverity, number>;
    byType: Record<ConflictType, number>;
  };
  analyzedAt: Date;
  /** Warnings from individual detectors that partially failed */
  warnings?: DetectorWarning[];
}
