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
  ActionHandler,
  SuggestedAction,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionType,
} from "./suggestions-types";

const NEWLINE_REGEX = /\r?\n/;

// ============================================================================
// Types for AI Context-Aware Suggestions
// ============================================================================

export interface BoardAnalysisContext {
  boardId: string;
  tenantId: string;
  userId?: string;
  timeframe?: "today" | "week" | "month";
}

export interface EntityRelationship {
  fromProjectionId: string;
  toProjectionId: string;
  fromEntity: { type: EntityType; id: string; name?: string };
  toEntity: { type: EntityType; id: string; name?: string };
  relationshipType: string;
}

export interface TemporalPattern {
  type: "upcoming_deadline" | "overdue" | "due_soon" | "conflict" | "gap";
  entities: Array<{
    entityType: EntityType;
    entityId: string;
    name?: string;
    date: Date;
  }>;
  severity: "high" | "medium" | "low";
}

export interface BoardStateAnalysis {
  boardId: string;
  projections: Array<{
    id: string;
    entityType: EntityType;
    entityId: string;
    positionX: number;
    positionY: number;
  }>;
  entitySummary: Record<EntityType, number>;
  relationships: EntityRelationship[];
  temporalPatterns: TemporalPattern[];
  capacityMetrics: {
    totalEntities: number;
    tasksByStatus: Record<string, number>;
    upcomingDeadlines: number;
    conflicts: number;
  };
}

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
      tags: { route: "ai-context-aware-suggestions" },
    });
    log.error(
      "[ai-context-aware-suggestions] Failed to resolve OPENAI_API_KEY",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );
    return null;
  }
}

// ============================================================================
// Board State Analysis
// ============================================================================

async function analyzeBoardState(
  context: BoardAnalysisContext
): Promise<BoardStateAnalysis | null> {
  try {
    const board = await database.commandBoard.findFirst({
      where: {
        id: context.boardId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!board) {
      return null;
    }

    const projections = await database.boardProjection.findMany({
      where: {
        boardId: context.boardId,
        tenantId: context.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        positionX: true,
        positionY: true,
      },
      take: 200,
    });

    // Build entity summary
    const entitySummary = projections.reduce<Record<string, number>>(
      (acc, p) => {
        acc[p.entityType] = (acc[p.entityType] ?? 0) + 1;
        return acc;
      },
      {}
    ) as Record<EntityType, number>;

    // Fetch related entities for temporal analysis
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const [events, prepTasks, kitchenTasks] = await Promise.all([
      database.event.findMany({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          eventDate: { gte: today, lte: nextWeek },
        },
        select: {
          id: true,
          title: true,
          eventDate: true,
        },
        take: 20,
      }),
      database.prepTask.findMany({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          status: { not: "completed" },
          dueByDate: { lte: nextWeek },
        },
        select: {
          id: true,
          name: true,
          dueByDate: true,
          status: true,
        },
        take: 20,
      }),
      database.kitchenTask.findMany({
        where: {
          tenantId: context.tenantId,
          deletedAt: null,
          status: { not: "completed" },
        },
        select: {
          id: true,
          title: true,
          status: true,
        },
        take: 20,
      }),
    ]);

    // Calculate temporal patterns
    const temporalPatterns: TemporalPattern[] = [];

    // Upcoming deadlines
    const upcomingDeadlines = [
      ...events.map((e) => ({
        entityType: "event" as const,
        entityId: e.id,
        name: e.title,
        date: e.eventDate,
      })),
      ...prepTasks.map((t) => ({
        entityType: "prep_task" as const,
        entityId: t.id,
        name: t.name,
        date: t.dueByDate,
      })),
    ]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcomingDeadlines.length > 0) {
      const dueSoon = upcomingDeadlines.filter((d) => {
        const daysUntil = Math.ceil(
          (d.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil <= 2;
      });

      if (dueSoon.length > 0) {
        temporalPatterns.push({
          type: "due_soon",
          entities: dueSoon,
          severity: dueSoon.some((d) => {
            const daysUntil = Math.ceil(
              (d.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= 1;
          })
            ? "high"
            : "medium",
        });
      }
    }

    // Task status summary
    const prepTaskStatuses = prepTasks.reduce<Record<string, number>>(
      (acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const kitchenTaskStatuses = kitchenTasks.reduce<Record<string, number>>(
      (acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      },
      {}
    );

    const tasksByStatus = { ...prepTaskStatuses, ...kitchenTaskStatuses };

    // Detect same-day conflicts
    const eventDates = events.map((e) => e.eventDate.toDateString());
    const dateCounts = eventDates.reduce<Record<string, number>>(
      (acc, date) => {
        acc[date] = (acc[date] ?? 0) + 1;
        return acc;
      },
      {}
    );

    Object.entries(dateCounts).forEach(([date, count]) => {
      if (count > 1) {
        const conflictingEvents = events.filter(
          (e) => e.eventDate.toDateString() === date
        );
        temporalPatterns.push({
          type: "conflict",
          entities: conflictingEvents.map((e) => ({
            entityType: "event" as const,
            entityId: e.id,
            name: e.title,
            date: e.eventDate,
          })),
          severity: count > 2 ? "high" : "medium",
        });
      }
    });

    // Build derived relationships based on entity types
    const relationships: EntityRelationship[] = [];
    const projectionMap = new Map(
      projections.map((p) => [`${p.entityType}:${p.entityId}`, p])
    );

    // Event-Task relationships
    projections
      .filter((p) => p.entityType === "event")
      .forEach((eventProj) => {
        projections
          .filter((p) => p.entityType === "prep_task")
          .forEach((taskProj) => {
            const event = events.find((e) => e.id === eventProj.entityId);
            if (event) {
              relationships.push({
                fromProjectionId: eventProj.id,
                toProjectionId: taskProj.id,
                fromEntity: {
                  type: "event",
                  id: event.id,
                  name: event.title,
                },
                toEntity: {
                  type: "prep_task",
                  id: taskProj.entityId,
                  name: prepTasks.find((t) => t.id === taskProj.entityId)?.name,
                },
                relationshipType: "event_to_task",
              });
            }
          });
      });

    return {
      boardId: context.boardId,
      projections,
      entitySummary,
      relationships,
      temporalPatterns,
      capacityMetrics: {
        totalEntities: projections.length,
        tasksByStatus,
        upcomingDeadlines: upcomingDeadlines.length,
        conflicts: temporalPatterns.filter((p) => p.type === "conflict").length,
      },
    };
  } catch (error) {
    captureException(error, {
      tags: { route: "ai-context-aware-suggestions" },
    });
    log.error("[ai-context-aware-suggestions] Failed to analyze board state", {
      error: error instanceof Error ? error.message : "Unknown error",
      boardId: context.boardId,
    });
    return null;
  }
}

// ============================================================================
// AI-Powered Suggestion Generation
// ============================================================================

const aiSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      type: z.enum([
        "deadline_alert",
        "resource_conflict",
        "capacity_warning",
        "optimization",
        "follow_up",
        "data_inconsistency",
        "actionable_insight",
      ]),
      category: z.enum([
        "events",
        "kitchen",
        "scheduling",
        "crm",
        "inventory",
        "general",
      ]),
      priority: z.enum(["high", "medium", "low"]),
      title: z.string().max(100),
      description: z.string().max(500),
      estimatedImpact: z.string().max(200).optional(),
      actionType: z.enum(["navigate", "bulk_create_cards", "function"]),
      actionPath: z.string().optional(),
      cardSuggestions: z
        .array(
          z.object({
            entityType: z.enum([
              "client",
              "event",
              "task",
              "employee",
              "inventory",
              "note",
            ]),
            title: z.string(),
            content: z.string().optional(),
            suggestedPosition: z.enum(["near_related", "grid_start", "auto"]),
          })
        )
        .optional(),
      reasoning: z.string().max(500),
    })
  ),
  summary: z.string().max(500),
});

async function generateAiSuggestions(
  boardAnalysis: BoardStateAnalysis,
  context: BoardAnalysisContext,
  maxSuggestions = 5
): Promise<SuggestedAction[]> {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    log.warn("[ai-context-aware-suggestions] No OpenAI API key available");
    return [];
  }

  try {
    const prompt = `You are an intelligent command board assistant. Analyze the current board state and suggest relevant actions.

Board State:
- Total Entities: ${boardAnalysis.capacityMetrics.totalEntities}
- Entity Breakdown: ${JSON.stringify(boardAnalysis.entitySummary, null, 2)}
- Upcoming Deadlines: ${boardAnalysis.capacityMetrics.upcomingDeadlines}
- Conflicts Detected: ${boardAnalysis.capacityMetrics.conflicts}
- Task Status: ${JSON.stringify(boardAnalysis.capacityMetrics.tasksByStatus, null, 2)}

Temporal Patterns:
${boardAnalysis.temporalPatterns
  .map(
    (p) => `- ${p.type} (${p.severity}): ${p.entities.length} entities affected`
  )
  .join("\n")}

Relationships:
- ${boardAnalysis.relationships.length} derived connections between entities

Generate ${maxSuggestions} actionable suggestions based on:
1. Temporal patterns (deadlines, conflicts, gaps)
2. Entity relationships and dependencies
3. Capacity metrics and workload distribution
4. Optimization opportunities

Each suggestion should be:
- Specific and actionable
- Prioritized by impact and urgency
- Context-aware based on board state
- Include clear reasoning`;

    const openaiClient = createOpenAI({
      apiKey,
    });

    const result = await generateObject({
      model: openaiClient("gpt-4o-mini"),
      schema: aiSuggestionSchema,
      prompt,
      temperature: 0.7,
    });

    const suggestions: SuggestedAction[] = result.object.suggestions.map(
      (s) => {
        let action: ActionHandler;

        if (s.actionType === "navigate" && s.actionPath) {
          action = { type: "navigate", path: s.actionPath };
        } else if (s.actionType === "bulk_create_cards" && s.cardSuggestions) {
          action = {
            type: "bulk_create_cards",
            cards: s.cardSuggestions.map((card, index) => ({
              entityType: card.entityType,
              title: card.title,
              content: card.content,
              position: {
                x: 100 + (index % 3) * 250,
                y: 100 + Math.floor(index / 3) * 200,
                width: 220,
                height: 160,
                zIndex: 1,
              },
            })),
            message: `Added ${s.cardSuggestions.length} cards to board`,
          };
        } else {
          action = { type: "navigate", path: "/" };
        }

        return {
          id: `ai-suggestion-${randomUUID()}`,
          tenantId: context.tenantId,
          type: s.type as SuggestionType,
          category: s.category as SuggestionCategory,
          priority: s.priority as SuggestionPriority,
          title: s.title,
          description: s.description,
          action,
          estimatedImpact: s.estimatedImpact,
          createdAt: new Date(),
          dismissed: false,
          metadata: {
            reasoning: s.reasoning,
            aiGenerated: true,
            boardId: context.boardId,
          },
        };
      }
    );

    return suggestions;
  } catch (error) {
    captureException(error, {
      tags: { route: "ai-context-aware-suggestions" },
    });
    log.error(
      "[ai-context-aware-suggestions] Failed to generate AI suggestions",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );
    return [];
  }
}

// ============================================================================
// Fallback Rule-Based Suggestions (when AI unavailable)
// ============================================================================

function generateFallbackSuggestions(
  boardAnalysis: BoardStateAnalysis,
  context: BoardAnalysisContext
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];

  // Deadline-based suggestions
  for (const pattern of boardAnalysis.temporalPatterns) {
    if (pattern.type === "due_soon") {
      suggestions.push({
        id: `fallback-suggestion-${randomUUID()}`,
        tenantId: context.tenantId,
        type: "deadline_alert",
        category: pattern.entities.some((e) => e.entityType === "event")
          ? "events"
          : "kitchen",
        priority: pattern.severity === "high" ? "high" : "medium",
        title: `${pattern.entities.length} item${pattern.entities.length > 1 ? "s" : ""} due soon`,
        description: `Review and prioritize ${pattern.entities.length} upcoming deadline${pattern.entities.length > 1 ? "s" : ""}.`,
        action: {
          type: "navigate",
          path: "/command-board",
        },
        estimatedImpact: "Prevent delays and ensure quality",
        createdAt: new Date(),
        dismissed: false,
      });
    }

    if (pattern.type === "conflict") {
      suggestions.push({
        id: `fallback-suggestion-${randomUUID()}`,
        tenantId: context.tenantId,
        type: "resource_conflict",
        category: "scheduling",
        priority: pattern.severity === "high" ? "high" : "medium",
        title: "Scheduling conflicts detected",
        description: `${pattern.entities.length} events overlap. Review allocation.`,
        action: {
          type: "navigate",
          path: "/scheduling",
        },
        estimatedImpact: "Resolve resource conflicts",
        createdAt: new Date(),
        dismissed: false,
      });
    }
  }

  // Capacity-based suggestions
  const incompleteTasks =
    boardAnalysis.capacityMetrics.tasksByStatus.pending ?? 0;
  if (incompleteTasks > 5) {
    suggestions.push({
      id: `fallback-suggestion-${randomUUID()}`,
      tenantId: context.tenantId,
      type: "capacity_warning",
      category: "kitchen",
      priority: "high",
      title: "High task workload",
      description: `${incompleteTasks} tasks pending. Consider redistributing.`,
      action: {
        type: "navigate",
        path: "/kitchen/tasks",
      },
      estimatedImpact: "Reduce bottleneck risk",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  return suggestions;
}

// ============================================================================
// Main Export: Generate Context-Aware Suggestions
// ============================================================================

export interface GenerateAiContextAwareSuggestionsInput {
  tenantId: string;
  boardId: string;
  userId?: string;
  timeframe?: "today" | "week" | "month";
  maxSuggestions?: number;
  useAi?: boolean;
}

export async function generateAiContextAwareSuggestions(
  input: GenerateAiContextAwareSuggestionsInput
): Promise<{
  suggestions: SuggestedAction[];
  summary: string;
  analysis: BoardStateAnalysis | null;
  generatedAt: Date;
  method: "ai" | "fallback";
}> {
  const {
    tenantId,
    boardId,
    userId,
    timeframe = "week",
    maxSuggestions = 5,
    useAi = true,
  } = input;

  // Analyze board state
  const boardAnalysis = await analyzeBoardState({
    boardId,
    tenantId,
    userId,
    timeframe,
  });

  if (!boardAnalysis) {
    return {
      suggestions: [],
      summary: "Could not analyze board state",
      analysis: null,
      generatedAt: new Date(),
      method: "fallback",
    };
  }

  // Generate suggestions using AI or fallback
  let suggestions: SuggestedAction[];
  let method: "ai" | "fallback";

  if (useAi && resolveOpenAiApiKey()) {
    suggestions = await generateAiSuggestions(
      boardAnalysis,
      { boardId, tenantId, userId, timeframe },
      maxSuggestions
    );
    method = "ai";
  } else {
    suggestions = generateFallbackSuggestions(boardAnalysis, {
      boardId,
      tenantId,
      userId,
      timeframe,
    });
    method = "fallback";
  }

  // Limit suggestions
  suggestions = suggestions.slice(0, maxSuggestions);

  return {
    suggestions,
    summary: `Generated ${suggestions.length} suggestions using ${method} analysis`,
    analysis: boardAnalysis,
    generatedAt: new Date(),
    method,
  };
}
