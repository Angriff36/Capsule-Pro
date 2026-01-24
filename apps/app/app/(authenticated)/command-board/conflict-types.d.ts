export declare const ConflictSeverity: {
  readonly low: "low";
  readonly medium: "medium";
  readonly high: "high";
  readonly critical: "critical";
};
export type ConflictSeverity =
  (typeof ConflictSeverity)[keyof typeof ConflictSeverity];
export declare const ConflictType: {
  readonly scheduling: "scheduling";
  readonly resource: "resource";
  readonly staff: "staff";
  readonly inventory: "inventory";
  readonly timeline: "timeline";
};
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
//# sourceMappingURL=conflict-types.d.ts.map
