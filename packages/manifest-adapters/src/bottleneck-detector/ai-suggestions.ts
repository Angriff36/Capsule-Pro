/**
 * AI-Powered Bottleneck Suggestions
 *
 * Generates intelligent improvement suggestions for detected bottlenecks
 * using OpenAI GPT models.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createOpenAI } from "@ai-sdk/openai";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { generateObject } from "ai";
import { z } from "zod";
import type {
  Bottleneck,
  BottleneckCategory,
  ImprovementSuggestion,
  SuggestionPriority,
  SuggestionType,
} from "./types.js";

const NEWLINE_REGEX = /\r?\n/;

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
      tags: { route: "bottleneck-ai-suggestions" },
    });
    log.error("[bottleneck-ai-suggestions] Failed to resolve OPENAI_API_KEY", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

// ============================================================================
// AI Suggestion Schema
// ============================================================================

const aiSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum([
        "process_change",
        "resource_reallocation",
        "capacity_expansion",
        "technology_adoption",
        "training",
        "scheduling_adjustment",
        "policy_change",
        "automation",
      ]),
      priority: z.enum(["low", "medium", "high", "urgent"]),
      title: z.string().max(100),
      description: z.string().max(500),
      reasoning: z.string().max(500),
      estimatedImpact: z.object({
        area: z.string().max(50),
        improvement: z.string().max(50),
        confidence: z.enum(["low", "medium", "high"]),
      }),
      implementation: z.object({
        effort: z.enum(["low", "medium", "high"]),
        timeframe: z.string().max(50),
        cost: z.string().optional(),
        prerequisites: z.array(z.string().max(100)).max(5),
      }),
      steps: z.array(z.string().max(200)).min(3).max(7),
    })
  ),
  summary: z.string().max(300),
});

// ============================================================================
// AI-Powered Suggestion Generation
// ============================================================================

/**
 * Generate AI-powered improvement suggestions for a bottleneck
 */
export async function generateAiSuggestion(
  bottleneck: Bottleneck,
  context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
  }
): Promise<ImprovementSuggestion | null> {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    log.warn("[bottleneck-ai-suggestions] No OpenAI API key available");
    return null;
  }

  try {
    const prompt = buildAiPrompt(bottleneck, context);

    const openaiClient = createOpenAI({
      apiKey,
    });

    const result = await generateObject({
      model: openaiClient("gpt-4o-mini"),
      schema: aiSuggestionSchema,
      prompt,
      temperature: 0.7,
    });

    const aiSuggestion = result.object.suggestions[0];
    if (!aiSuggestion) {
      return null;
    }

    return {
      id: `ai-suggestion-${Date.now()}`,
      bottleneckId: bottleneck.id,
      type: aiSuggestion.type as SuggestionType,
      priority: aiSuggestion.priority as SuggestionPriority,
      title: aiSuggestion.title,
      description: aiSuggestion.description,
      reasoning: aiSuggestion.reasoning,
      estimatedImpact: aiSuggestion.estimatedImpact,
      implementation: aiSuggestion.implementation,
      steps: aiSuggestion.steps,
      dismissed: false,
      dismissedAt: null,
      dismissedBy: null,
      dismissReason: null,
      createdAt: new Date(),
      aiGenerated: true,
    };
  } catch (error) {
    captureException(error, {
      tags: { route: "bottleneck-ai-suggestions" },
    });
    log.error("[bottleneck-ai-suggestions] Failed to generate AI suggestion", {
      error: error instanceof Error ? error.message : "Unknown error",
      bottleneckId: bottleneck.id,
    });
    return null;
  }
}

/**
 * Generate AI-powered suggestions for multiple bottlenecks
 */
export async function generateAiSuggestionsBatch(
  bottlenecks: Bottleneck[],
  context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
  }
): Promise<ImprovementSuggestion[]> {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    log.warn("[bottleneck-ai-suggestions] No OpenAI API key available");
    return [];
  }

  try {
    const prompt = buildBatchAiPrompt(bottlenecks, context);

    const openaiClient = createOpenAI({
      apiKey,
    });

    const result = await generateObject({
      model: openaiClient("gpt-4o-mini"),
      schema: z.object({
        suggestions: z.array(
          z.object({
            bottleneckId: z.string(),
            type: z.enum([
              "process_change",
              "resource_reallocation",
              "capacity_expansion",
              "technology_adoption",
              "training",
              "scheduling_adjustment",
              "policy_change",
              "automation",
            ]),
            priority: z.enum(["low", "medium", "high", "urgent"]),
            title: z.string().max(100),
            description: z.string().max(500),
            reasoning: z.string().max(500),
            estimatedImpact: z.object({
              area: z.string().max(50),
              improvement: z.string().max(50),
              confidence: z.enum(["low", "medium", "high"]),
            }),
            implementation: z.object({
              effort: z.enum(["low", "medium", "high"]),
              timeframe: z.string().max(50),
              cost: z.string().optional(),
              prerequisites: z.array(z.string().max(100)).max(5),
            }),
            steps: z.array(z.string().max(200)).min(3).max(7),
          })
        ),
        summary: z.string().max(300),
      }),
      prompt,
      temperature: 0.7,
    });

    return result.object.suggestions.map((s) => ({
      id: `ai-suggestion-${Date.now()}-${Math.random()}`,
      bottleneckId: s.bottleneckId,
      type: s.type as SuggestionType,
      priority: s.priority as SuggestionPriority,
      title: s.title,
      description: s.description,
      reasoning: s.reasoning,
      estimatedImpact: s.estimatedImpact,
      implementation: s.implementation,
      steps: s.steps,
      dismissed: false,
      dismissedAt: null,
      dismissedBy: null,
      dismissReason: null,
      createdAt: new Date(),
      aiGenerated: true,
    }));
  } catch (error) {
    captureException(error, {
      tags: { route: "bottleneck-ai-suggestions" },
    });
    log.error(
      "[bottleneck-ai-suggestions] Failed to generate AI suggestions batch",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );
    return [];
  }
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildAiPrompt(
  bottleneck: Bottleneck,
  context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
  }
): string {
  const categoryDescriptions: Record<BottleneckCategory, string> = {
    throughput: "Work output and completion rates",
    capacity: "Resource availability and utilization",
    efficiency: "Resource usage and time efficiency",
    quality: "Output quality and error rates",
    resource: "Inventory, equipment, and material availability",
    process: "Workflow and operational procedures",
  };

  return `You are an operations optimization expert. Analyze the following operational bottleneck and provide actionable improvement suggestions.

BOTTLENECK DETAILS:
------------------
Category: ${bottleneck.category} (${categoryDescriptions[bottleneck.category]})
Type: ${bottleneck.type}
Severity: ${bottleneck.severity}

Title: ${bottleneck.title}
Description: ${bottleneck.description}

METRICS:
--------
Current Value: ${bottleneck.metrics.currentValue.toFixed(2)}
Threshold: ${bottleneck.metrics.thresholdValue.toFixed(2)}
Percent Over Threshold: ${bottleneck.metrics.percentOverThreshold.toFixed(1)}%
Trend: ${bottleneck.metrics.trend}

AFFECTED ENTITY:
---------------
${bottleneck.affectedEntity ? `${bottleneck.affectedEntity.type}: ${bottleneck.affectedEntity.name}` : "Multiple entities"}

CONTEXT:
--------
${context?.historicalBottlenecks ? `Historical occurrences: ${context.historicalBottlenecks.length}` : "No historical data available"}

INSTRUCTIONS:
------------
Generate ONE specific, actionable improvement suggestion that:
1. Directly addresses the root cause of this bottleneck
2. Is practical to implement in a food service/catering operation
3. Has clear implementation steps
4. Provides realistic impact estimates
5. Considers the severity and urgency of the situation

The suggestion should be prioritized based on:
- Impact on operations (high/medium/low)
- Implementation effort (low/medium/high)
- Time to results (immediate/short-term/long-term)
- Cost considerations (if applicable)`;
}

function buildBatchAiPrompt(
  bottlenecks: Bottleneck[],
  context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
  }
): string {
  const bottleneckList = bottlenecks
    .map(
      (b, i) => `${i + 1}. [${b.severity.toUpperCase()}] ${b.title}
   - Category: ${b.category}
   - Type: ${b.type}
   - Current: ${b.metrics.currentValue.toFixed(2)} vs Threshold: ${b.metrics.thresholdValue.toFixed(2)}
   - Affected: ${b.affectedEntity?.name || "Multiple"}
   - ID: ${b.id}`
    )
    .join("\n");

  return `You are an operations optimization expert for a food service and catering business. Analyze the following bottlenecks and provide prioritized improvement suggestions.

DETECTED BOTTLENECKS:
-------------------
${bottleneckList}

${context?.historicalBottlenecks ? `HISTORICAL CONTEXT:\nThis tenant has had ${context.historicalBottlenecks.length} previous bottlenecks.\n` : ""}

INSTRUCTIONS:
------------
Generate ONE suggestion for EACH bottleneck above (match suggestions to bottleneck IDs). For each suggestion:
1. Prioritize actions that address the most severe bottlenecks first
2. Consider dependencies between bottlenecks
3. Provide realistic implementation steps
4. Estimate effort, timeframe, and expected impact
5. Focus on practical solutions for food service operations

OUTPUT FORMAT:
-------------
Return suggestions mapped to each bottleneck ID so they can be associated correctly.`;
}

// ============================================================================
// Suggestion Prioritization Helper
// ============================================================================

/**
 * Prioritize suggestions based on bottleneck severity and potential impact
 */
export function prioritizeSuggestions(
  suggestions: ImprovementSuggestion[],
  maxCount = 5
): ImprovementSuggestion[] {
  const priorityScore: Record<SuggestionPriority, number> = {
    urgent: 100,
    high: 75,
    medium: 50,
    low: 25,
  };

  return suggestions
    .sort((a, b) => {
      const scoreA = priorityScore[a.priority];
      const scoreB = priorityScore[b.priority];
      return scoreB - scoreA;
    })
    .slice(0, maxCount);
}

// ============================================================================
// Export utilities
// ============================================================================

export { resolveOpenAiApiKey };
