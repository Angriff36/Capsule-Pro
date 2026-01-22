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
  timeline: "timeline",
} as const;

export type ConflictType = (typeof ConflictType)[keyof typeof ConflictType];

export type Conflict = {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedEntities: {
    type: "event" | "task" | "employee" | "inventory";
    id: string;
    name: string;
  }[];
  suggestedAction?: string;
  createdAt: Date;
};

export type ConflictDetectionRequest = {
  boardId?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  entityTypes?: ConflictType[];
};

export type ConflictDetectionResult = {
  conflicts: Conflict[];
  summary: {
    total: number;
    bySeverity: Record<ConflictSeverity, number>;
    byType: Record<ConflictType, number>;
  };
  analyzedAt: Date;
};
