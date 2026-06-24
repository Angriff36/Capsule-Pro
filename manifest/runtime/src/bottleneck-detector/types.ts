/**
 * Operational Bottleneck Detector Types
 *
 * Defines the data structures for detecting operational bottlenecks
 * and generating AI-powered improvement suggestions.
 */

/**
 * Bottleneck severity levels
 */
export const BottleneckSeverity = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Critical: "critical",
} as const;
export type BottleneckSeverity =
  (typeof BottleneckSeverity)[keyof typeof BottleneckSeverity];

/**
 * Bottleneck categories
 */
export const BottleneckCategory = {
  Throughput: "throughput",
  Capacity: "capacity",
  Efficiency: "efficiency",
  Quality: "quality",
  Resource: "resource",
  Process: "process",
} as const;
export type BottleneckCategory =
  (typeof BottleneckCategory)[keyof typeof BottleneckCategory];

/**
 * Bottleneck types for specific operational areas
 */
export const BottleneckType = {
  // Kitchen bottlenecks
  StationOverload: "station_overload",
  PrepTaskBacklog: "prep_task_backlog",
  RecipeComplexity: "recipe_complexity",
  StaffUnderutilization: "staff_underutilization",
  EquipmentUnderutilization: "equipment_underutilization",

  // Inventory bottlenecks
  StockoutRisk: "stockout_risk",
  Overstock: "overstock",
  SlowTurnover: "slow_turnover",
  SupplierDelay: "supplier_delay",

  // Scheduling bottlenecks
  DoubleBooking: "double_booking",
  InsufficientStaff: "insufficient_staff",
  OvertimeSpike: "overtime_spike",
  ShiftGap: "shift_gap",

  // Event bottlenecks
  LeadTimeOverflow: "lead_time_overflow",
  VenueConstraint: "venue_constraint",
  BudgetOverrun: "budget_overrun",

  // General operational
  ProcessDelay: "process_delay",
  CommunicationGap: "communication_gap",
  ApprovalBlockage: "approval_blockage",
} as const;
export type BottleneckType =
  (typeof BottleneckType)[keyof typeof BottleneckType];

/**
 * Detected bottleneck
 */
export interface Bottleneck {
  affectedEntity: {
    type: string;
    id: string;
    name: string;
  } | null;
  category: BottleneckCategory;
  context: Record<string, unknown>;
  description: string;
  detectedAt: Date;
  id: string;
  metrics: {
    currentValue: number;
    thresholdValue: number;
    percentOverThreshold: number;
    trend: "improving" | "stable" | "worsening";
  };
  resolvedAt: Date | null;
  severity: BottleneckSeverity;
  suggestion: ImprovementSuggestion | null;
  tenantId: string;
  title: string;
  type: BottleneckType;
}

/**
 * Improvement suggestion type
 */
export const SuggestionType = {
  ProcessChange: "process_change",
  ResourceReallocation: "resource_reallocation",
  CapacityExpansion: "capacity_expansion",
  TechnologyAdoption: "technology_adoption",
  Training: "training",
  SchedulingAdjustment: "scheduling_adjustment",
  PolicyChange: "policy_change",
  Automation: "automation",
} as const;
export type SuggestionType =
  (typeof SuggestionType)[keyof typeof SuggestionType];

/**
 * Priority for suggestions
 */
export const SuggestionPriority = {
  Low: "low",
  Medium: "medium",
  High: "high",
  Urgent: "urgent",
} as const;
export type SuggestionPriority =
  (typeof SuggestionPriority)[keyof typeof SuggestionPriority];

/**
 * Improvement suggestion
 */
export interface ImprovementSuggestion {
  aiGenerated: boolean;
  bottleneckId: string;
  createdAt: Date;
  description: string;
  dismissed: boolean;
  dismissedAt: Date | null;
  dismissedBy: string | null;
  dismissReason: string | null;
  estimatedImpact: {
    area: string;
    improvement: string; // e.g., "+20% throughput"
    confidence: "low" | "medium" | "high";
  };
  id: string;
  implementation: {
    effort: "low" | "medium" | "high";
    timeframe: string;
    cost?: string;
    prerequisites: string[];
  };
  priority: SuggestionPriority;
  reasoning: string;
  steps: string[];
  title: string;
  type: SuggestionType;
}

/**
 * Detection rule configuration
 */
export interface DetectionRule {
  category: BottleneckCategory;
  context?: Record<string, unknown>;
  enabled: boolean;
  id: string;
  name: string;
  severity: BottleneckSeverity;
  threshold: {
    metric: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
    value: number;
    window?: string; // e.g., "7d", "30d"
  };
  type: BottleneckType;
}

/**
 * Performance metrics data point
 */
export interface PerformanceMetric {
  metadata?: Record<string, unknown>;
  timestamp: Date;
  value: number;
}

/**
 * Time series data for trend analysis
 */
export interface TimeSeriesData {
  aggregation: "avg" | "sum" | "count" | "min" | "max";
  dataPoints: PerformanceMetric[];
  entity: {
    type: string;
    id: string;
    name: string;
  };
  metric: string;
}

/**
 * Bottleneck analysis result
 */
export interface BottleneckAnalysis {
  analysisPeriod: {
    start: Date;
    end: Date;
  };
  analyzedAt: Date;
  bottlenecks: Bottleneck[];
  healthScore: {
    overall: number; // 0-100
    byCategory: Record<BottleneckCategory, number>;
  };
  summary: {
    total: number;
    bySeverity: Record<BottleneckSeverity, number>;
    byCategory: Record<BottleneckCategory, number>;
    topAffectedEntities: Array<{
      type: string;
      id: string;
      name: string;
      bottleneckCount: number;
    }>;
  };
  tenantId: string;
}

/**
 * Bottleneck detector configuration
 */
export interface BottleneckDetectorConfig {
  aiEnabled: boolean;
  aiModel?: string;
  cacheTtl: number; // milliseconds
  detectionWindow: string; // e.g., "7d", "30d"
  enabled: boolean;
  minDataPoints: number;
  rules: DetectionRule[];
  sampleRate: number; // 0-1
}
