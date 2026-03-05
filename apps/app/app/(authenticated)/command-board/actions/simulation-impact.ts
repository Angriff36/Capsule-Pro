"use server";

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenAI } from "@ai-sdk/openai";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { generateObject } from "ai";
import { z } from "zod";
import type { EntityType } from "../types/entities";
import type {
  PredictedOutcome,
  SimulationImpactAnalysis,
  SimulationScenario,
} from "../types/simulation";
import type { BoardDelta, SimulationContext } from "./boards";
import { computeBoardDelta, getSimulationContext } from "./boards";

// ============================================================================
// OpenAI API Key Resolution
// ============================================================================

function resolveOpenAiApiKey(): string | null {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  try {
    const userProfile = process.env.USERPROFILE;
    if (!userProfile) {
      return null;
    }

    const envTxtPath = join(userProfile, "Documents", "env.txt");
    if (!existsSync(envTxtPath)) {
      return null;
    }

    const NEWLINE_REGEX = /\r?\n/;
    const envContents = readFileSync(envTxtPath, "utf8");
    const line = envContents
      .split(NEWLINE_REGEX)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("OPENAI_API_KEY="));

    if (!line) {
      return null;
    }

    const key = line.slice("OPENAI_API_KEY=".length).trim();
    return key ? key.replace(/^['"]|['"]$/g, "") : null;
  } catch (error) {
    captureException(error, {
      tags: { route: "simulation-impact" },
    });
    log.error("[simulation-impact] Failed to resolve OPENAI_API_KEY", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// AI Impact Analysis Schema
// ============================================================================

const impactScoreSchema = z.object({
  level: z.enum(["low", "medium", "high", "critical"]),
  value: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
});

const predictedOutcomeSchema = z.object({
  changeType: z.enum(["addition", "removal", "modification"]),
  entityType: z.enum([
    "event",
    "client",
    "prep_task",
    "kitchen_task",
    "employee",
    "inventory_item",
    "recipe",
    "dish",
    "proposal",
    "shipment",
    "note",
    "risk",
    "financial_projection",
  ]),
  entityId: z.string(),
  entityName: z.string().optional(),
  impact: impactScoreSchema,
  predictedEffects: z.array(z.string()),
  cascadingImpacts: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      effect: z.string(),
    })
  ),
});

const aiImpactAnalysisSchema = z.object({
  overallImpact: impactScoreSchema,
  outcomes: z.array(predictedOutcomeSchema),
  recommendations: z.array(z.string()),
  riskFactors: z.array(z.string()),
  opportunities: z.array(z.string()),
  estimatedTimeToApply: z.number().optional(),
  requiresManualReview: z.boolean(),
});

// ============================================================================
// Context Building for Impact Analysis
// ============================================================================

interface ImpactAnalysisInput {
  simulationId: string;
  tenantId: string;
}

async function buildImpactAnalysisContext(input: ImpactAnalysisInput): Promise<{
  simulation: SimulationContext | null;
  sourceProjections: any[];
  delta: BoardDelta | null;
  entityDetails: Map<string, { type: EntityType; name: string; data: any }>;
}> {
  const { simulationId, tenantId } = input;

  // Get simulation context
  const simulation = await getSimulationContext(simulationId);
  if (!simulation) {
    return {
      simulation: null,
      sourceProjections: [],
      delta: null,
      entityDetails: new Map(),
    };
  }

  // Get source board projections
  const sourceBoard = await database.commandBoard.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: simulation.sourceBoardId,
      },
    },
    include: {
      projections: true,
    },
  });

  const sourceProjections = sourceBoard?.projections ?? [];

  // Compute delta
  const delta = await computeBoardDelta({
    originalProjections: sourceProjections,
    simulatedProjections: simulation.projections,
    originalGroups: [],
    simulatedGroups: simulation.groups,
    originalAnnotations: [],
    simulatedAnnotations: simulation.annotations,
  });

  // Fetch entity details for affected entities
  const entityDetails = new Map<
    string,
    { type: EntityType; name: string; data: any }
  >();

  const affectedEntityIds = new Set([
    ...delta.addedProjections.map((p) => p.entityId),
    ...delta.removedProjectionIds,
    ...delta.modifiedProjections.map((m) => m.id),
  ]);

  if (affectedEntityIds.size > 0) {
    // Fetch events
    const events = await database.event.findMany({
      where: {
        tenantId,
        id: { in: Array.from(affectedEntityIds) },
        deletedAt: null,
      },
      take: 50,
    });
    events.forEach((e) => {
      entityDetails.set(e.id, { type: "event", name: e.title, data: e });
    });

    // Fetch prep tasks
    const prepTasks = await database.prepTask.findMany({
      where: {
        tenantId,
        id: { in: Array.from(affectedEntityIds) },
        deletedAt: null,
      },
      take: 50,
    });
    prepTasks.forEach((t) => {
      entityDetails.set(t.id, { type: "prep_task", name: t.name, data: t });
    });

    // Fetch kitchen tasks
    const kitchenTasks = await database.kitchenTask.findMany({
      where: {
        tenantId,
        id: { in: Array.from(affectedEntityIds) },
        deletedAt: null,
      },
      take: 50,
    });
    kitchenTasks.forEach((t) => {
      entityDetails.set(t.id, { type: "kitchen_task", name: t.title, data: t });
    });
  }

  return {
    simulation,
    sourceProjections,
    delta,
    entityDetails,
  };
}

// ============================================================================
// AI-Powered Impact Analysis
// ============================================================================

async function generateAiImpactAnalysis(
  context: Awaited<ReturnType<typeof buildImpactAnalysisContext>>
): Promise<SimulationImpactAnalysis | null> {
  const apiKey = resolveOpenAiApiKey();
  if (!(apiKey && context.simulation && context.delta)) {
    return null;
  }

  try {
    const { simulation, delta, entityDetails } = context;

    // Build context summary for AI
    const changesSummary = {
      totalChanges: delta.summary.totalChanges,
      additions: delta.summary.additions,
      modifications: delta.summary.modifications,
      removals: delta.summary.removals,
    };

    const entityChanges = delta.addedProjections.map((p) => {
      const details = entityDetails.get(p.entityId);
      return {
        entityType: p.entityType,
        entityId: p.entityId,
        entityName: details?.name,
        changeType: "addition" as const,
      };
    });

    const modifiedChanges = delta.modifiedProjections.slice(0, 10).map((m) => {
      const proj = simulation.projections.find((p) => p.id === m.id);
      const details = proj ? entityDetails.get(proj.entityId) : undefined;
      return {
        entityType: proj?.entityType,
        entityId: proj?.entityId,
        entityName: details?.name,
        field: m.field,
        original: m.original,
        simulated: m.simulated,
        changeType: "modification" as const,
      };
    });

    const prompt = `You are analyzing the impact of proposed changes to a command board.

Simulation: ${simulation.simulationName}
Source Board: ${simulation.sourceBoardId}

Changes Summary:
- Total Changes: ${changesSummary.totalChanges}
- Additions: ${changesSummary.additions}
- Modifications: ${changesSummary.modifications}
- Removals: ${changesSummary.removals}

Entity Changes Being Analyzed:
${JSON.stringify(entityChanges.slice(0, 10), null, 2)}

Modified Fields:
${JSON.stringify(modifiedChanges, null, 2)}

Analyze the impact of these changes and provide:
1. Overall impact assessment (level 0-100, confidence 0-1)
2. Detailed predicted outcomes for each significant change
3. Recommendations for proceeding
4. Risk factors to consider
5. Opportunities that might arise
6. Whether this requires manual review before applying
7. Estimated time to apply these changes (in minutes)

Consider:
- Cascading effects (e.g., removing a task might affect event completion)
- Resource implications
- Schedule impacts
- Quality risks
- Dependencies between entities`;

    const openaiClient = createOpenAI({ apiKey });

    const result = await generateObject({
      model: openaiClient("gpt-4o-mini"),
      schema: aiImpactAnalysisSchema,
      prompt,
      temperature: 0.3,
    });

    const aiResult = result.object;

    // Build predicted outcomes with full context
    const outcomes: PredictedOutcome[] = aiResult.outcomes.map((o) => ({
      ...o,
      entityType: o.entityType as EntityType,
      cascadingImpacts: o.cascadingImpacts.map((c) => ({
        ...c,
        entityType: c.entityType as EntityType,
      })),
    }));

    return {
      simulationId: simulation.id,
      sourceBoardId: simulation.sourceBoardId,
      overallImpact: aiResult.overallImpact,
      delta,
      outcomes,
      recommendations: aiResult.recommendations,
      riskFactors: aiResult.riskFactors,
      opportunities: aiResult.opportunities,
      estimatedTimeToApply: aiResult.estimatedTimeToApply,
      requiresManualReview: aiResult.requiresManualReview,
    };
  } catch (error) {
    captureException(error, {
      tags: { route: "simulation-impact" },
    });
    log.error("[simulation-impact] Failed to generate AI impact analysis", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// Fallback Rule-Based Impact Analysis
// ============================================================================

function generateFallbackImpactAnalysis(
  context: Awaited<ReturnType<typeof buildImpactAnalysisContext>>
): SimulationImpactAnalysis | null {
  const { simulation, delta } = context;
  if (!(simulation && delta)) {
    return null;
  }

  const totalChanges = delta.summary.totalChanges;
  let impactLevel: "low" | "medium" | "high" | "critical" = "low";
  let impactValue = 0;

  // Calculate impact based on change volume and type
  if (totalChanges === 0) {
    impactLevel = "low";
    impactValue = 0;
  } else if (totalChanges <= 3) {
    impactLevel = "low";
    impactValue = 20;
  } else if (totalChanges <= 10) {
    impactLevel = "medium";
    impactValue = 45;
  } else if (totalChanges <= 20) {
    impactLevel = "high";
    impactValue = 70;
  } else {
    impactLevel = "critical";
    impactValue = 90;
  }

  // Escalate if there are removals
  if (delta.summary.removals > 0) {
    impactValue = Math.min(100, impactValue + 15);
    if (impactValue > 75) impactLevel = "critical";
    else if (impactValue > 50) impactLevel = "high";
  }

  const outcomes: PredictedOutcome[] = [];

  // Add outcome for each addition
  for (const added of delta.addedProjections.slice(0, 5)) {
    outcomes.push({
      changeType: "addition",
      entityType: added.entityType,
      entityId: added.entityId,
      impact: {
        level: "low",
        value: 15,
        confidence: 0.5,
      },
      predictedEffects: [
        `New ${added.entityType} added to the board`,
        "May require resource allocation",
      ],
      cascadingImpacts: [],
    });
  }

  // Add outcome for each removal
  for (const removedId of delta.removedProjectionIds.slice(0, 5)) {
    outcomes.push({
      changeType: "removal",
      entityType: "note" as EntityType, // Use a valid entity type as fallback
      entityId: removedId,
      impact: {
        level: "medium",
        value: 50,
        confidence: 0.5,
      },
      predictedEffects: [
        "Entity removed from the board",
        "May affect related entities or dependencies",
      ],
      cascadingImpacts: [],
    });
  }

  const recommendations: string[] = [];
  const riskFactors: string[] = [];
  const opportunities: string[] = [];

  if (delta.summary.removals > 0) {
    riskFactors.push(
      `${delta.summary.removals} entities will be removed - verify no critical data loss`
    );
    recommendations.push(
      "Review removed entities before merging to ensure no unintended deletions"
    );
  }

  if (delta.summary.additions > 5) {
    recommendations.push(
      "Consider staggering the addition of new entities for easier verification"
    );
  }

  if (totalChanges > 10) {
    riskFactors.push(
      "Large number of changes - higher risk of unintended side effects"
    );
    recommendations.push("Review changes in sections before merging");
  }

  if (delta.summary.modifications > 0) {
    opportunities.push(
      "Position/layout improvements may enhance board organization"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push("Changes appear safe to apply");
  }

  return {
    simulationId: simulation.id,
    sourceBoardId: simulation.sourceBoardId,
    overallImpact: {
      level: impactLevel,
      value: impactValue,
      confidence: 0.5,
    },
    delta,
    outcomes,
    recommendations,
    riskFactors,
    opportunities,
    estimatedTimeToApply: Math.ceil(totalChanges / 2), // ~2 changes per minute
    requiresManualReview: totalChanges > 10 || delta.summary.removals > 0,
  };
}

// ============================================================================
// Main Export: Analyze Simulation Impact
// ============================================================================

export interface AnalyzeSimulationImpactInput {
  simulationId: string;
  tenantId: string;
  useAi?: boolean;
}

export async function analyzeSimulationImpact(
  input: AnalyzeSimulationImpactInput
): Promise<{
  analysis: SimulationImpactAnalysis | null;
  method: "ai" | "fallback";
  error?: string;
}> {
  const { simulationId, tenantId, useAi = true } = input;

  try {
    const context = await buildImpactAnalysisContext({
      simulationId,
      tenantId,
    });

    if (!context.simulation) {
      return {
        analysis: null,
        method: "fallback",
        error: "Simulation not found",
      };
    }

    let analysis: SimulationImpactAnalysis | null = null;
    let method: "ai" | "fallback" = "fallback";

    if (useAi && resolveOpenAiApiKey()) {
      analysis = await generateAiImpactAnalysis(context);
      method = analysis ? "ai" : "fallback";
    }

    if (!analysis) {
      analysis = generateFallbackImpactAnalysis(context);
    }

    return {
      analysis,
      method,
    };
  } catch (error) {
    captureException(error, {
      tags: { route: "simulation-impact" },
    });
    log.error("[simulation-impact] Failed to analyze simulation impact", {
      error: error instanceof Error ? error.message : "Unknown error",
      simulationId,
    });
    return {
      analysis: null,
      method: "fallback",
      error: error instanceof Error ? error.message : "Analysis failed",
    };
  }
}

// ============================================================================
// Scenario Suggestions
// ============================================================================

const scenarioSuggestionSchema = z.object({
  scenarios: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      category: z.enum([
        "resource",
        "schedule",
        "cost",
        "risk",
        "optimization",
      ]),
      priority: z.enum(["low", "medium", "high"]),
      estimatedValue: z.string(),
      expectedOutcomes: z.array(z.string()),
      riskLevel: z.enum(["low", "medium", "high"]),
      estimatedDuration: z.number().optional(),
    })
  ),
  summary: z.string(),
});

export interface GenerateScenarioSuggestionsInput {
  boardId: string;
  tenantId: string;
  focusAreas?: Array<
    "bottlenecks" | "deadlines" | "resources" | "costs" | "quality"
  >;
  maxScenarios?: number;
  useAi?: boolean;
}

export async function generateScenarioSuggestions(
  input: GenerateScenarioSuggestionsInput
): Promise<{
  scenarios: SimulationScenario[];
  summary: string;
  method: "ai" | "fallback";
}> {
  const {
    boardId,
    tenantId,
    focusAreas = ["bottlenecks", "deadlines", "resources"],
    maxScenarios = 5,
    useAi = true,
  } = input;

  // Get board state for context
  const board = await database.commandBoard.findUnique({
    where: {
      tenantId_id: { tenantId, id: boardId },
    },
    include: {
      projections: {
        take: 100,
      },
    },
  });

  if (!board) {
    return {
      scenarios: [],
      summary: "Board not found",
      method: "fallback",
    };
  }

  const entityCounts = board.projections.reduce<Record<string, number>>(
    (acc, p) => {
      acc[p.entityType] = (acc[p.entityType] ?? 0) + 1;
      return acc;
    },
    {}
  );

  // Try AI generation
  if (useAi && resolveOpenAiApiKey()) {
    try {
      const prompt = `You are an intelligent command board assistant. Suggest ${maxScenarios} what-if simulation scenarios to explore.

Board State:
- Total Entities: ${board.projections.length}
- Entity Breakdown: ${JSON.stringify(entityCounts, null, 2)}
- Focus Areas: ${focusAreas.join(", ")}

For each scenario, provide:
1. A clear title and description
2. Category (resource, schedule, cost, risk, optimization)
3. Priority level
4. Expected value/benefit
5. Expected outcomes
6. Risk level
7. Estimated duration to explore

Scenarios should be:
- Actionable and specific
- Relevant to the board's current state
- Valuable for planning and decision-making`;

      const openaiClient = createOpenAI({
        apiKey: resolveOpenAiApiKey()!,
      });

      const result = await generateObject({
        model: openaiClient("gpt-4o-mini"),
        schema: scenarioSuggestionSchema,
        prompt,
        temperature: 0.7,
      });

      const scenarios: SimulationScenario[] = result.object.scenarios.map(
        (s, index) => ({
          scenarioId: `scenario-${randomUUID()}`,
          ...s,
          setupSteps: [], // Will be populated when scenario is selected
        })
      );

      return {
        scenarios: scenarios.slice(0, maxScenarios),
        summary: result.object.summary,
        method: "ai",
      };
    } catch (error) {
      captureException(error, {
        tags: { route: "scenario-suggestions" },
      });
      log.error("[scenario-suggestions] AI generation failed, using fallback", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Fallback scenarios
  const scenarios: SimulationScenario[] = [];

  if (focusAreas.includes("bottlenecks") || focusAreas.includes("resources")) {
    scenarios.push({
      scenarioId: `scenario-${randomUUID()}`,
      title: "Redistribute Task Workload",
      description:
        "Explore redistributing tasks from overloaded team members to balance workload",
      category: "resource",
      priority: "high",
      estimatedValue: "Reduce bottleneck risk by ~40%",
      setupSteps: [],
      expectedOutcomes: [
        "More balanced workload distribution",
        "Reduced individual overload",
        "Improved task completion rates",
      ],
      riskLevel: "low",
      estimatedDuration: 10,
    });
  }

  if (focusAreas.includes("deadlines")) {
    scenarios.push({
      scenarioId: `scenario-${randomUUID()}`,
      title: "Adjust Task Deadlines",
      description:
        "Explore moving non-critical task deadlines to relieve pressure on key dates",
      category: "schedule",
      priority: "medium",
      estimatedValue: "Improve on-time delivery by ~25%",
      setupSteps: [],
      expectedOutcomes: [
        "Better alignment with actual capacity",
        "Reduced deadline pressure",
        "Improved quality with more realistic timelines",
      ],
      riskLevel: "low",
      estimatedDuration: 8,
    });
  }

  if (focusAreas.includes("costs")) {
    scenarios.push({
      scenarioId: `scenario-${randomUUID()}`,
      title: "Consolidate Event Resources",
      description:
        "Explore sharing resources across concurrent events to reduce costs",
      category: "cost",
      priority: "medium",
      estimatedValue: "Potential 15-20% cost savings",
      setupSteps: [],
      expectedOutcomes: [
        "Reduced resource redundancy",
        "Lower operational costs",
        "Improved resource utilization",
      ],
      riskLevel: "medium",
      estimatedDuration: 12,
    });
  }

  if (focusAreas.includes("bottlenecks")) {
    scenarios.push({
      scenarioId: `scenario-${randomUUID()}`,
      title: "Add Buffer Tasks",
      description:
        "Explore adding buffer time/tasks to absorb unexpected delays or issues",
      category: "risk",
      priority: "high",
      estimatedValue: "Reduce schedule risk by ~30%",
      setupSteps: [],
      expectedOutcomes: [
        "Increased resilience to delays",
        "Better contingency planning",
        "Reduced emergency interventions",
      ],
      riskLevel: "low",
      estimatedDuration: 5,
    });
  }

  if (focusAreas.includes("resources")) {
    scenarios.push({
      scenarioId: `scenario-${randomUUID()}`,
      title: "Reorganize Board Layout",
      description:
        "Explore reorganizing entities by workflow stage for better visual clarity",
      category: "optimization",
      priority: "low",
      estimatedValue: "Improved team coordination and visibility",
      setupSteps: [],
      expectedOutcomes: [
        "Clearer visual workflow",
        "Easier status tracking",
        "Improved team communication",
      ],
      riskLevel: "low",
      estimatedDuration: 5,
    });
  }

  return {
    scenarios: scenarios.slice(0, maxScenarios),
    summary: `Generated ${scenarios.length} scenario suggestions based on board state`,
    method: "fallback",
  };
}
