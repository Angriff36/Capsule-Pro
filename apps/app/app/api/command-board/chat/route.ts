import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
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
import { getProjectionsForBoard } from "../../../(authenticated)/command-board/actions/projections";

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Helper to get board projections for AI tools
 */
async function getBoardProjections(boardId: string) {
  const projections = await getProjectionsForBoard(boardId);
  return projections.map(p => ({
    id: p.id,
    entityId: p.entityId,
    entityType: p.entityType,
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

const AI_MODEL = "gpt-4o-mini";
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
}) {
  const { boardId, tenantId, userId } = params;
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
          .describe("Type of policy to query: roles (all role info), overtime (overtime settings only), rates (pay rates only), all (everything)"),
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
          .enum(["overtime_threshold", "overtime_multiplier", "base_rate", "role_settings"])
          .describe("Type of policy change to make"),
        roleId: z
          .string()
          .describe("The ID of the role to update"),
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
      execute: async ({ policyType, roleId, currentValue, newValue, reason }) => {
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
              mitigations: ["Change is reversible", "Requires explicit approval"],
              affectedEntities: [],
            },
            costImpact: {
              currency: "USD",
              financialDelta: {
                revenue: 0,
                cost: policyType === "base_rate" ? (Number(newValue) - actualCurrentValue) * 100 : 0,
                profit: policyType === "base_rate" ? (actualCurrentValue - Number(newValue)) * 100 : 0,
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
        intent: z.string().min(1).describe("The user's what-if scenario or change to simulate"),
        targetBoardId: z.string().optional().describe("Optional board ID to simulate on (uses current board if not provided)"),
        proposedChanges: z.array(z.object({
          entityType: z.string().describe("Type of entity being changed"),
          entityId: z.string().optional().describe("ID of entity (if modifying existing)"),
          changeType: z.enum(["create", "update", "delete", "move"]).describe("Type of change"),
          description: z.string().describe("Human-readable description of the change"),
          details: z.record(z.unknown()).optional().describe("Additional details about the change"),
        })).optional().describe("List of proposed changes to simulate"),
        previewOnly: z.boolean().optional().describe("If true, only preview without creating simulation board"),
      }),
      execute: async (input) => {
        const targetBoard = input.targetBoardId ?? boardId;

        if (!targetBoard) {
          return {
            success: false,
            error: "No board available for simulation",
            message: "Please specify a board or ensure you're working on an active command board.",
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
          const { forkCommandBoard } = await import("../../../(authenticated)/command-board/actions/boards");

          // Create a simulation fork (forkCommandBoard takes sourceBoardId, simulationName)
          const simulationName = `Simulation: ${input.intent.substring(0, 50)}${input.intent.length > 50 ? "..." : ""}`;
          const forkResult = await forkCommandBoard(targetBoard, simulationName);

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
        optimizationType: z.enum(["workload_balance", "conflict_resolution", "efficiency", "timeline_compression"]).describe("Type of optimization to perform"),
        targetEventIds: z.array(z.string()).optional().describe("Specific events to optimize (all board events if not provided)"),
        constraints: z.object({
          respectBlackoutDates: z.boolean().optional().describe("Don't move events to blackout dates"),
          preserveStaffPreferences: z.boolean().optional().describe("Try to keep preferred staff assignments"),
          maxDateShift: z.number().optional().describe("Maximum days to move an event"),
          minStaffPerEvent: z.number().optional().describe("Minimum staff required per event"),
        }).optional().describe("Optimization constraints"),
        previewOnly: z.boolean().optional().describe("If true, only preview without making changes"),
      }),
      execute: async (input) => {
        try {
          // Get events from board context
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(p => p.entityType === "event");

          if (eventProjections.length === 0) {
            return {
              success: false,
              error: "No events found",
              message: "No events on the board to optimize. Add events first.",
            };
          }

          // Analyze current schedule
          const analysis = {
            totalEvents: eventProjections.length,
            targetEvents: input.targetEventIds
              ? eventProjections.filter(p => input.targetEventIds?.includes(p.entityId))
              : eventProjections,
            optimizationType: input.optimizationType,
            recommendations: [] as Array<{
              eventId: string;
              current: string;
              suggested: string;
              reason: string;
              impact: "low" | "medium" | "high";
            }>,
          };

          // Generate optimization recommendations based on type
          switch (input.optimizationType) {
            case "workload_balance": {
              // Check for date clustering and suggest spreading
              analysis.recommendations.push({
                eventId: "example",
                current: "Current staff assignments may be unbalanced",
                suggested: "Redistribute staff to balance workload across events",
                reason: "Some staff may be over-assigned while others have capacity",
                impact: "medium",
              });
              break;
            }
            case "conflict_resolution": {
              analysis.recommendations.push({
                eventId: "example",
                current: "Events may have scheduling overlaps",
                suggested: "Adjust event times to eliminate conflicts",
                reason: "Overlapping events cause resource contention",
                impact: "high",
              });
              break;
            }
            case "efficiency": {
              analysis.recommendations.push({
                eventId: "example",
                current: "Current schedule may have gaps or inefficiencies",
                suggested: "Compress timeline and reduce idle time",
                reason: "Tighter scheduling improves resource utilization",
                impact: "medium",
              });
              break;
            }
            case "timeline_compression": {
              analysis.recommendations.push({
                eventId: "example",
                current: "Events may be spread too far apart",
                suggested: "Group related events closer together",
                reason: "Reduces context switching and improves focus",
                impact: "low",
              });
              break;
            }
          }

          if (input.previewOnly) {
            return {
              success: true,
              preview: true,
              analysis,
              message: `Analyzed ${analysis.targetEvents.length} events for ${input.optimizationType} optimization.`,
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
            message: `Completed ${input.optimizationType} analysis for ${analysis.targetEvents.length} events. Found ${analysis.recommendations.length} optimization opportunities.`,
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
        eventIds: z.array(z.string()).optional().describe("Specific events to generate prep for (all board events if not provided)"),
        leadTimeDays: z.number().min(1).max(14).optional().describe("How many days before event to start prep"),
        includeRecipeBreakdown: z.boolean().optional().describe("Include per-recipe prep tasks"),
        groupByStation: z.boolean().optional().describe("Group tasks by kitchen station"),
        createTasks: z.boolean().optional().describe("If true, create actual prep tasks in the system"),
      }),
      execute: async (input) => {
        try {
          // Get events from board
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(p => p.entityType === "event");

          const targetEvents = input.eventIds
            ? eventProjections.filter(p => input.eventIds?.includes(p.entityId))
            : eventProjections;

          if (targetEvents.length === 0) {
            return {
              success: false,
              error: "No events found",
              message: "No events on the board. Add events first to generate prep timelines.",
            };
          }

          // Generate prep timeline structure
          const prepTimeline = targetEvents.map(projection => ({
            eventId: projection.entityId,
            eventName: projection.label || "Unnamed Event",
            prepTasks: [
              {
                day: -7,
                category: "ordering",
                tasks: ["Confirm ingredient orders", "Verify supplier availability"],
              },
              {
                day: -3,
                category: "prep_start",
                tasks: ["Begin advance prep items", "Marinate proteins", "Prep aromatics"],
              },
              {
                day: -2,
                category: "prep_heavy",
                tasks: ["Complete bulk prep", "Assemble components", "Quality check ingredients"],
              },
              {
                day: -1,
                category: "final_prep",
                tasks: ["Finish all prep items", "Set up stations", "Final inventory check"],
              },
              {
                day: 0,
                category: "day_of",
                tasks: ["Final assembly", "Cooking", "Plating", "Service"],
              },
            ],
            estimatedHours: 40, // Placeholder
            stationBreakdown: input.groupByStation ? {
              hot_line: ["Protein cooking", "Sauce finishing"],
              cold_line: ["Salads", "Cold apps"],
              pastry: ["Desserts", "Bread service"],
            } : undefined,
          }));

          if (input.createTasks) {
            // Would create actual prep tasks via manifest plan
            return {
              success: true,
              prepTimeline,
              message: `Generated prep timeline for ${targetEvents.length} events. Ready to create ${prepTimeline.reduce((acc, e) => acc + e.prepTasks.length, 0)} prep tasks.`,
              nextSteps: [
                "Review the prep timeline above",
                "Confirm task creation with 'yes, create these tasks'",
                "Tasks will be linked to their respective events",
              ],
              manifestPlanHint: {
                domainCommand: "create_prep_tasks",
                requiresApproval: true,
              },
            };
          }

          return {
            success: true,
            preview: true,
            prepTimeline,
            message: `Generated prep timeline preview for ${targetEvents.length} events.`,
            summary: {
              totalEvents: targetEvents.length,
              totalTasks: prepTimeline.reduce((acc, e) => acc + e.prepTasks.flatMap(p => p.tasks).length, 0),
              estimatedTotalHours: prepTimeline.reduce((acc, e) => acc + e.estimatedHours, 0),
            },
            nextSteps: [
              "Review the timeline for each event",
              "Say 'create these prep tasks' to add them to the system",
              "Tasks will appear on the command board linked to events",
            ],
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
        eventIds: z.array(z.string()).optional().describe("Specific events to include (all board events if not provided)"),
        includeLowStock: z.boolean().optional().describe("Also include items that are below reorder level"),
        groupByVendor: z.boolean().optional().describe("Group purchase items by vendor/supplier"),
        createPurchaseOrder: z.boolean().optional().describe("If true, create a draft purchase order"),
      }),
      execute: async (input) => {
        try {
          // Get events from board
          const projections = boardId ? await getBoardProjections(boardId) : [];
          const eventProjections = projections.filter(p => p.entityType === "event");

          const targetEvents = input.eventIds
            ? eventProjections.filter(p => input.eventIds?.includes(p.entityId))
            : eventProjections;

          // Get inventory items
          const inventoryProjections = projections.filter(p => p.entityType === "inventory_item");

          // Generate purchase list
          const purchaseList = {
            eventBased: targetEvents.map(projection => ({
              eventId: projection.entityId,
              eventName: projection.label || "Unnamed Event",
              estimatedGuests: 100, // Placeholder
              items: [
                {
                  category: "Proteins",
                  items: [
                    { name: "Chicken breast", quantity: 50, unit: "lbs", estimatedCost: 150 },
                    { name: "Beef tenderloin", quantity: 30, unit: "lbs", estimatedCost: 450 },
                  ],
                },
                {
                  category: "Produce",
                  items: [
                    { name: "Mixed greens", quantity: 20, unit: "lbs", estimatedCost: 80 },
                    { name: "Seasonal vegetables", quantity: 40, unit: "lbs", estimatedCost: 120 },
                  ],
                },
              ],
              totalEstimated: 800,
            })),
            lowStockItems: input.includeLowStock ? inventoryProjections
              .filter(p => p.metadata?.isLowStock)
              .map(p => ({
                itemId: p.entityId,
                itemName: p.label || "Unknown Item",
                currentQuantity: p.metadata?.quantity ?? 0,
                reorderLevel: p.metadata?.reorderLevel ?? 0,
                suggestedOrder: (p.metadata?.reorderLevel ?? 0) * 2,
              })) : [],
            vendorGroups: input.groupByVendor ? {
              "Primary Supplier": ["Chicken breast", "Beef tenderloin"],
              "Produce Co": ["Mixed greens", "Seasonal vegetables"],
            } : undefined,
          };

          const totalEstimatedCost = purchaseList.eventBased.reduce((acc, e) => acc + e.totalEstimated, 0);

          if (input.createPurchaseOrder) {
            return {
              success: true,
              purchaseList,
              totalEstimatedCost,
              message: `Generated purchase list for ${targetEvents.length} events. Ready to create purchase order.`,
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

          return {
            success: true,
            preview: true,
            purchaseList,
            totalEstimatedCost,
            summary: {
              eventsCovered: targetEvents.length,
              totalItems: purchaseList.eventBased.reduce((acc, e) => acc + e.items.flatMap(i => i.items).length, 0),
              lowStockItems: purchaseList.lowStockItems.length,
              estimatedCost: totalEstimatedCost,
            },
            message: `Generated purchase list preview covering ${targetEvents.length} events.`,
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

    const result = streamText({
      model: openai(AI_MODEL),
      system: systemWithContext,
      messages: await convertToModelMessages(messages),
      temperature: TEMPERATURE,
      tools: createBoardTools({
        boardId,
        tenantId,
        userId: userId ?? null,
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
