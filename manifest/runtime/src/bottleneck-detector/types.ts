/**
 * Operational Bottleneck Detector Types
 *
 * Defines the data structures for detecting operational bottlenecks
 * and generating AI-powered improvement suggestions.
 */

/**
 * Bottleneck severity levels
 */
export enum BottleneckSeverity {
  Low = "low",
  Medium = "medium",
  High = "high",
  Critical = "critical",
}

/**
 * Bottleneck categories
 */
export enum BottleneckCategory {
  Throughput = "throughput",
  Capacity = "capacity",
  Efficiency = "efficiency",
  Quality = "quality",
  Resource = "resource",
  Process = "process",
}

/**
 * Bottleneck types for specific operational areas
 */
export enum BottleneckType {
  // Kitchen bottlenecks
  StationOverload = "station_overload",
  PrepTaskBacklog = "prep_task_backlog",
  RecipeComplexity = "recipe_complexity",
  StaffUnderutilization = "staff_underutilization",
  EquipmentUnderutilization = "equipment_underutilization",

  // Inventory bottlenecks
  StockoutRisk = "stockout_risk",
  Overstock = "overstock",
  SlowTurnover = "slow_turnover",
  SupplierDelay = "supplier_delay",

  // Scheduling bottlenecks
  DoubleBooking = "double_booking",
  InsufficientStaff = "insufficient_staff",
  OvertimeSpike = "overtime_spike",
  ShiftGap = "shift_gap",

  // Event bottlenecks
  LeadTimeOverflow = "lead_time_overflow",
  VenueConstraint = "venue_constraint",
  BudgetOverrun = "budget_overrun",

  // General operational
  ProcessDelay = "process_delay",
  CommunicationGap = "communication_gap",
  ApprovalBlockage = "approval_blockage",
}

/**
 * Detected bottleneck
 */
export interface Bottleneck {
  id: string;
  tenantId: string;
  category: BottleneckCategory;
  type: BottleneckType;
  severity: BottleneckSeverity;
  title: string;
  description: string;
  affectedEntity: {
    type: string;
    id: string;
    name: string;
  } | null;
  metrics: {
    currentValue: number;
    thresholdValue: number;
    percentOverThreshold: number;
    trend: "improving" | "stable" | "worsening";
  };
  context: Record<string, unknown>;
  detectedAt: Date;
  resolvedAt: Date | null;
  suggestion: ImprovementSuggestion | null;
}

/**
 * Improvement suggestion type
 */
export enum SuggestionType {
  ProcessChange = "process_change",
  ResourceReallocation = "resource_reallocation",
  CapacityExpansion = "capacity_expansion",
  TechnologyAdoption = "technology_adoption",
  Training = "training",
  SchedulingAdjustment = "scheduling_adjustment",
  PolicyChange = "policy_change",
  Automation = "automation",
}

/**
 * Priority for suggestions
 */
export enum SuggestionPriority {
  Low = "low",
  Medium = "medium",
  High = "high",
  Urgent = "urgent",
}

/**
 * Improvement suggestion
 */
export interface ImprovementSuggestion {
  id: string;
  bottleneckId: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  reasoning: string;
  estimatedImpact: {
    area: string;
    improvement: string; // e.g., "+20% throughput"
    confidence: "low" | "medium" | "high";
  };
  implementation: {
    effort: "low" | "medium" | "high";
    timeframe: string;
    cost?: string;
    prerequisites: string[];
  };
  steps: string[];
  dismissed: boolean;
  dismissedAt: Date | null;
  dismissedBy: string | null;
  dismissReason: string | null;
  createdAt: Date;
  aiGenerated: boolean;
}

/**
 * Detection rule configuration
 */
export interface DetectionRule {
  id: string;
  name: string;
  category: BottleneckCategory;
  type: BottleneckType;
  enabled: boolean;
  severity: BottleneckSeverity;
  threshold: {
    metric: string;
    operator: "gt" | "lt" | "eq" | "gte" | "lte";
    value: number;
    window?: string; // e.g., "7d", "30d"
  };
  context?: Record<string, unknown>;
}

/**
 * Performance metrics data point
 */
export interface PerformanceMetric {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Time series data for trend analysis
 */
export interface TimeSeriesData {
  metric: string;
  entity: {
    type: string;
    id: string;
    name: string;
  };
  dataPoints: PerformanceMetric[];
  aggregation: "avg" | "sum" | "count" | "min" | "max";
}

/**
 * Bottleneck analysis result
 */
export interface BottleneckAnalysis {
  tenantId: string;
  analysisPeriod: {
    start: Date;
    end: Date;
  };
  bottlenecks: Bottleneck[];
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
  healthScore: {
    overall: number; // 0-100
    byCategory: Record<BottleneckCategory, number>;
  };
  analyzedAt: Date;
}

/**
 * Bottleneck detector configuration
 */
export interface BottleneckDetectorConfig {
  enabled: boolean;
  sampleRate: number; // 0-1
  rules: DetectionRule[];
  aiEnabled: boolean;
  aiModel?: string;
  detectionWindow: string; // e.g., "7d", "30d"
  minDataPoints: number;
  cacheTtl: number; // milliseconds
}
