// ============================================================================
// AI Simulation Engine Types
// ============================================================================

import type { BoardDelta } from "../actions/boards";
import type { EntityType } from "./entities";
import type { CostImpact, RiskAssessment } from "./manifest-plan";

// ============================================================================
// Simulation Impact Analysis
// ============================================================================

/**
 * Impact score for a simulation change
 */
export interface ImpactScore {
  level: "low" | "medium" | "high" | "critical";
  value: number; // 0-100
  confidence: number; // 0-1
}

/**
 * Predicted outcome of a simulation change
 */
export interface PredictedOutcome {
  changeType: "addition" | "removal" | "modification";
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  impact: ImpactScore;
  predictedEffects: string[];
  cascadingImpacts: Array<{
    entityType: EntityType;
    entityId: string;
    effect: string;
  }>;
}

/**
 * Complete AI impact analysis for a simulation
 */
export interface SimulationImpactAnalysis {
  simulationId: string;
  sourceBoardId: string;
  overallImpact: ImpactScore;
  delta: BoardDelta;
  outcomes: PredictedOutcome[];
  recommendations: string[];
  riskFactors: string[];
  opportunities: string[];
  estimatedTimeToApply?: number; // in minutes
  requiresManualReview: boolean;
}

// ============================================================================
// Simulation Scenario Suggestions
// ============================================================================

/**
 * AI-suggested what-if scenario to explore
 */
export interface SimulationScenario {
  scenarioId: string;
  title: string;
  description: string;
  category: "resource" | "schedule" | "cost" | "risk" | "optimization";
  priority: "low" | "medium" | "high";
  estimatedValue: string;
  setupSteps: Array<{
    description: string;
    entityType?: EntityType;
    entityId?: string;
    action: "add" | "remove" | "move" | "modify";
  }>;
  expectedOutcomes: string[];
  riskLevel: "low" | "medium" | "high";
  estimatedDuration?: number; // in minutes to explore
}

/**
 * Request for generating scenario suggestions
 */
export interface ScenarioSuggestionRequest {
  boardId: string;
  tenantId: string;
  focusAreas?: Array<
    "bottlenecks" | "deadlines" | "resources" | "costs" | "quality"
  >;
  maxScenarios?: number;
  useAi?: boolean;
}

// ============================================================================
// Simulation Execution Plan
// ============================================================================

/**
 * Converts simulation results to executable manifest plan
 */
export interface SimulationExecutionPlan {
  planId: string;
  simulationId: string;
  title: string;
  summary: string;
  riskAssessment: RiskAssessment;
  costImpact: CostImpact;
  executionSteps: Array<{
    stepId: string;
    description: string;
    entityType: EntityType;
    entityId: string;
    command: string;
  }>;
  rollbackSteps: Array<{
    stepId: string;
    description: string;
    entityType: EntityType;
    entityId: string;
    command: string;
  }>;
}

// ============================================================================
// Simulation State Types
// ============================================================================

/**
 * State of a simulation session
 */
export interface SimulationSession {
  id: string;
  sourceBoardId: string;
  name: string;
  status: "active" | "analyzing" | "ready_to_merge" | "discarded";
  createdAt: Date;
  lastModified: Date;
  impactAnalysis: SimulationImpactAnalysis | null;
  scenarioHints: SimulationScenario[];
  executionPlan: SimulationExecutionPlan | null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ImpactAnalysisResponse {
  analysis: SimulationImpactAnalysis | null;
  error?: string;
}

export interface ScenarioSuggestionsResponse {
  scenarios: SimulationScenario[];
  summary: string;
  method: "ai" | "fallback";
}

export interface CreateExecutionPlanResponse {
  plan: SimulationExecutionPlan | null;
  error?: string;
}
