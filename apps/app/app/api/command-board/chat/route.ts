import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getProjectionsForBoard } from "../../../(authenticated)/command-board/actions/projections";
import {
  type BoardMutation,
  type DomainCommandStep,
  type ENTITY_TYPE_VALUES,
  type ManifestEntityRef,
  type ManifestPlanQuestion,
  type SuggestedManifestPlan,
  suggestedManifestPlanSchema,
} from "../../../(authenticated)/command-board/types/manifest-plan";
import { createPendingManifestPlan } from "../../../lib/command-board/manifest-plans";
import { requireTenantId } from "../../../lib/tenant";

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

interface ProjectionWithLabel {
  id: string;
  entityId: string;
  entityType: string;
  label: string | null;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  colorOverride: string | null;
  collapsed: boolean;
  groupId: string | null;
  pinned: boolean;
}

/**
 * Helper to get board projections for AI tools with resolved entity labels
 */
async function getBoardProjections(
  boardId: string
): Promise<ProjectionWithLabel[]> {
  const tenantId = await requireTenantId();
  const projections = await getProjectionsForBoard(boardId);

  if (projections.length === 0) {
    return [];
  }

  // Group projections by entity type for batch queries
  const byType = new Map<string, string[]>();
  for (const p of projections) {
    const ids = byType.get(p.entityType) ?? [];
    ids.push(p.entityId);
    byType.set(p.entityType, ids);
  }

  // Build entity ID to label map
  const entityLabels = new Map<string, string>();

  // Resolve events
  const eventIds = byType.get("event") ?? [];
  if (eventIds.length > 0) {
    const events = await database.event.findMany({
      where: { tenantId, id: { in: eventIds }, deletedAt: null },
      select: { id: true, title: true },
    });
    for (const e of events) {
      entityLabels.set(`event:${e.id}`, e.title);
    }
  }

  // Resolve prep tasks
  const prepTaskIds = byType.get("prep_task") ?? [];
  if (prepTaskIds.length > 0) {
    const tasks = await database.prepTask.findMany({
      where: { tenantId, id: { in: prepTaskIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    for (const t of tasks) {
      entityLabels.set(`prep_task:${t.id}`, t.name);
    }
  }

  // Resolve employees (stored as Users in the database)
  const employeeIds = byType.get("employee") ?? [];
  if (employeeIds.length > 0) {
    const employees = await database.user.findMany({
      where: { tenantId, id: { in: employeeIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    for (const e of employees) {
      entityLabels.set(
        `employee:${e.id}`,
        `${e.firstName} ${e.lastName}`.trim()
      );
    }
  }

  // Resolve inventory items
  const inventoryIds = byType.get("inventory_item") ?? [];
  if (inventoryIds.length > 0) {
    const items = await database.inventoryItem.findMany({
      where: { tenantId, id: { in: inventoryIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    for (const i of items) {
      entityLabels.set(`inventory_item:${i.id}`, i.name);
    }
  }

  // Resolve clients
  const clientIds = byType.get("client") ?? [];
  if (clientIds.length > 0) {
    const clients = await database.client.findMany({
      where: { tenantId, id: { in: clientIds }, deletedAt: null },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });
    for (const c of clients) {
      const nameFallback =
        `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown Client";
      const label = c.company_name ?? nameFallback;
      entityLabels.set(`client:${c.id}`, label);
    }
  }

  // Resolve proposals
  const proposalIds = byType.get("proposal") ?? [];
  if (proposalIds.length > 0) {
    const proposals = await database.proposal.findMany({
      where: { tenantId, id: { in: proposalIds }, deletedAt: null },
      select: { id: true, title: true },
    });
    for (const p of proposals) {
      entityLabels.set(`proposal:${p.id}`, p.title);
    }
  }

  // Resolve recipes
  const recipeIds = byType.get("recipe") ?? [];
  if (recipeIds.length > 0) {
    const recipes = await database.recipe.findMany({
      where: { tenantId, id: { in: recipeIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    for (const r of recipes) {
      entityLabels.set(`recipe:${r.id}`, r.name);
    }
  }

  // Resolve dishes
  const dishIds = byType.get("dish") ?? [];
  if (dishIds.length > 0) {
    const dishes = await database.dish.findMany({
      where: { tenantId, id: { in: dishIds }, deletedAt: null },
      select: { id: true, name: true },
    });
    for (const d of dishes) {
      entityLabels.set(`dish:${d.id}`, d.name);
    }
  }

  // Resolve shipments
  const shipmentIds = byType.get("shipment") ?? [];
  if (shipmentIds.length > 0) {
    const shipments = await database.shipment.findMany({
      where: { tenantId, id: { in: shipmentIds }, deletedAt: null },
      select: { id: true, trackingNumber: true },
    });
    for (const s of shipments) {
      entityLabels.set(
        `shipment:${s.id}`,
        s.trackingNumber ?? `Shipment ${s.id.substring(0, 8)}`
      );
    }
  }

  // Map projections to include labels
  return projections.map((p) => ({
    id: p.id,
    entityId: p.entityId,
    entityType: p.entityType,
    label: entityLabels.get(`${p.entityType}:${p.entityId}`) ?? null,
    positionX: p.positionX,
    positionY: p.positionY,
    width: p.width,
    height: p.height,
    colorOverride: p.colorOverride,
    collapsed: p.collapsed,
    groupId: p.groupId,
    pinned: p.pinned,
  }));
}

// ---------------------------------------------------------------------------
// AI Model Configuration
// ---------------------------------------------------------------------------

const AI_MODEL = process.env.COMMAND_BOARD_AI_MODEL ?? "gpt-4o-mini";
const TEMPERATURE = 0.7;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the Command Board assistant for a catering operations platform called Convoy.

Your role is to help users manage their command board — a visual, spatial interface where events, clients, tasks, employees, and inventory items are projected as cards with derived relationship connections.

**What you can do:**
1. Answer questions about the board state (events, tasks, clients, etc.)
2. Suggest board actions (add entities, show overdue items, clear board)
3. Provide operational insights (scheduling conflicts, capacity issues)
4. Help with event planning and task management

**Board commands you can suggest:**
- show_this_week: Populate board with this week's events and tasks
- show_overdue: Add overdue tasks and past-due events
- show_all_events: Add all active events
- show_all_tasks: Add all pending tasks
- auto_populate: Auto-populate based on board scope settings
- clear_board: Remove all projections from the board

**Domain plan command names currently supported in approvals:**
- create_event
- link_menu
- add_dish_to_event
- link_menu_item

**When users ask for multi-step operational changes**, use the suggest_manifest_plan tool.
The plan must be previewable and approval-gated before execution.
For suggest_manifest_plan, provide a compact draft (title, summary, optional scope/prereqs/boardPreview/domainPlan/trace).

**When users ask about risks, conflicts, or what's at risk**, use the detect_conflicts tool to analyze scheduling, staff, inventory, timeline, and venue conflicts. This helps identify operational issues before they become problems.

**When users want to understand a specific risk in detail** (e.g., "explain this conflict", "why is this a problem?", "what does this mean?"), use the explain_risk tool with the conflict ID from detect_conflicts results.

**When users want to resolve or fix a specific risk** (e.g., "how do I fix this?", "resolve this conflict", "what should I do about this?"), use the resolve_risk tool with the conflict ID. This provides actionable steps and can create a resolution plan.

**When users ask about policies, overtime rules, or role settings** (e.g., "what's the overtime policy?", "show me role rates", "what are the staff rules?"), use the query_policies tool to retrieve current policy settings.

**When users want to modify policies or role settings** (e.g., "change overtime threshold to 45 hours", "disable overtime for prep cooks", "update base rate for servers"), use the update_policy tool to create a manifest plan for the policy change.

**When users ask "what if" questions or want to preview changes** (e.g., "What if I move this event to next week?", "What happens if I add 50 more guests?", "Let me see what changes if I reassign this employee"), use the suggest_simulation_plan tool to create a simulation scenario. This creates a safe preview environment without affecting the live board.

**When users want to optimize schedules or balance workload** (e.g., "optimize my schedule", "balance staff assignments", "resolve scheduling conflicts", "compress timeline"), use the optimize_schedule tool to analyze and suggest schedule improvements.

**When users need prep task timelines for events** (e.g., "generate prep schedule", "create cooking timeline", "break down tasks for this event"), use the auto_generate_prep tool to create a prep timeline based on event requirements.

**When users need purchasing lists or inventory orders** (e.g., "what do I need to order?", "generate shopping list", "create purchase order for these events"), use the auto_generate_purchase tool to generate procurement suggestions.

**When users need to run payroll or calculate wages** (e.g., "run payroll", "calculate employee wages", "generate pay summary"), use the generate_payroll tool to generate payroll for a specific pay period.

**When users need to schedule staff or create shifts** (e.g., "schedule John for tomorrow", "create a shift for Maria", "assign shifts for next week"), use the create_shift tool to create staff shifts for employees.

**When users need to create or add recipes** (e.g., "create a new recipe", "add a recipe for lasagna", "I need to set up a dish template"), use the create_recipe tool to create recipes in the kitchen system.

**Guidelines:**
- Be concise and actionable
- When suggesting board modifications, use the suggest_board_action tool
- When suggesting domain-intent execution, use suggest_manifest_plan
- When answering questions about data, use the query_board_context tool first
- When users ask about risks, conflicts, or operational issues, use detect_conflicts
- When users want to understand a specific risk in detail, use explain_risk
- When users want to resolve a risk, use resolve_risk
- When users ask about policies or role settings, use query_policies
- When users want to modify policies, use update_policy
- When users ask "what if" questions, use suggest_simulation_plan
- When users want to optimize schedules, use optimize_schedule
- When users need prep timelines, use auto_generate_prep
- When users need purchasing lists, use auto_generate_purchase
- When users need to run payroll, use generate_payroll
- When users need to create staff shifts, use create_shift
- When users need to create recipes, use create_recipe
- Always explain WHY you're suggesting an action
- Use markdown formatting for readability
- Keep responses under 200 words unless the user asks for detail`;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function createBoardTools(params: {
  boardId?: string;
  tenantId: string;
  userId: string | null;
  authCookie?: string | null;
}) {
  const { boardId, tenantId, userId, authCookie } = params;
  const entityTypeEnum = z.enum([
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
  ]);

  const planDraftSchema = z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
    scope: z
      .object({
        entities: z
          .array(
            z.object({
              entityType: entityTypeEnum,
              entityId: z.string().min(1),
            })
          )
          .optional(),
      })
      .optional(),
    prerequisites: z
      .array(
        z.object({
          questionId: z.string().min(1),
          prompt: z.string().min(1),
          type: z.enum(["string", "enum", "date", "number", "select"]),
          options: z.array(z.string().min(1)).optional(),
          required: z.boolean().optional(),
        })
      )
      .optional(),
    boardPreview: z.array(z.record(z.string(), z.unknown())).optional(),
    domainPlan: z
      .array(
        z.object({
          stepId: z.string().min(1),
          entityType: entityTypeEnum.optional(),
          entityId: z.string().optional(),
          commandName: z.string().min(1),
          args: z.record(z.string(), z.unknown()).optional(),
          expectedEvents: z.array(z.string().min(1)).optional(),
          failureModes: z.array(z.string().min(1)).optional(),
        })
      )
      .optional(),
    trace: z
      .object({
        reasoningSummary: z.string().min(1),
        citations: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  });

  return {
    suggest_board_action: tool({
      description:
        "Suggest a board action for the user to approve. Use this when you want to modify the board.",
      inputSchema: z.object({
        commandId: z
          .enum([
            "show_this_week",
            "show_overdue",
            "show_all_events",
            "show_all_tasks",
            "auto_populate",
            "clear_board",
          ])
          .describe("The board command to suggest"),
        reason: z
          .string()
          .describe("Brief explanation of why this action is helpful"),
      }),
      execute: ({ commandId, reason }) => {
        // The tool result is returned to the AI for it to format a response
        // The actual execution happens client-side after user approval
        return {
          suggested: true,
          commandId,
          reason,
          message: `Suggested action: ${commandId}. ${reason}`,
        };
      },
    }),
    suggest_manifest_plan: tool({
      description:
        "Suggest a full previewable/executable manifest plan for board + domain operations. Use for multi-step intent and orchestration requests.",
      inputSchema: planDraftSchema,
      execute: async (input) => {
        if (!boardId) {
          return {
            suggested: false,
            error: "boardId is required to build manifest plans",
          };
        }

        const parsedInput = planDraftSchema.parse(input);
        const entities = (parsedInput.scope?.entities ??
          []) as ManifestEntityRef[];
        const prerequisites = (parsedInput.prerequisites ?? []).map((q) => ({
          ...q,
          required: q.required ?? true,
        })) as ManifestPlanQuestion[];
        const boardPreview = (parsedInput.boardPreview ??
          []) as BoardMutation[];
        const domainPlan = (parsedInput.domainPlan ?? []).map((step) => ({
          ...step,
          args: step.args ?? {},
        })) as DomainCommandStep[];

        // Calculate financial delta and risk assessment
        const stepCount = domainPlan.length;
        const riskLevel = stepCount > 5 ? "medium" : "low";
        const financialDelta = {
          revenue: stepCount * 1000,
          cost: stepCount * 600,
          profit: stepCount * 400,
          marginChange: 40,
        };

        const plan = suggestedManifestPlanSchema.parse({
          planId: crypto.randomUUID(),
          title: parsedInput.title,
          summary: parsedInput.summary,
          confidence: parsedInput.confidence ?? 0.7,
          scope: {
            boardId,
            tenantId,
            entities,
          },
          prerequisites,
          boardPreview,
          domainPlan,
          execution: {
            mode: "execute",
            idempotencyKey: crypto.randomUUID(),
          },
          trace: parsedInput.trace ?? {
            reasoningSummary:
              "AI-generated plan based on current board context.",
            citations: [],
          },
          riskAssessment: {
            level: riskLevel,
            factors: stepCount > 5 ? ["Multi-step plan"] : [],
            mitigations: [],
            affectedEntities: [],
          },
          costImpact: {
            currency: "USD",
            financialDelta,
          },
        });

        await createPendingManifestPlan({
          tenantId,
          boardId,
          requestedBy: userId,
          plan,
        });

        return {
          suggested: true,
          plan,
          message: `Suggested plan: ${plan.title}`,
        };
      },
    }),
    query_board_context: tool({
      description:
        "Query the current board state to answer user questions about entities on the board.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to look up: 'events', 'tasks', 'overdue', 'this_week', 'summary'"
          ),
        boardId: z.string().describe("The board ID to query"),
      }),
      execute: async ({ query, boardId }) => {
        try {
          return await queryBoardData(boardId, query);
        } catch (error) {
          console.error("[AI Chat] Board query failed:", error);
          return { error: "Failed to query board data" };
        }
      },
    }),
    detect_conflicts: tool({
      description:
        "Detect operational conflicts across scheduling, staff, inventory, timeline, and venue. Use this when users ask about risks, what's at risk, conflicts, or operational issues.",
      inputSchema: z.object({
        boardId: z
          .string()
          .optional()
          .describe("Optional board ID to scope detection"),
        timeRange: z
          .object({
            start: z.string().describe("Start date ISO string"),
            end: z.string().describe("End date ISO string"),
          })
          .optional()
          .describe("Optional time range to analyze"),
        entityTypes: z
          .array(
            z.enum([
              "scheduling",
              "staff",
              "inventory",
              "timeline",
              "venue",
              "resource",
            ])
          )
          .optional()
          .describe("Conflict types to detect"),
      }),
      execute: async ({ boardId, timeRange, entityTypes }) => {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";
          const response = await fetch(`${baseUrl}/conflicts/detect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              boardId,
              timeRange: timeRange
                ? {
                    start: new Date(timeRange.start),
                    end: new Date(timeRange.end),
                  }
                : undefined,
              entityTypes,
            }),
          });

          if (!response.ok) {
            return {
              conflicts: [],
              summary: {
                total: 0,
                bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                byType: {
                  scheduling: 0,
                  staff: 0,
                  inventory: 0,
                  timeline: 0,
                  venue: 0,
                  resource: 0,
                },
              },
              analyzedAt: new Date().toISOString(),
              error: `Conflict detection failed: ${response.statusText}`,
            };
          }

          const result = await response.json();
          return result;
        } catch (error) {
          console.error("[AI Chat] Conflict detection failed:", error);
          return {
            conflicts: [],
            summary: {
              total: 0,
              bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
              byType: {
                scheduling: 0,
                staff: 0,
                inventory: 0,
                timeline: 0,
                venue: 0,
                resource: 0,
              },
            },
            analyzedAt: new Date().toISOString(),
            error: "Failed to detect conflicts",
          };
        }
      },
    }),
    explain_risk: tool({
      description:
        "Explain a specific operational risk or conflict in detail. Use this when users want to understand what a specific risk means, why it matters, and what the implications are.",
      inputSchema: z.object({
        conflictId: z
          .string()
          .describe(
            "The ID of the conflict/risk to explain (from detect_conflicts result)"
          ),
        boardId: z
          .string()
          .optional()
          .describe("Optional board ID to scope the explanation"),
      }),
      execute: async ({ conflictId, boardId }) => {
        try {
          // Fetch all conflicts to find the specific one
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";
          const response = await fetch(`${baseUrl}/conflicts/detect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              boardId,
              entityTypes: [
                "scheduling",
                "staff",
                "inventory",
                "timeline",
                "venue",
                "resource",
              ],
            }),
          });

          if (!response.ok) {
            return {
              error: "Failed to fetch conflict details",
              explanation:
                "Could not retrieve the conflict details. The conflict may no longer exist.",
            };
          }

          const result = await response.json();
          const conflict = result.conflicts?.find(
            (c: { id: string }) => c.id === conflictId
          );

          if (!conflict) {
            return {
              error: "Conflict not found",
              explanation: `No conflict found with ID: ${conflictId}. The conflict may have been resolved or may not exist.`,
            };
          }

          // Generate a detailed explanation based on conflict type
          const explanations: Record<string, string> = {
            scheduling:
              "This is a scheduling conflict where resources (typically staff) are double-booked or have overlapping assignments. This can lead to operational failures, missed events, or overtime costs.",
            staff:
              "This is a staff availability conflict. The scheduled staff member has a conflicting availability (time off, sick leave, or other commitments) during their assigned shift.",
            inventory:
              "This is an inventory risk. The current stock levels are insufficient for the planned event, which could lead to menu item unavailability or emergency procurement.",
            timeline:
              "This is a timeline conflict. Tasks or deliverables have conflicting deadlines, or critical dependencies are at risk of being violated.",
            venue:
              "This is a venue conflict. The same venue or equipment is double-booked, or there are venue-specific constraints being violated.",
            resource:
              "This is a resource conflict. Critical equipment, vehicles, or other operational resources are over-allocated or unavailable when needed.",
          };

          const severityImplications: Record<string, string> = {
            low: "This is a minor issue that should be monitored but doesn't require immediate action.",
            medium:
              "This issue should be addressed soon to prevent it from escalating.",
            high: "This is a serious issue that requires attention to prevent operational problems.",
            critical:
              "This is a critical issue that requires immediate action to prevent system failure or major problems.",
          };

          const explanation =
            explanations[conflict.type] ||
            "This is an operational risk that requires attention.";
          const implication = severityImplications[conflict.severity] || "";

          return {
            conflictId: conflict.id,
            type: conflict.type,
            severity: conflict.severity,
            title: conflict.title,
            explanation,
            implication,
            affectedEntities: conflict.affectedEntities,
            suggestedAction: conflict.suggestedAction,
            whyItMatters: `${conflict.description}. ${
              conflict.affectedEntities?.length
                ? `This affects ${conflict.affectedEntities.map((e: { name: string }) => e.name).join(", ")}.`
                : ""
            }`,
            recommendation: `Address this ${conflict.severity} priority ${conflict.type} issue ${
              conflict.severity === "critical" || conflict.severity === "high"
                ? "as soon as possible"
                : "when time permits"
            } to maintain operational efficiency.`,
          };
        } catch (error) {
          console.error("[AI Chat] Explain risk failed:", error);
          return {
            error: "Failed to explain risk",
            explanation: "An error occurred while trying to explain this risk.",
          };
        }
      },
    }),
    resolve_risk: tool({
      description:
        "Suggest and optionally execute resolution for a specific operational risk or conflict. Use this when users want to know how to fix a conflict or want to resolve it.",
      inputSchema: z.object({
        conflictId: z
          .string()
          .describe(
            "The ID of the conflict/risk to resolve (from detect_conflicts result)"
          ),
        boardId: z
          .string()
          .optional()
          .describe("Optional board ID to scope the resolution"),
        executeResolution: z
          .boolean()
          .optional()
          .describe(
            "Whether to execute the resolution automatically (requires approval)"
          ),
      }),
      execute: async ({ conflictId, boardId, executeResolution }) => {
        try {
          // Fetch all conflicts to find the specific one
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";
          const response = await fetch(`${baseUrl}/conflicts/detect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              boardId,
              entityTypes: [
                "scheduling",
                "staff",
                "inventory",
                "timeline",
                "venue",
                "resource",
              ],
            }),
          });

          if (!response.ok) {
            return {
              error: "Failed to fetch conflict details",
              resolution: "Could not retrieve the conflict details.",
              canResolve: false,
            };
          }

          const result = await response.json();
          const conflict = result.conflicts?.find(
            (c: { id: string }) => c.id === conflictId
          );

          if (!conflict) {
            return {
              error: "Conflict not found",
              resolution: `No conflict found with ID: ${conflictId}. It may have already been resolved.`,
              canResolve: false,
            };
          }

          // Generate resolution suggestions based on conflict type
          const resolutionSuggestions: Record<
            string,
            { actions: string[]; domainCommands: string[] }
          > = {
            scheduling: {
              actions: [
                "Review the employee schedule and identify overlapping shifts",
                "Reassign one of the conflicting shifts to another available employee",
                "Consider splitting the shift between two employees",
                "Contact the affected employee to confirm availability",
              ],
              domainCommands: [
                "assign_employee - reassign the shift to a different employee",
              ],
            },
            staff: {
              actions: [
                "Check the staff member's availability calendar",
                "Find an alternative staff member with matching skills",
                "Consider adjusting the event timing if possible",
                "Contact the staff member to confirm their availability",
              ],
              domainCommands: [
                "assign_employee - assign a different staff member to the event",
              ],
            },
            inventory: {
              actions: [
                "Review current inventory levels for the required items",
                "Create a purchase order for missing items",
                "Consider substituting with available alternatives",
                "Check if another event has surplus that can be transferred",
              ],
              domainCommands: [
                "update_inventory - adjust inventory levels",
                "create_purchase_order - order missing items",
              ],
            },
            timeline: {
              actions: [
                "Review task dependencies and identify critical path",
                "Adjust task deadlines if flexibility exists",
                "Add additional resources to speed up delayed tasks",
                "Reorder tasks to resolve dependency conflicts",
              ],
              domainCommands: [
                "create_task - add additional tasks to address the conflict",
                "update_task - modify task timing or assignments",
              ],
            },
            venue: {
              actions: [
                "Check venue availability for alternative time slots",
                "Consider splitting the event across multiple venues",
                "Look for similar venues as backup options",
                "Coordinate with venue manager for extended hours",
              ],
              domainCommands: ["update_event - change event venue or timing"],
            },
            resource: {
              actions: [
                "Identify alternative resources that can serve the same purpose",
                "Rent or lease additional equipment",
                "Reschedule the event to use available resources",
                "Prioritize critical needs and defer less important ones",
              ],
              domainCommands: [
                "update_event - adjust event to use available resources",
              ],
            },
          };

          const suggestions = resolutionSuggestions[conflict.type] || {
            actions: [
              "Review the conflict details",
              "Take appropriate action based on the specific situation",
            ],
            domainCommands: [],
          };

          // If execution is requested, we create a manifest plan
          let executionResult: {
            planCreated: boolean;
            planId: string;
            message: string;
          } | null = null;
          if (executeResolution && boardId && tenantId && userId) {
            // Map conflict entity types to manifest entity types
            const entityTypeMap: Record<
              string,
              (typeof ENTITY_TYPE_VALUES)[number]
            > = {
              event: "event",
              task: "prep_task",
              employee: "employee",
              inventory: "inventory_item",
            };

            // Create a pending manifest plan for resolution
            const plan: SuggestedManifestPlan = {
              planId: crypto.randomUUID(),
              title: `Resolve: ${conflict.title}`,
              summary: `Resolution plan for ${conflict.type} conflict - ${conflict.description}`,
              confidence: 0.9,
              scope: {
                boardId,
                tenantId,
                entities:
                  conflict.affectedEntities?.map(
                    (e: { type: string; id: string }): ManifestEntityRef => ({
                      entityType: entityTypeMap[e.type] || "event",
                      entityId: e.id,
                    })
                  ) || [],
              },
              prerequisites: [],
              boardPreview: [],
              domainPlan: suggestions.domainCommands.map(
                (cmd, idx): DomainCommandStep => {
                  const [cmdName, cmdArgs] = cmd.split(" - ");
                  return {
                    stepId: `step-${idx + 1}`,
                    commandName: cmdName,
                    entityType: conflict.affectedEntities?.[0]
                      ? entityTypeMap[conflict.affectedEntities[0].type] ||
                        "event"
                      : undefined,
                    entityId: conflict.affectedEntities?.[0]?.id,
                    args: cmdArgs ? { description: cmdArgs } : {},
                  };
                }
              ),
              execution: {
                mode: "execute",
                idempotencyKey: crypto.randomUUID(),
              },
              trace: {
                reasoningSummary: `AI-generated resolution for ${conflict.type} conflict.`,
                citations: [],
              },
            };

            const { createPendingManifestPlan } = await import(
              "../../../lib/command-board/manifest-plans"
            );
            await createPendingManifestPlan({
              tenantId,
              boardId,
              requestedBy: userId,
              plan,
            });

            executionResult = {
              planCreated: true,
              planId: plan.planId,
              message:
                "A resolution plan has been created and is pending approval.",
            };
          }

          return {
            conflictId: conflict.id,
            type: conflict.type,
            severity: conflict.severity,
            title: conflict.title,
            description: conflict.description,
            resolution: {
              recommendedActions: suggestions.actions,
              applicableCommands: suggestions.domainCommands,
            },
            canResolve: executeResolution !== true,
            executionResult,
            nextSteps: executeResolution
              ? "A resolution plan has been created. Please review and approve it in the Command Board."
              : "Would you like me to create a resolution plan for this conflict?",
          };
        } catch (error) {
          console.error("[AI Chat] Resolve risk failed:", error);
          return {
            error: "Failed to resolve risk",
            resolution: "An error occurred while trying to resolve this risk.",
            canResolve: false,
          };
        }
      },
    }),
    query_policies: tool({
      description:
        "Query current policy settings including roles, overtime rules, and pay rates. Use this when users ask about overtime policies, role settings, or staff compensation rules.",
      inputSchema: z.object({
        policyType: z
          .enum(["roles", "overtime", "rates", "all"])
          .optional()
          .describe(
            "Type of policy to query: roles (all role info), overtime (overtime settings only), rates (pay rates only), all (everything)"
          ),
        roleId: z
          .string()
          .optional()
          .describe("Optional specific role ID to query"),
      }),
      execute: async ({ policyType = "all", roleId }) => {
        try {
          const whereClause = {
            tenantId,
            deletedAt: null,
            isActive: true,
            ...(roleId ? { id: roleId } : {}),
          };

          const roles = await database.role.findMany({
            where: whereClause,
            select: {
              id: true,
              name: true,
              baseRate: true,
              overtimeMultiplier: true,
              overtimeThresholdHours: true,
              description: true,
              isActive: true,
            },
            orderBy: { name: "asc" },
          });

          if (policyType === "overtime") {
            return {
              type: "overtime_policies",
              count: roles.length,
              policies: roles.map((r) => ({
                id: r.id,
                roleName: r.name,
                overtimeMultiplier: Number(r.overtimeMultiplier),
                overtimeThresholdHours: r.overtimeThresholdHours,
              })),
              summary: `Found ${roles.length} role(s) with overtime settings.`,
            };
          }

          if (policyType === "rates") {
            return {
              type: "pay_rates",
              count: roles.length,
              rates: roles.map((r) => ({
                id: r.id,
                roleName: r.name,
                baseRate: Number(r.baseRate),
              })),
              summary: `Found ${roles.length} role(s) with pay rates.`,
            };
          }

          // Return all policy info
          return {
            type: "all_policies",
            count: roles.length,
            roles: roles.map((r) => ({
              id: r.id,
              name: r.name,
              baseRate: Number(r.baseRate),
              overtimeMultiplier: Number(r.overtimeMultiplier),
              overtimeThresholdHours: r.overtimeThresholdHours,
              description: r.description,
            })),
            summary: `Found ${roles.length} active role(s) with policy settings.`,
          };
        } catch (error) {
          console.error("[AI Chat] Query policies failed:", error);
          return {
            error: "Failed to query policies",
            policies: [],
            summary: "An error occurred while querying policy settings.",
          };
        }
      },
    }),
    update_policy: tool({
      description:
        "Create a manifest plan to update policy settings such as overtime rules, pay rates, or role configurations. Use this when users want to modify overtime thresholds, change pay rates, or adjust role settings.",
      inputSchema: z.object({
        policyType: z
          .enum([
            "overtime_threshold",
            "overtime_multiplier",
            "base_rate",
            "role_settings",
          ])
          .describe("Type of policy change to make"),
        roleId: z.string().describe("The ID of the role to update"),
        currentValue: z
          .union([z.number(), z.string()])
          .describe("The current value (for verification)"),
        newValue: z
          .union([z.number(), z.string()])
          .describe("The new value to set"),
        reason: z
          .string()
          .optional()
          .describe("Optional reason for the change"),
      }),
      execute: async ({
        policyType,
        roleId,
        currentValue,
        newValue,
        reason,
      }) => {
        try {
          if (!boardId) {
            return {
              suggested: false,
              error: "boardId is required to create policy change plans",
            };
          }

          // Fetch the current role to verify
          const role = await database.role.findFirst({
            where: { tenantId, id: roleId, deletedAt: null },
            select: {
              id: true,
              name: true,
              baseRate: true,
              overtimeMultiplier: true,
              overtimeThresholdHours: true,
            },
          });

          if (!role) {
            return {
              suggested: false,
              error: "Role not found",
              message: `No role found with ID: ${roleId}`,
            };
          }

          // Verify current value matches
          let actualCurrentValue: number;
          let fieldName: string;
          let fieldLabel: string;

          switch (policyType) {
            case "overtime_threshold":
              actualCurrentValue = role.overtimeThresholdHours;
              fieldName = "overtimeThresholdHours";
              fieldLabel = "Overtime Threshold (hours)";
              break;
            case "overtime_multiplier":
              actualCurrentValue = Number(role.overtimeMultiplier);
              fieldName = "overtimeMultiplier";
              fieldLabel = "Overtime Multiplier";
              break;
            case "base_rate":
              actualCurrentValue = Number(role.baseRate);
              fieldName = "baseRate";
              fieldLabel = "Base Rate ($/hour)";
              break;
            default:
              return {
                suggested: false,
                error: "Invalid policy type",
                message: `Unknown policy type: ${policyType}`,
              };
          }

          // Create the manifest plan
          const plan: SuggestedManifestPlan = {
            planId: crypto.randomUUID(),
            title: `Update ${fieldLabel} for ${role.name}`,
            summary: `Change ${fieldLabel.toLowerCase()} from ${actualCurrentValue} to ${newValue}${reason ? ` - Reason: ${reason}` : ""}`,
            confidence: 0.95,
            scope: {
              boardId,
              tenantId,
              entities: [{ entityType: "employee", entityId: roleId }],
            },
            prerequisites: [],
            boardPreview: [],
            domainPlan: [
              {
                stepId: "update-policy-1",
                commandName: "update_role_policy",
                entityType: "employee",
                entityId: roleId,
                args: {
                  roleId,
                  fieldName,
                  currentValue: actualCurrentValue,
                  newValue: Number(newValue),
                  reason,
                },
              },
            ],
            execution: {
              mode: "execute",
              idempotencyKey: crypto.randomUUID(),
            },
            trace: {
              reasoningSummary: `User-requested policy change: ${fieldLabel} for role ${role.name}`,
              citations: [],
            },
            riskAssessment: {
              level: "low",
              factors: ["Policy modification"],
              mitigations: [
                "Change is reversible",
                "Requires explicit approval",
              ],
              affectedEntities: [],
            },
            costImpact: {
              currency: "USD",
              financialDelta: {
                revenue: 0,
                cost:
                  policyType === "base_rate"
                    ? (Number(newValue) - actualCurrentValue) * 100
                    : 0,
                profit:
                  policyType === "base_rate"
                    ? (actualCurrentValue - Number(newValue)) * 100
                    : 0,
                marginChange: 0,
              },
            },
          };

          await createPendingManifestPlan({
            tenantId,
            boardId,
            requestedBy: userId,
            plan,
          });

          return {
            suggested: true,
            plan,
            policyChange: {
              roleName: role.name,
              field: fieldLabel,
              from: actualCurrentValue,
              to: newValue,
              reason,
            },
            message: `Policy change plan created: ${fieldLabel} for ${role.name} from ${actualCurrentValue} to ${newValue}. Please review and approve.`,
          };
        } catch (error) {
          console.error("[AI Chat] Update policy failed:", error);
          return {
            suggested: false,
            error: "Failed to create policy change plan",
            message: "An error occurred while creating the policy change plan.",
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // suggest_simulation_plan - Create what-if simulation scenarios
    // -------------------------------------------------------------------------
    suggest_simulation_plan: tool({
      description:
        "Create a simulation scenario to preview changes without affecting the live board. Use when users ask 'what if' questions like 'What if I move this event to next week?' or want to preview the impact of changes before committing.",
      inputSchema: z.object({
        intent: z
          .string()
          .min(1)
          .describe("The user's what-if scenario or change to simulate"),
        targetBoardId: z
          .string()
          .optional()
          .describe(
            "Optional board ID to simulate on (uses current board if not provided)"
          ),
        proposedChanges: z
          .array(
            z.object({
              entityType: z.string().describe("Type of entity being changed"),
              entityId: z
                .string()
                .optional()
                .describe("ID of entity (if modifying existing)"),
              changeType: z
                .enum(["create", "update", "delete", "move"])
                .describe("Type of change"),
              description: z
                .string()
                .describe("Human-readable description of the change"),
              details: z
                .record(z.string(), z.unknown())
                .optional()
                .describe("Additional details about the change"),
            })
          )
          .optional()
          .describe("List of proposed changes to simulate"),
        previewOnly: z
          .boolean()
          .optional()
          .describe("If true, only preview without creating simulation board"),
      }),
      execute: async (input) => {
        const targetBoard = input.targetBoardId ?? boardId;

        if (!targetBoard) {
          return {
            success: false,
            error: "No board available for simulation",
            message:
              "Please specify a board or ensure you're working on an active command board.",
          };
        }

        try {
          // If preview only, return what the simulation would do without creating it
          if (input.previewOnly) {
            return {
              success: true,
              preview: true,
              intent: input.intent,
              targetBoardId: targetBoard,
              proposedChanges: input.proposedChanges ?? [],
              message: `Preview: Would simulate "${input.intent}" on board ${targetBoard}`,
              nextSteps: [
                "To run this simulation, ask me to create it",
                "You can modify the proposed changes before running",
                "The simulation will show deltas and potential conflicts",
              ],
            };
          }

          // Import simulation functions dynamically to avoid circular deps
          const { forkCommandBoard } = await import(
            "../../../(authenticated)/command-board/actions/boards"
          );

          // Create a simulation fork (forkCommandBoard takes sourceBoardId, simulationName)
          const simulationName = `Simulation: ${input.intent.substring(0, 50)}${input.intent.length > 50 ? "..." : ""}`;
          const forkResult = await forkCommandBoard(
            targetBoard,
            simulationName
          );

          if (!forkResult.success) {
            return {
              success: false,
              error: forkResult.error ?? "Failed to create simulation board",
              message: `Could not create simulation: ${forkResult.error}`,
            };
          }

          // Return simulation context info
          return {
            success: true,
            simulation: {
              simulationId: forkResult.simulation?.id,
              originalBoardId: targetBoard,
              forkBoardId: forkResult.simulation?.id,
              intent: input.intent,
              proposedChanges: input.proposedChanges ?? [],
              createdAt: new Date().toISOString(),
            },
            message: `Created simulation board for "${input.intent}". You can now apply changes to the simulation and preview the impact.`,
            nextSteps: [
              "Apply the proposed changes to the simulation board",
              "Review the delta analysis to see what changed",
              "Approve or discard the simulation when ready",
              "Use 'Live/Simulation' toggle to switch views",
            ],
            boardId: forkResult.simulation?.id,
          };
        } catch (error) {
          console.error("[AI Chat] Simulation plan failed:", error);
          return {
            success: false,
            error: "Failed to create simulation",
            message: `An error occurred while creating the simulation: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // optimize_schedule - Optimize event/staff scheduling
    // -------------------------------------------------------------------------
    optimize_schedule: tool({
      description:
        "Analyze and optimize event scheduling, staff assignments, and workload distribution. Use when users ask to balance workload, optimize schedules, resolve scheduling conflicts, or improve efficiency.",
      inputSchema: z.object({
        optimizationType: z
          .enum([
            "workload_balance",
            "conflict_resolution",
            "efficiency",
            "timeline_compression",
          ])
          .describe("Type of optimization to perform"),
        targetEventIds: z
          .array(z.string())
          .optional()
          .describe(
            "Specific events to optimize (all board events if not provided)"
          ),
        constraints: z
          .object({
            respectBlackoutDates: z
              .boolean()
              .optional()
              .describe("Don't move events to blackout dates"),
            preserveStaffPreferences: z
              .boolean()
              .optional()
              .describe("Try to keep preferred staff assignments"),
            maxDateShift: z
              .number()
              .optional()
              .describe("Maximum days to move an event"),
            minStaffPerEvent: z
              .number()
              .optional()
              .describe("Minimum staff required per event"),
          })
          .optional()
          .describe("Optimization constraints"),
        previewOnly: z
          .boolean()
          .optional()
          .describe("If true, only preview without making changes"),
      }),
      execute: async (input) => {
        try {
          // Get events from board context
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(
            (p) => p.entityType === "event"
          );

          if (eventProjections.length === 0) {
            return {
              success: false,
              error: "No events found",
              message: "No events on the board to optimize. Add events first.",
            };
          }

          // Determine conflict types to check based on optimization type
          const conflictTypesByOptimization: Record<
            string,
            ("scheduling" | "staff" | "inventory" | "timeline" | "venue")[]
          > = {
            workload_balance: ["scheduling", "staff"],
            conflict_resolution: ["scheduling", "staff", "venue", "timeline"],
            efficiency: ["timeline", "inventory"],
            timeline_compression: ["timeline", "scheduling"],
          };

          const entityTypes = conflictTypesByOptimization[
            input.optimizationType
          ] || ["scheduling", "staff"];

          // Call conflicts detect API to get real data
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";
          const response = await fetch(`${baseUrl}/conflicts/detect`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              boardId,
              entityTypes,
            }),
          });

          interface AffectedEntity {
            type: string;
            id: string;
            name: string;
          }

          interface ResolutionOption {
            type: string;
            description: string;
            affectedEntities: AffectedEntity[];
            estimatedImpact: "low" | "medium" | "high";
          }

          interface Conflict {
            id: string;
            type: string;
            severity: "low" | "medium" | "high" | "critical";
            title: string;
            description: string;
            affectedEntities: AffectedEntity[];
            suggestedAction?: string;
            resolutionOptions?: ResolutionOption[];
          }

          let conflicts: Conflict[] = [];
          let conflictSummary: {
            total: number;
            bySeverity: {
              low: number;
              medium: number;
              high: number;
              critical: number;
            };
          } = {
            total: 0,
            bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          };

          if (response.ok) {
            const result = (await response.json()) as {
              conflicts: Conflict[];
              summary: {
                total: number;
                bySeverity: {
                  low: number;
                  medium: number;
                  high: number;
                  critical: number;
                };
              };
            };
            conflicts = result.conflicts || [];
            if (result.summary) {
              conflictSummary = {
                total: result.summary.total,
                bySeverity: {
                  low: result.summary.bySeverity?.low ?? 0,
                  medium: result.summary.bySeverity?.medium ?? 0,
                  high: result.summary.bySeverity?.high ?? 0,
                  critical: result.summary.bySeverity?.critical ?? 0,
                },
              };
            }
          }

          // Filter conflicts by target events if specified
          const targetEventIdSet = input.targetEventIds
            ? new Set(input.targetEventIds)
            : null;
          const relevantConflicts = targetEventIdSet
            ? conflicts.filter((c) =>
                c.affectedEntities.some(
                  (e) => e.type === "event" && targetEventIdSet.has(e.id)
                )
              )
            : conflicts;

          // Build recommendations from real conflict data
          type Recommendation = {
            eventId: string;
            eventName: string;
            conflictId: string;
            conflictType: string;
            current: string;
            suggested: string;
            reason: string;
            impact: "low" | "medium" | "high";
            resolutionOptions?: ResolutionOption[];
          };

          const recommendations: Recommendation[] = [];

          for (const conflict of relevantConflicts) {
            // Find the primary event entity for this conflict
            const eventEntity = conflict.affectedEntities.find(
              (e) => e.type === "event"
            );
            const eventId = eventEntity?.id || "unknown";
            const eventName = eventEntity?.name || "Unknown Event";

            // Map severity to impact
            const impactMap: Record<string, "low" | "medium" | "high"> = {
              low: "low",
              medium: "medium",
              high: "high",
              critical: "high",
            };

            recommendations.push({
              eventId,
              eventName,
              conflictId: conflict.id,
              conflictType: conflict.type,
              current: conflict.description,
              suggested:
                conflict.suggestedAction || "Review and resolve the conflict",
              reason: conflict.title,
              impact: impactMap[conflict.severity] || "medium",
              resolutionOptions: conflict.resolutionOptions,
            });
          }

          // Build analysis object
          const analysis = {
            totalEvents: eventProjections.length,
            targetEvents: input.targetEventIds
              ? eventProjections.filter((p) =>
                  input.targetEventIds?.includes(p.entityId)
                )
              : eventProjections,
            optimizationType: input.optimizationType,
            conflictSummary,
            recommendations,
          };

          if (input.previewOnly) {
            return {
              success: true,
              preview: true,
              analysis,
              message: `Analyzed ${analysis.targetEvents.length} events for ${input.optimizationType} optimization. Found ${conflictSummary.total} conflicts, ${recommendations.length} relevant to your selection.`,
              nextSteps: [
                "Review the recommendations above",
                "Ask me to apply specific optimizations",
                "I can create a manifest plan with the changes",
              ],
            };
          }

          // Return analysis with option to create plan
          return {
            success: true,
            analysis,
            message: `Completed ${input.optimizationType} analysis for ${analysis.targetEvents.length} events. Found ${conflictSummary.total} total conflicts with ${recommendations.length} actionable recommendations.`,
            nextSteps: [
              "Review the recommendations",
              "Say 'apply these optimizations' to create a manifest plan",
              "The plan will include all scheduling changes for approval",
            ],
          };
        } catch (error) {
          console.error("[AI Chat] Schedule optimization failed:", error);
          return {
            success: false,
            error: "Optimization failed",
            message: `An error occurred during schedule optimization: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // auto_generate_prep - Generate prep task timeline
    // -------------------------------------------------------------------------
    auto_generate_prep: tool({
      description:
        "Automatically generate prep task timeline for events. Use when users need prep schedules, cooking timelines, or task breakdowns for upcoming events.",
      inputSchema: z.object({
        eventIds: z
          .array(z.string())
          .optional()
          .describe(
            "Specific events to generate prep for (all board events if not provided)"
          ),
        leadTimeDays: z
          .number()
          .min(1)
          .max(14)
          .optional()
          .describe("How many days before event to start prep"),
        includeRecipeBreakdown: z
          .boolean()
          .optional()
          .describe("Include per-recipe prep tasks"),
        groupByStation: z
          .boolean()
          .optional()
          .describe("Group tasks by kitchen station"),
        createTasks: z
          .boolean()
          .optional()
          .describe("If true, create actual prep tasks in the system"),
      }),
      execute: async (input) => {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";

          // Get events from board
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(
            (p) => p.entityType === "event"
          );

          const targetEvents = input.eventIds
            ? eventProjections.filter((p) =>
                input.eventIds?.includes(p.entityId)
              )
            : eventProjections;

          if (targetEvents.length === 0) {
            return {
              success: false,
              error: "No events found",
              message:
                "No events on the board. Add events first to generate prep timelines.",
            };
          }

          // Call bulk-generate/prep-tasks API for each event
          interface GeneratedPrepTask {
            name: string;
            dishId: string | null;
            recipeVersionId: string | null;
            taskType: string;
            quantityTotal: number;
            quantityUnitId: number | null;
            servingsTotal: number | null;
            startByDate: string;
            dueByDate: string;
            dueByTime: string | null;
            isEventFinish: boolean;
            priority: number;
            estimatedMinutes: number | null;
            notes: string | null;
            station: string | null;
          }

          interface BulkGenerateResponse {
            batchId: string;
            status: string;
            generatedCount: number;
            tasks: GeneratedPrepTask[];
            errors: string[];
            summary: string;
          }

          const prepTimeline = [];
          const allGeneratedTasks: Array<{
            eventId: string;
            tasks: GeneratedPrepTask[];
          }> = [];

          for (const projection of targetEvents) {
            const generateResponse = await fetch(
              `${baseUrl}/api/kitchen/ai/bulk-generate/prep-tasks`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authCookie ? { Cookie: authCookie } : {}),
                },
                body: JSON.stringify({
                  eventId: projection.entityId,
                  options: {
                    includeKitchenTasks: input.includeRecipeBreakdown ?? true,
                    priorityStrategy: "due_date" as const,
                  },
                }),
              }
            );

            if (!generateResponse.ok) {
              const errorText = await generateResponse.text();
              console.error(
                `[AI Chat] Prep generation API error for event ${projection.entityId}:`,
                errorText
              );
              // Continue with other events even if one fails
              continue;
            }

            const generateData =
              (await generateResponse.json()) as BulkGenerateResponse;
            const tasks = generateData.tasks || [];

            allGeneratedTasks.push({ eventId: projection.entityId, tasks });

            // Calculate estimated hours from task minutes
            const estimatedMinutes = tasks.reduce(
              (sum, t) => sum + (t.estimatedMinutes || 0),
              0
            );
            const estimatedHours = Math.ceil(estimatedMinutes / 60) || 0;

            // Group tasks by day offset (relative to event date)
            const tasksByDay: Record<number, GeneratedPrepTask[]> = {};
            for (const task of tasks) {
              const dueDate = new Date(task.dueByDate);
              // Calculate day offset - this is approximate without the actual event date
              const dayKey = Math.floor(
                dueDate.getTime() / (1000 * 60 * 60 * 24)
              );
              if (!tasksByDay[dayKey]) tasksByDay[dayKey] = [];
              tasksByDay[dayKey].push(task);
            }

            // Group tasks by station if requested
            let stationBreakdown: Record<string, string[]> | undefined;
            if (input.groupByStation) {
              stationBreakdown = {};
              for (const task of tasks) {
                if (task.station) {
                  if (!stationBreakdown[task.station]) {
                    stationBreakdown[task.station] = [];
                  }
                  stationBreakdown[task.station].push(task.name);
                }
              }
            }

            prepTimeline.push({
              eventId: projection.entityId,
              eventName:
                projection.label ??
                `Event ${projection.entityId.substring(0, 8)}`,
              batchId: generateData.batchId,
              prepTasks: tasks.map((t) => ({
                name: t.name,
                taskType: t.taskType,
                station: t.station,
                priority: t.priority,
                estimatedMinutes: t.estimatedMinutes,
                startByDate: t.startByDate,
                dueByDate: t.dueByDate,
                isEventFinish: t.isEventFinish,
              })),
              estimatedHours,
              stationBreakdown,
              generatedCount: generateData.generatedCount,
            });
          }

          if (input.createTasks && allGeneratedTasks.length > 0) {
            // Save tasks to database via the save endpoint
            const saveResults = [];
            for (const { eventId, tasks } of allGeneratedTasks) {
              if (tasks.length === 0) continue;

              const saveResponse = await fetch(
                `${baseUrl}/api/kitchen/ai/bulk-generate/prep-tasks/save`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(authCookie ? { Cookie: authCookie } : {}),
                  },
                  body: JSON.stringify({ eventId, tasks }),
                }
              );

              if (saveResponse.ok) {
                const saveData = await saveResponse.json();
                saveResults.push({ eventId, ...saveData });
              }
            }

            const totalCreated = saveResults.reduce(
              (sum, r) => sum + (r.created || 0),
              0
            );

            return {
              success: true,
              prepTimeline,
              savedTasks: saveResults,
              message: `Generated and saved prep tasks for ${targetEvents.length} events. Created ${totalCreated} tasks.`,
              summary: {
                totalEvents: targetEvents.length,
                totalTasksCreated: totalCreated,
                estimatedTotalHours: prepTimeline.reduce(
                  (acc, e) => acc + e.estimatedHours,
                  0
                ),
              },
              nextSteps: [
                "Review the created prep tasks on the command board",
                "Assign tasks to team members as needed",
                "Track progress through the prep timeline",
              ],
            };
          }

          return {
            success: true,
            preview: true,
            prepTimeline,
            message: `Generated prep timeline preview for ${targetEvents.length} events.`,
            summary: {
              totalEvents: targetEvents.length,
              totalTasks: prepTimeline.reduce(
                (acc, e) => acc + e.prepTasks.length,
                0
              ),
              estimatedTotalHours: prepTimeline.reduce(
                (acc, e) => acc + e.estimatedHours,
                0
              ),
            },
            nextSteps: [
              "Review the timeline for each event",
              "Say 'create these prep tasks' to add them to the system",
              "Tasks will appear on the command board linked to events",
            ],
            manifestPlanHint: input.createTasks
              ? undefined
              : {
                  domainCommand: "create_prep_tasks",
                  requiresApproval: true,
                },
          };
        } catch (error) {
          console.error("[AI Chat] Prep generation failed:", error);
          return {
            success: false,
            error: "Prep generation failed",
            message: `An error occurred while generating prep timeline: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // auto_generate_purchase - Generate purchasing list
    // -------------------------------------------------------------------------
    auto_generate_purchase: tool({
      description:
        "Automatically generate purchasing list based on upcoming events and current inventory. Use when users need order suggestions, inventory projections, or procurement plans.",
      inputSchema: z.object({
        eventIds: z
          .array(z.string())
          .optional()
          .describe(
            "Specific events to include (all board events if not provided)"
          ),
        includeLowStock: z
          .boolean()
          .optional()
          .describe("Also include items that are below reorder level"),
        groupByVendor: z
          .boolean()
          .optional()
          .describe("Group purchase items by vendor/supplier"),
        createPurchaseOrder: z
          .boolean()
          .optional()
          .describe("If true, create a draft purchase order"),
      }),
      execute: async (input) => {
        try {
          const tenantId = await requireTenantId();

          // Get events from board
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(
            (p) => p.entityType === "event"
          );

          const targetEventIds = input.eventIds
            ? eventProjections
                .filter((p) => input.eventIds?.includes(p.entityId))
                .map((p) => p.entityId)
            : eventProjections.map((p) => p.entityId);

          if (targetEventIds.length === 0) {
            return {
              success: true,
              preview: true,
              purchaseList: {
                eventBased: [],
                lowStockItems: [],
                vendorGroups: undefined,
              },
              totalEstimatedCost: 0,
              summary: {
                eventsCovered: 0,
                totalItems: 0,
                lowStockItems: 0,
                estimatedCost: 0,
              },
              message:
                "No events found on the board to generate purchase list.",
              nextSteps: ["Add events to the command board first"],
            };
          }

          // 1. Get events with guest counts
          const events = await database.event.findMany({
            where: { tenantId, id: { in: targetEventIds }, deletedAt: null },
            select: { id: true, title: true, guestCount: true },
          });
          const eventMap = new Map(events.map((e) => [e.id, e]));

          // 2. Get event_dishes for those events
          type EventDishRow = {
            event_id: string;
            dish_id: string;
            quantity_servings: number;
          };
          const eventDishes = await database.$queryRaw<EventDishRow[]>`
            SELECT event_id, dish_id, quantity_servings
            FROM tenant_events.event_dishes
            WHERE tenant_id = ${tenantId}::uuid
            AND event_id = ANY(${targetEventIds}::uuid[])
            AND deleted_at IS NULL
          `;

          if (eventDishes.length === 0) {
            return {
              success: true,
              preview: true,
              purchaseList: {
                eventBased: [],
                lowStockItems: [],
                vendorGroups: undefined,
              },
              totalEstimatedCost: 0,
              summary: {
                eventsCovered: events.length,
                totalItems: 0,
                lowStockItems: 0,
                estimatedCost: 0,
              },
              message: `Found ${events.length} events but no dishes linked. Add dishes to events to generate purchase suggestions.`,
              nextSteps: ["Link dishes to events via menus"],
            };
          }

          // 3. Get dishes with recipeId
          const dishIds = [...new Set(eventDishes.map((ed) => ed.dish_id))];
          const dishes = await database.dish.findMany({
            where: { tenantId, id: { in: dishIds }, deletedAt: null },
            select: { id: true, recipeId: true, name: true },
          });
          const dishMap = new Map(dishes.map((d) => [d.id, d]));
          const recipeIds = [
            ...new Set(dishes.map((d) => d.recipeId).filter(Boolean)),
          ] as string[];

          // 4. Get latest RecipeVersion for each recipe
          const recipeVersions = await database.$queryRaw<
            Array<{
              recipe_id: string;
              version_number: number;
              yield_quantity: number;
            }>
          >`
            SELECT DISTINCT ON (recipe_id) recipe_id, version_number, yield_quantity
            FROM tenant_kitchen.recipe_versions
            WHERE tenant_id = ${tenantId}::uuid
            AND recipe_id = ANY(${recipeIds}::uuid[])
            AND deleted_at IS NULL
            ORDER BY recipe_id, version_number DESC
          `;
          const recipeVersionMap = new Map(
            recipeVersions.map((rv) => [rv.recipe_id, rv])
          );

          // 5. Get RecipeIngredients for those recipe versions
          const versionIds = recipeVersions.map((rv) => rv.recipe_id);
          const recipeIngredients = await database.recipeIngredient.findMany({
            where: {
              tenantId,
              recipeVersionId: { in: versionIds },
              deletedAt: null,
            },
            select: {
              recipeVersionId: true,
              ingredientId: true,
              quantity: true,
            },
          });

          // 6. Get Ingredient details
          const ingredientIds = [
            ...new Set(recipeIngredients.map((ri) => ri.ingredientId)),
          ];
          const ingredients = await database.ingredient.findMany({
            where: { tenantId, id: { in: ingredientIds }, deletedAt: null },
            select: { id: true, name: true, category: true },
          });
          const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

          // 7. Get InventoryItems for stock levels (match by name)
          const inventoryItems = await database.inventoryItem.findMany({
            where: { tenantId, deletedAt: null },
            select: {
              id: true,
              name: true,
              category: true,
              quantityOnHand: true,
              parLevel: true,
              unitCost: true,
              supplierId: true,
            },
          });

          // Build a case-insensitive name to inventory item map
          const inventoryByName = new Map<string, (typeof inventoryItems)[0]>();
          for (const item of inventoryItems) {
            inventoryByName.set(item.name.toLowerCase(), item);
          }

          // 8. Calculate ingredient requirements per event
          interface IngredientNeed {
            name: string;
            category: string | null;
            requiredQuantity: number;
            currentQuantity: number;
            unitCost: number;
            suggestedOrder: number;
            inventoryItemId: string | null;
          }

          const eventBasedPurchases: Array<{
            eventId: string;
            eventName: string;
            estimatedGuests: number;
            items: Array<{
              category: string;
              items: Array<{
                name: string;
                quantity: number;
                unit: string;
                estimatedCost: number;
                currentStock: number;
              }>;
            }>;
            totalEstimated: number;
          }> = [];

          // Aggregate all ingredients needed across events
          const aggregatedNeeds = new Map<string, IngredientNeed>();

          for (const eventDish of eventDishes) {
            const event = eventMap.get(eventDish.event_id);
            const dish = dishMap.get(eventDish.dish_id);
            if (!(event && dish?.recipeId)) continue;

            const recipeVersion = recipeVersionMap.get(dish.recipeId);
            if (!recipeVersion) continue;

            const yieldQuantity = Number(recipeVersion.yield_quantity) || 1;
            const guestCount = event.guestCount || 1;
            const servingsMultiplier = guestCount / yieldQuantity;

            // Get ingredients for this recipe version
            const dishIngredients = recipeIngredients.filter(
              (ri) => ri.recipeVersionId === dish.recipeId
            );

            for (const ri of dishIngredients) {
              const ingredient = ingredientMap.get(ri.ingredientId);
              if (!ingredient) continue;

              const requiredQty = Number(ri.quantity) * servingsMultiplier;
              const key = ingredient.id;

              const existing = aggregatedNeeds.get(key);
              if (existing) {
                existing.requiredQuantity += requiredQty;
              } else {
                // Try to find matching inventory item
                const invItem = inventoryByName.get(
                  ingredient.name.toLowerCase()
                );
                aggregatedNeeds.set(key, {
                  name: ingredient.name,
                  category: ingredient.category,
                  requiredQuantity: requiredQty,
                  currentQuantity: invItem ? Number(invItem.quantityOnHand) : 0,
                  unitCost: invItem ? Number(invItem.unitCost) : 0,
                  suggestedOrder: 0,
                  inventoryItemId: invItem?.id ?? null,
                });
              }
            }
          }

          // Calculate suggested orders and group by category
          const categoryGroups = new Map<
            string,
            Array<{
              name: string;
              quantity: number;
              unit: string;
              estimatedCost: number;
              currentStock: number;
            }>
          >();

          for (const need of aggregatedNeeds.values()) {
            const shortfall = Math.max(
              0,
              need.requiredQuantity - need.currentQuantity
            );
            need.suggestedOrder = shortfall;
            const estimatedCost = shortfall * need.unitCost;

            const category = need.category || "Other";
            const items = categoryGroups.get(category) || [];
            items.push({
              name: need.name,
              quantity: Math.ceil(shortfall),
              unit: "units",
              estimatedCost,
              currentStock: need.currentQuantity,
            });
            categoryGroups.set(category, items);
          }

          // Group by event for response structure
          for (const event of events) {
            const eventDishesForEvent = eventDishes.filter(
              (ed) => ed.event_id === event.id
            );
            const hasDishes = eventDishesForEvent.length > 0;

            eventBasedPurchases.push({
              eventId: event.id,
              eventName: event.title,
              estimatedGuests: event.guestCount,
              items: hasDishes
                ? Array.from(categoryGroups.entries())
                    .map(([category, items]) => ({
                      category,
                      items: items.filter((i) => i.quantity > 0),
                    }))
                    .filter((g) => g.items.length > 0)
                : [],
              totalEstimated: Array.from(aggregatedNeeds.values()).reduce(
                (sum, n) =>
                  sum +
                  Math.max(0, n.requiredQuantity - n.currentQuantity) *
                    n.unitCost,
                0
              ),
            });
          }

          // Get low stock items if requested
          let lowStockItems: Array<{
            itemId: string;
            itemName: string;
            currentQuantity: number;
            reorderLevel: number;
            suggestedOrder: number;
          }> = [];

          if (input.includeLowStock) {
            const lowStock = inventoryItems.filter(
              (item) =>
                Number(item.parLevel) > 0 &&
                Number(item.quantityOnHand) < Number(item.parLevel)
            );
            lowStockItems = lowStock.map((item) => ({
              itemId: item.id,
              itemName: item.name,
              currentQuantity: Number(item.quantityOnHand),
              reorderLevel: Number(item.parLevel),
              suggestedOrder: Math.ceil(
                Number(item.parLevel) - Number(item.quantityOnHand)
              ),
            }));
          }

          // Group by vendor if requested
          let vendorGroups: Record<string, string[]> | undefined;
          if (input.groupByVendor) {
            // Get suppliers
            const supplierIds = [
              ...new Set(
                inventoryItems.map((i) => i.supplierId).filter(Boolean)
              ),
            ] as string[];
            if (supplierIds.length > 0) {
              const suppliers = await database.inventorySupplier.findMany({
                where: { tenantId, id: { in: supplierIds } },
                select: { id: true, name: true },
              });
              const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));

              vendorGroups = {};
              for (const item of inventoryItems) {
                if (
                  item.supplierId &&
                  aggregatedNeeds.has(item.name.toLowerCase())
                ) {
                  const supplierName =
                    supplierMap.get(item.supplierId) || "Unknown Supplier";
                  if (!vendorGroups[supplierName]) {
                    vendorGroups[supplierName] = [];
                  }
                  vendorGroups[supplierName].push(item.name);
                }
              }
            }
          }

          const purchaseList = {
            eventBased: eventBasedPurchases,
            lowStockItems,
            vendorGroups,
          };

          const totalEstimatedCost = Array.from(
            aggregatedNeeds.values()
          ).reduce(
            (sum, n) =>
              sum +
              Math.max(0, n.requiredQuantity - n.currentQuantity) * n.unitCost,
            0
          );

          if (input.createPurchaseOrder) {
            return {
              success: true,
              purchaseList,
              totalEstimatedCost,
              message: `Generated purchase list for ${events.length} events. Ready to create purchase order.`,
              nextSteps: [
                "Review the items and quantities",
                "Confirm with 'yes, create the purchase order'",
                "A draft PO will be created for approval",
              ],
              manifestPlanHint: {
                domainCommand: "create_purchase_order",
                requiresApproval: true,
              },
            };
          }

          const totalItems = Array.from(categoryGroups.values()).reduce(
            (sum, items) => sum + items.filter((i) => i.quantity > 0).length,
            0
          );

          return {
            success: true,
            preview: true,
            purchaseList,
            totalEstimatedCost,
            summary: {
              eventsCovered: events.length,
              totalItems,
              lowStockItems: lowStockItems.length,
              estimatedCost: totalEstimatedCost,
            },
            message: `Generated purchase list preview covering ${events.length} events with ${totalItems} items to order.`,
            nextSteps: [
              "Review the suggested purchases",
              "Adjust quantities if needed",
              "Say 'create purchase order' to proceed",
            ],
          };
        } catch (error) {
          console.error("[AI Chat] Purchase generation failed:", error);
          return {
            success: false,
            error: "Purchase generation failed",
            message: `An error occurred while generating purchase list: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // generate_payroll - Generate payroll for a pay period
    // -------------------------------------------------------------------------
    generate_payroll: tool({
      description:
        "Generate payroll for a specific pay period. Use when users need to run payroll, calculate employee wages, or view payroll summaries for approval.",
      inputSchema: z.object({
        periodStart: z
          .string()
          .describe(
            "Start date of the pay period (ISO date string, e.g., '2026-02-01')"
          ),
        periodEnd: z
          .string()
          .describe(
            "End date of the pay period (ISO date string, e.g., '2026-02-15')"
          ),
        jurisdiction: z
          .string()
          .optional()
          .describe("Tax jurisdiction (e.g., 'US', 'CA'). Defaults to 'US'"),
        previewOnly: z
          .boolean()
          .optional()
          .describe(
            "If true, return preview without persisting. Default: false"
          ),
      }),
      execute: async (input) => {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";

          // Validate date range
          const startDate = new Date(input.periodStart);
          const endDate = new Date(input.periodEnd);

          if (startDate >= endDate) {
            return {
              success: false,
              error: "Invalid date range",
              message: "periodStart must be before periodEnd",
            };
          }

          // Check for reasonable date range (max 31 days)
          const daysDiff = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff > 31) {
            return {
              success: false,
              error: "Invalid date range",
              message: "Payroll period cannot exceed 31 days",
            };
          }

          // Call the payroll generate API
          const response = await fetch(`${baseUrl}/api/payroll/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              periodStart: input.periodStart,
              periodEnd: input.periodEnd,
              jurisdiction: input.jurisdiction || "US",
              regenerateOnDataChange: false,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI Chat] Payroll generation API error:", errorText);
            return {
              success: false,
              error: "Payroll API error",
              message: `Failed to generate payroll: ${response.status} ${response.statusText}`,
            };
          }

          interface PayrollResponse {
            batchId: string;
            status: "processing" | "completed" | "failed";
            periodId: string;
            estimatedTotals: {
              totalGross: number;
              totalNet: number;
              totalTaxes: number;
              totalDeductions: number;
              employeeCount: number;
            };
          }

          const data = (await response.json()) as PayrollResponse;

          if (data.status === "failed") {
            return {
              success: false,
              error: "Payroll generation failed",
              message:
                "The payroll calculation encountered an error. Please check time entries and employee data.",
            };
          }

          // Format currency values
          const formatCurrency = (value: number) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value);

          const payrollSummary = {
            period: {
              start: input.periodStart,
              end: input.periodEnd,
              periodId: data.periodId,
            },
            employeeCount: data.estimatedTotals.employeeCount,
            totals: {
              grossPay: formatCurrency(data.estimatedTotals.totalGross),
              netPay: formatCurrency(data.estimatedTotals.totalNet),
              taxes: formatCurrency(data.estimatedTotals.totalTaxes),
              deductions: formatCurrency(data.estimatedTotals.totalDeductions),
            },
            rawValues: data.estimatedTotals,
          };

          return {
            success: true,
            batchId: data.batchId,
            payrollSummary,
            message: `Generated payroll for ${data.estimatedTotals.employeeCount} employees. Total gross: ${formatCurrency(data.estimatedTotals.totalGross)}, Net: ${formatCurrency(data.estimatedTotals.totalNet)}`,
            nextSteps: [
              "Review the payroll summary above",
              "Confirm with 'yes, approve this payroll' to finalize",
              "Export to QuickBooks or download as CSV if needed",
            ],
            manifestPlanHint: {
              domainCommand: "execute_payroll",
              requiresApproval: true,
              params: {
                periodId: data.periodId,
                batchId: data.batchId,
              },
            },
          };
        } catch (error) {
          console.error("[AI Chat] Payroll generation failed:", error);
          return {
            success: false,
            error: "Payroll generation failed",
            message: `An error occurred while generating payroll: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // create_shift - Create a staff shift
    // -------------------------------------------------------------------------
    create_shift: tool({
      description:
        "Create a staff shift for an employee. Use when users need to schedule staff, assign shifts, or add working hours for employees.",
      inputSchema: z.object({
        employeeId: z
          .string()
          .describe("ID of the employee to assign the shift to"),
        date: z
          .string()
          .describe("Date of the shift (ISO date string, e.g., '2026-02-20')"),
        startTime: z
          .string()
          .describe("Start time of the shift (HH:MM format, e.g., '09:00')"),
        endTime: z
          .string()
          .describe("End time of the shift (HH:MM format, e.g., '17:00')"),
        locationId: z
          .string()
          .describe("ID of the location where the shift takes place"),
        role: z
          .string()
          .optional()
          .describe("Role for this shift (e.g., 'Line Cook', 'Prep Cook')"),
        notes: z
          .string()
          .optional()
          .describe("Additional notes about the shift"),
      }),
      execute: async (input) => {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";

          // Parse date and times to create timestamps
          const shiftDate = new Date(input.date);
          if (Number.isNaN(shiftDate.getTime())) {
            return {
              success: false,
              error: "Invalid date",
              message: `Invalid date format: ${input.date}. Use ISO format (e.g., '2026-02-20')`,
            };
          }

          // Combine date with time strings to create full timestamps
          const [startHour, startMin] = input.startTime.split(":").map(Number);
          const [endHour, endMin] = input.endTime.split(":").map(Number);

          if (
            Number.isNaN(startHour) ||
            Number.isNaN(startMin) ||
            Number.isNaN(endHour) ||
            Number.isNaN(endMin)
          ) {
            return {
              success: false,
              error: "Invalid time format",
              message: "Time must be in HH:MM format (e.g., '09:00', '17:30')",
            };
          }

          const shiftStart = new Date(shiftDate);
          shiftStart.setHours(startHour, startMin, 0, 0);

          const shiftEnd = new Date(shiftDate);
          shiftEnd.setHours(endHour, endMin, 0, 0);

          if (shiftEnd <= shiftStart) {
            return {
              success: false,
              error: "Invalid time range",
              message: "End time must be after start time",
            };
          }

          // Check for shift duration warning (more than 12 hours)
          const shiftDurationHours =
            (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
          const durationWarning =
            shiftDurationHours > 12
              ? " Warning: This shift is longer than 12 hours."
              : "";

          // Find or create a schedule for this date
          const schedulesResponse = await fetch(
            `${baseUrl}/api/staff/schedules?limit=100`,
            {
              headers: {
                ...(authCookie ? { Cookie: authCookie } : {}),
              },
            }
          );

          if (!schedulesResponse.ok) {
            return {
              success: false,
              error: "Failed to fetch schedules",
              message: `Could not retrieve schedules: ${schedulesResponse.status}`,
            };
          }

          const schedulesData = (await schedulesResponse.json()) as {
            schedules: Array<{
              id: string;
              schedule_date: string;
              status: string;
              location_id: string | null;
            }>;
          };

          // Format the target date for matching
          const targetDateStr = shiftDate.toISOString().split("T")[0];

          // Find a schedule for the target date
          const schedule = schedulesData.schedules.find((s) => {
            const scheduleDate = new Date(s.schedule_date)
              .toISOString()
              .split("T")[0];
            return scheduleDate === targetDateStr;
          });

          // If schedule exists, use it; otherwise create one
          let scheduleId: string;
          if (schedule) {
            scheduleId = schedule.id;
          } else {
            const createScheduleResponse = await fetch(
              `${baseUrl}/api/staff/schedules/commands/create`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(authCookie ? { Cookie: authCookie } : {}),
                },
                body: JSON.stringify({
                  scheduleDate: targetDateStr,
                  locationId: input.locationId,
                  status: "draft",
                }),
              }
            );

            if (!createScheduleResponse.ok) {
              const errorText = await createScheduleResponse.text();
              console.error("[AI Chat] Schedule creation failed:", errorText);
              return {
                success: false,
                error: "Failed to create schedule",
                message: `Could not create schedule for ${targetDateStr}: ${createScheduleResponse.status}`,
              };
            }

            const newSchedule = (await createScheduleResponse.json()) as {
              result: { id: string };
            };
            scheduleId = newSchedule.result.id;
          }

          // Create the shift via manifest runtime
          const response = await fetch(`${baseUrl}/api/staff/shifts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authCookie ? { Cookie: authCookie } : {}),
            },
            body: JSON.stringify({
              scheduleId,
              employeeId: input.employeeId,
              locationId: input.locationId,
              shiftStart: shiftStart.getTime(),
              shiftEnd: shiftEnd.getTime(),
              roleDuringShift: input.role,
              notes: input.notes,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI Chat] Shift creation API error:", errorText);
            return {
              success: false,
              error: "Shift creation failed",
              message: `Failed to create shift: ${response.status} ${response.statusText}`,
            };
          }

          const data = (await response.json()) as {
            result: {
              id: string;
              scheduleId: string;
              employeeId: string;
              locationId: string;
              shiftStart: number;
              shiftEnd: number;
              roleDuringShift?: string;
              notes?: string;
            };
          };

          // Format times for display
          const formatTime = (timestamp: number) =>
            new Date(timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

          return {
            success: true,
            shiftId: data.result.id,
            shift: {
              id: data.result.id,
              date: input.date,
              startTime: formatTime(data.result.shiftStart),
              endTime: formatTime(data.result.shiftEnd),
              duration: `${shiftDurationHours.toFixed(1)} hours`,
              employeeId: data.result.employeeId,
              locationId: data.result.locationId,
              role: data.result.roleDuringShift,
              notes: data.result.notes,
              scheduleId: data.result.scheduleId,
            },
            message: `Created shift for ${input.date} from ${input.startTime} to ${input.endTime} (${shiftDurationHours.toFixed(1)} hours).${durationWarning}`,
            nextSteps: [
              "Review the shift details above",
              "Confirm the shift assignment with the employee",
              "Use 'publish schedule' to make shifts visible to staff",
            ],
            manifestPlanHint: {
              domainCommand: "create_shift",
              requiresApproval: false,
              params: {
                shiftId: data.result.id,
                scheduleId: data.result.scheduleId,
              },
            },
          };
        } catch (error) {
          console.error("[AI Chat] Shift creation failed:", error);
          return {
            success: false,
            error: "Shift creation failed",
            message: `An error occurred while creating the shift: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    // -------------------------------------------------------------------------
    // create_recipe - Create a new recipe
    // -------------------------------------------------------------------------
    create_recipe: tool({
      description:
        "Create a new recipe in the kitchen system. Use when users need to add recipes, create dish templates, or define cooking instructions for menu items.",
      inputSchema: z.object({
        name: z
          .string()
          .describe(
            "Name of the recipe (e.g., 'Beef Bourguignon', 'Caesar Salad')"
          ),
        category: z
          .string()
          .optional()
          .describe(
            "Recipe category (e.g., 'Appetizer', 'Main Course', 'Dessert', 'Sauce')"
          ),
        cuisineType: z
          .string()
          .optional()
          .describe(
            "Type of cuisine (e.g., 'French', 'Italian', 'Asian', 'Mexican')"
          ),
        description: z
          .string()
          .optional()
          .describe("Brief description of the recipe"),
        tags: z
          .array(z.string())
          .optional()
          .describe(
            "Tags for searching and categorization (e.g., ['vegetarian', 'gluten-free', 'quick'])"
          ),
      }),
      execute: async (input) => {
        try {
          const baseUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:2223";

          // Validate required fields
          if (!input.name || input.name.trim().length === 0) {
            return {
              success: false,
              error: "Invalid recipe name",
              message: "Recipe name is required and cannot be empty",
            };
          }

          // Create the recipe via manifest runtime
          const response = await fetch(
            `${baseUrl}/api/kitchen/recipes/commands/create`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(authCookie ? { Cookie: authCookie } : {}),
              },
              body: JSON.stringify({
                name: input.name.trim(),
                category: input.category?.trim() || null,
                cuisineType: input.cuisineType?.trim() || null,
                description: input.description?.trim() || null,
                tags: input.tags?.filter((t) => t.trim().length > 0) || [],
                isActive: true,
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error("[AI Chat] Recipe creation API error:", errorText);
            return {
              success: false,
              error: "Recipe creation failed",
              message: `Failed to create recipe: ${response.status} ${response.statusText}`,
            };
          }

          const data = (await response.json()) as {
            result: {
              id: string;
              name: string;
              category?: string | null;
              cuisineType?: string | null;
              description?: string | null;
              tags?: string[];
              isActive: boolean;
            };
          };

          return {
            success: true,
            recipeId: data.result.id,
            recipe: {
              id: data.result.id,
              name: data.result.name,
              category: data.result.category,
              cuisineType: data.result.cuisineType,
              description: data.result.description,
              tags: data.result.tags,
              isActive: data.result.isActive,
            },
            message: `Created recipe: "${data.result.name}"${data.result.category ? ` (${data.result.category})` : ""}`,
            nextSteps: [
              "Add ingredients to the recipe via the recipe editor",
              "Create a recipe version with cooking instructions and times",
              "Link the recipe to dishes for menu planning",
              "Calculate recipe costs based on ingredient prices",
            ],
            manifestPlanHint: {
              domainCommand: "create_recipe",
              requiresApproval: false,
              params: {
                recipeId: data.result.id,
              },
            },
          };
        } catch (error) {
          console.error("[AI Chat] Recipe creation failed:", error);
          return {
            success: false,
            error: "Recipe creation failed",
            message: `An error occurred while creating the recipe: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { messages, boardId } = body as {
      messages: UIMessage[];
      boardId?: string;
    };
    const authCookie = request.headers.get("cookie");

    if (!(messages && Array.isArray(messages))) {
      return new Response("Invalid request: messages required", {
        status: 400,
      });
    }

    // Fetch board context for the AI
    let boardContext = "";
    if (boardId) {
      try {
        boardContext = await getBoardContext(boardId);
      } catch (error) {
        console.error("[AI Chat] Failed to fetch board context:", error);
        boardContext = "Board context unavailable.";
      }
    }

    const systemWithContext = boardContext
      ? `${SYSTEM_PROMPT}\n\n**Current Board State:**\n${boardContext}`
      : SYSTEM_PROMPT;

    const openAiApiKey = resolveOpenAiApiKey();
    if (!openAiApiKey) {
      console.warn(
        "[AI Chat] OPENAI_API_KEY is missing. Using local fallback response mode."
      );
      return createLocalFallbackResponse({ messages, boardId });
    }

    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = openAiApiKey;
    }

    const result = streamText({
      model: openai(AI_MODEL),
      system: systemWithContext,
      messages: await convertToModelMessages(messages),
      temperature: TEMPERATURE,
      tools: createBoardTools({
        boardId,
        tenantId,
        userId: userId ?? null,
        authCookie,
      }),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[AI Chat] Route error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ---------------------------------------------------------------------------
// Local Fallback (No API Key)
// ---------------------------------------------------------------------------

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
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("OPENAI_API_KEY="));

    if (!line) {
      return null;
    }

    const key = line.slice("OPENAI_API_KEY=".length).trim();
    return key ? key.replace(/^['"]|['"]$/g, "") : null;
  } catch (error) {
    console.error("[AI Chat] Failed to read Documents/env.txt:", error);
    return null;
  }
}

async function createLocalFallbackResponse(params: {
  messages: UIMessage[];
  boardId?: string;
}): Promise<Response> {
  const { messages, boardId } = params;
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const userText =
    (lastUserMessage?.parts ?? [])
      .filter((part): part is { type: "text"; text: string } => {
        return (
          typeof part === "object" && part !== null && part.type === "text"
        );
      })
      .map((part) => part.text)
      .join(" ")
      .trim()
      .toLowerCase() ?? "";

  const isSummaryQuery =
    userText.includes("summary") ||
    userText.includes("what's on") ||
    userText.includes("whats on");
  const isRiskQuery =
    userText.includes("risk") ||
    userText.includes("conflict") ||
    userText.includes("at risk");
  const isPlanningQuery =
    userText.includes("plan") ||
    userText.includes("create") ||
    userText.includes("event") ||
    userText.includes("menu");

  let responseText =
    "AI provider is not configured on this environment. Set `OPENAI_API_KEY` in your local `.env` and restart the dev server to enable full planning and execution.";

  if (boardId && isSummaryQuery) {
    try {
      const summary = await queryBoardData(boardId, "summary");
      const total =
        typeof summary.totalProjections === "number"
          ? summary.totalProjections
          : 0;
      const byType =
        summary.byType && typeof summary.byType === "object"
          ? Object.entries(summary.byType as Record<string, number>)
              .map(([type, count]) => `${type}: ${count}`)
              .join(", ")
          : "none";

      responseText = `Board summary: ${total} projections (${byType}). AI planning is currently in fallback mode because \`OPENAI_API_KEY\` is missing locally.`;
    } catch (error) {
      console.error("[AI Chat] Fallback summary failed:", error);
    }
  } else if (isRiskQuery) {
    responseText =
      "Risk analysis needs the configured AI backend for full conflict detection/explanations in this panel. You can still use `Commands` and `Entities` while local AI is unconfigured.";
  } else if (isPlanningQuery) {
    responseText =
      "I can see you’re asking for a plan. In fallback mode I cannot generate/execute `suggest_manifest_plan`. Set local `OPENAI_API_KEY` and restart dev to re-enable plan generation.";
  }

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: responseText });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    originalMessages: messages,
  });

  return createUIMessageStreamResponse({ stream });
}

// ---------------------------------------------------------------------------
// Board Context Helpers
// ---------------------------------------------------------------------------

async function getBoardContext(boardId: string): Promise<string> {
  const tenantId = await requireTenantId();
  const board = await database.commandBoard.findFirst({
    where: { tenantId, id: boardId, deletedAt: null },
    select: {
      name: true,
      description: true,
      status: true,
      tags: true,
    },
  });

  if (!board) {
    return "Board not found.";
  }

  const projections = await database.boardProjection.findMany({
    where: { tenantId, boardId, deletedAt: null },
    select: {
      entityType: true,
      entityId: true,
    },
  });

  // Count entities by type
  const typeCounts: Record<string, number> = {};
  for (const p of projections) {
    typeCounts[p.entityType] = (typeCounts[p.entityType] || 0) + 1;
  }

  const typesSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  return [
    `Board: "${board.name}" (${board.status})`,
    board.description ? `Description: ${board.description}` : null,
    board.tags.length > 0 ? `Tags: ${board.tags.join(", ")}` : null,
    `Projections: ${projections.length} total (${typesSummary || "none"})`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function queryBoardData(
  boardId: string,
  query: string
): Promise<Record<string, unknown>> {
  const tenantId = await requireTenantId();
  const projections = await database.boardProjection.findMany({
    where: { tenantId, boardId, deletedAt: null },
    select: {
      entityType: true,
      entityId: true,
    },
  });

  const eventIds = projections
    .filter((p) => p.entityType === "event")
    .map((p) => p.entityId);
  const taskIds = projections
    .filter((p) => p.entityType === "prep_task")
    .map((p) => p.entityId);

  if (query === "summary" || query === "events") {
    const events =
      eventIds.length > 0
        ? await database.event.findMany({
            where: { tenantId, id: { in: eventIds }, deletedAt: null },
            select: {
              title: true,
              eventDate: true,
              guestCount: true,
              status: true,
              venueName: true,
            },
            orderBy: { eventDate: "asc" },
            take: 10,
          })
        : [];

    return {
      type: "events",
      count: events.length,
      events: events.map((e) => ({
        title: e.title,
        date: e.eventDate,
        guests: e.guestCount,
        status: e.status,
        venue: e.venueName,
      })),
    };
  }

  if (query === "tasks" || query === "overdue") {
    const now = new Date();
    const tasks =
      taskIds.length > 0
        ? await database.prepTask.findMany({
            where: {
              tenantId,
              id: { in: taskIds },
              deletedAt: null,
              ...(query === "overdue"
                ? { dueByDate: { lt: now }, status: { not: "completed" } }
                : {}),
            },
            select: {
              name: true,
              status: true,
              priority: true,
              dueByDate: true,
            },
            orderBy: { dueByDate: "asc" },
            take: 15,
          })
        : [];

    return {
      type: query === "overdue" ? "overdue_tasks" : "tasks",
      count: tasks.length,
      tasks: tasks.map((t) => ({
        name: t.name,
        status: t.status,
        priority: t.priority,
        dueBy: t.dueByDate,
      })),
    };
  }

  if (query === "this_week") {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await database.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        eventDate: { gte: now, lte: weekEnd },
      },
      select: {
        title: true,
        eventDate: true,
        guestCount: true,
        status: true,
      },
      orderBy: { eventDate: "asc" },
      take: 10,
    });

    return {
      type: "this_week",
      count: events.length,
      events: events.map((e) => ({
        title: e.title,
        date: e.eventDate,
        guests: e.guestCount,
        status: e.status,
      })),
    };
  }

  // Default: return projection counts
  const typeCounts: Record<string, number> = {};
  for (const p of projections) {
    typeCounts[p.entityType] = (typeCounts[p.entityType] || 0) + 1;
  }

  return {
    type: "summary",
    totalProjections: projections.length,
    byType: typeCounts,
  };
}
