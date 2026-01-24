import { z } from "zod";
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
export declare const ConflictSchema: z.ZodObject<
  {
    id: z.ZodString;
    type: z.ZodEnum<{
      resource: "resource";
      scheduling: "scheduling";
      inventory: "inventory";
      staff: "staff";
      timeline: "timeline";
    }>;
    severity: z.ZodEnum<{
      high: "high";
      medium: "medium";
      low: "low";
      critical: "critical";
    }>;
    title: z.ZodString;
    description: z.ZodString;
    affectedEntities: z.ZodArray<
      z.ZodObject<
        {
          type: z.ZodEnum<{
            event: "event";
            inventory: "inventory";
            task: "task";
            employee: "employee";
          }>;
          id: z.ZodString;
          name: z.ZodString;
        },
        z.core.$strip
      >
    >;
    suggestedAction: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
  },
  z.core.$strip
>;
export declare const ConflictDetectionResultSchema: z.ZodObject<
  {
    conflicts: z.ZodArray<
      z.ZodObject<
        {
          id: z.ZodString;
          type: z.ZodEnum<{
            resource: "resource";
            scheduling: "scheduling";
            inventory: "inventory";
            staff: "staff";
            timeline: "timeline";
          }>;
          severity: z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
            critical: "critical";
          }>;
          title: z.ZodString;
          description: z.ZodString;
          affectedEntities: z.ZodArray<
            z.ZodObject<
              {
                type: z.ZodEnum<{
                  event: "event";
                  inventory: "inventory";
                  task: "task";
                  employee: "employee";
                }>;
                id: z.ZodString;
                name: z.ZodString;
              },
              z.core.$strip
            >
          >;
          suggestedAction: z.ZodOptional<z.ZodString>;
          createdAt: z.ZodDate;
        },
        z.core.$strip
      >
    >;
    summary: z.ZodObject<
      {
        total: z.ZodNumber;
        bySeverity: z.ZodRecord<
          z.ZodEnum<{
            high: "high";
            medium: "medium";
            low: "low";
            critical: "critical";
          }>,
          z.ZodNumber
        >;
        byType: z.ZodRecord<
          z.ZodEnum<{
            resource: "resource";
            scheduling: "scheduling";
            inventory: "inventory";
            staff: "staff";
            timeline: "timeline";
          }>,
          z.ZodNumber
        >;
      },
      z.core.$strip
    >;
    analyzedAt: z.ZodDate;
  },
  z.core.$strip
>;
//# sourceMappingURL=types.d.ts.map
