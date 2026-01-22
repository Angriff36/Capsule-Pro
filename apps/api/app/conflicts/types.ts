import { z } from "zod";

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

export const ConflictSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(
    Object.values(ConflictType) as [ConflictType, ...ConflictType[]]
  ),
  severity: z.enum(
    Object.values(ConflictSeverity) as [ConflictSeverity, ...ConflictSeverity[]]
  ),
  title: z.string(),
  description: z.string(),
  affectedEntities: z.array(
    z.object({
      type: z.enum(["event", "task", "employee", "inventory"]),
      id: z.string(),
      name: z.string(),
    })
  ),
  suggestedAction: z.string().optional(),
  createdAt: z.date(),
});

export const ConflictDetectionResultSchema = z.object({
  conflicts: z.array(ConflictSchema),
  summary: z.object({
    total: z.number(),
    bySeverity: z.record(
      z.enum(
        Object.values(ConflictSeverity) as [
          ConflictSeverity,
          ...ConflictSeverity[],
        ]
      ),
      z.number()
    ),
    byType: z.record(
      z.enum(Object.values(ConflictType) as [ConflictType, ...ConflictType[]]),
      z.number()
    ),
  }),
  analyzedAt: z.date(),
});
