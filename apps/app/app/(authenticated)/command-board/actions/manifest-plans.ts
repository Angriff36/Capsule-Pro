"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import {
  createManifestPlanAuditEvent,
  getPendingManifestPlan,
  updateManifestPlanRecord,
} from "../../../lib/command-board/manifest-plans";
import { requireTenantId } from "../../../lib/tenant";
import type {
  BoardMutation,
  DomainCommandStep,
  ManifestPlanRecordPayload,
  SuggestedManifestPlan,
} from "../types/manifest-plan";
import { BOARD_COMMANDS } from "./command-definitions";
import { type BoardCommandId, executeCommand } from "./execute-command";
import {
  addProjection,
  removeProjection,
  updateProjectionPosition,
} from "./projections";

const BOARD_COMMAND_IDS = new Set(BOARD_COMMANDS.map((command) => command.id));

interface StepExecutionResult {
  stepId: string;
  success: boolean;
  message: string;
  error?: string;
}

interface BoardMutationResult {
  mutationType: BoardMutation["type"];
  success: boolean;
  message: string;
  error?: string;
}

interface DomainExecutionContext {
  tenantId: string;
  boardId: string;
  createdEventId: string | null;
}

export interface ApproveManifestPlanResult {
  success: boolean;
  planId: string;
  summary: string;
  stepResults: StepExecutionResult[];
  boardMutationResults: BoardMutationResult[];
  error?: string;
}

function isBoardCommandId(value: string): value is BoardCommandId {
  return BOARD_COMMAND_IDS.has(value as BoardCommandId);
}

function addHours(date: Date, hours: number): Date {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function resolveFutureEventDate(daysFromNow = 14): Date {
  const now = new Date();
  now.setDate(now.getDate() + daysFromNow);
  now.setHours(0, 0, 0, 0);
  return now;
}

async function resolveEventIdFromStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<string | null> {
  const fromArgs = asString(step.args.eventId);
  if (fromArgs) {
    return fromArgs;
  }

  if (
    step.entityType === "event" &&
    step.entityId &&
    step.entityId !== "new_event" &&
    step.entityId !== "created_event"
  ) {
    return step.entityId;
  }

  if (context.createdEventId) {
    return context.createdEventId;
  }

  const boardEventProjection = await database.boardProjection.findFirst({
    where: {
      tenantId: context.tenantId,
      boardId: context.boardId,
      entityType: "event",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { entityId: true },
  });

  if (boardEventProjection?.entityId) {
    return boardEventProjection.entityId;
  }

  const latestEvent = await database.event.findFirst({
    where: { tenantId: context.tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return latestEvent?.id ?? null;
}

async function resolveDishIdFromStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<string | null> {
  const fromArgs = asString(step.args.dishId);
  if (fromArgs) {
    return fromArgs;
  }

  if (
    step.entityType === "dish" &&
    step.entityId &&
    step.entityId !== "available_dish"
  ) {
    return step.entityId;
  }

  const recipeIdFromArgs = asString(step.args.recipeId);
  const recipeIdFromStep =
    step.entityType === "recipe" && step.entityId ? step.entityId : undefined;
  const recipeId = recipeIdFromArgs ?? recipeIdFromStep;
  if (recipeId) {
    const dishForRecipe = await database.dish.findFirst({
      where: {
        tenantId: context.tenantId,
        recipeId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (dishForRecipe?.id) {
      return dishForRecipe.id;
    }
  }

  const recipeProjection = await database.boardProjection.findFirst({
    where: {
      tenantId: context.tenantId,
      boardId: context.boardId,
      entityType: "recipe",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true },
  });

  if (recipeProjection?.entityId) {
    const dishForProjectedRecipe = await database.dish.findFirst({
      where: {
        tenantId: context.tenantId,
        recipeId: recipeProjection.entityId,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (dishForProjectedRecipe?.id) {
      return dishForProjectedRecipe.id;
    }
  }

  const fallbackDish = await database.dish.findFirst({
    where: { tenantId: context.tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return fallbackDish?.id ?? null;
}

async function executeCreateEventStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  const title = asString(step.args.title) ?? "AI Planned Event";
  const eventType = asString(step.args.eventType) ?? "catering";
  const guestCount = asNumber(step.args.guestCount) ?? 50;
  const status = asString(step.args.status) ?? "draft";
  const venueName = asString(step.args.venueName);
  const venueAddress = asString(step.args.venueAddress);
  const notes = asString(step.args.notes);
  const dateInput = asString(step.args.eventDate);
  const parsedDate = dateInput ? new Date(dateInput) : resolveFutureEventDate();
  const eventDate = Number.isNaN(parsedDate.getTime())
    ? resolveFutureEventDate()
    : parsedDate;

  const event = await database.$transaction(async (tx) => {
    const createdEvent = await tx.event.create({
      data: {
        tenantId: context.tenantId,
        title,
        eventType,
        eventDate,
        guestCount: Math.max(1, Math.round(guestCount)),
        status,
        venueName: venueName ?? null,
        venueAddress: venueAddress ?? null,
        notes: notes ?? null,
      },
      select: { id: true, title: true },
    });

    await tx.battleBoard.create({
      data: {
        tenantId: context.tenantId,
        eventId: createdEvent.id,
        board_name: `${createdEvent.title} - Battle Board`,
        board_type: "event-specific",
        boardData: {},
      },
    });

    return createdEvent;
  });

  context.createdEventId = event.id;
  const projectionResult = await addProjection(context.boardId, {
    entityType: "event",
    entityId: event.id,
    positionX: 120,
    positionY: 120,
  });

  const projectionSuffix =
    projectionResult.success || !projectionResult.error
      ? ""
      : ` (board projection skipped: ${projectionResult.error})`;

  return {
    stepId: step.stepId,
    success: true,
    message: `Created event "${event.title}" (${event.id}).${projectionSuffix}`,
  };
}

async function executeLinkMenuStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  const eventId = await resolveEventIdFromStep(context, step);
  if (!eventId) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Unable to resolve target event",
      error: "No event available for menu linking",
    };
  }

  const dishId = await resolveDishIdFromStep(context, step);
  if (!dishId) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Unable to resolve dish to link",
      error: "No dish available for menu linking",
    };
  }

  const course = asString(step.args.course) ?? "main";
  const quantityServings = Math.max(
    1,
    Math.round(asNumber(step.args.quantityServings) ?? 1)
  );

  const existing = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${context.tenantId}
        AND event_id = ${eventId}
        AND dish_id = ${dishId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing.length > 0) {
    return {
      stepId: step.stepId,
      success: true,
      message: `Dish already linked to event (${eventId}).`,
    };
  }

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_events.event_dishes (
        tenant_id,
        id,
        event_id,
        dish_id,
        course,
        quantity_servings,
        created_at,
        updated_at
      )
      VALUES (
        ${context.tenantId},
        gen_random_uuid(),
        ${eventId},
        ${dishId},
        ${course},
        ${quantityServings},
        ${new Date()},
        ${new Date()}
      )
    `
  );

  return {
    stepId: step.stepId,
    success: true,
    message: `Linked dish ${dishId} to event ${eventId}.`,
  };
}

async function executeDomainStep(
  context: DomainExecutionContext,
  boardId: string,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  if (isBoardCommandId(step.commandName)) {
    const commandResult = await executeCommand(boardId, step.commandName);
    return {
      stepId: step.stepId,
      success: commandResult.success,
      message: commandResult.message,
      ...(commandResult.success
        ? {}
        : { error: commandResult.error ?? "Command failed" }),
    };
  }

  const normalized = step.commandName.trim().toLowerCase();

  if (normalized === "create_event") {
    return executeCreateEventStep(context, step);
  }

  if (
    normalized === "link_menu" ||
    normalized === "add_dish_to_event" ||
    normalized === "link_menu_item"
  ) {
    return executeLinkMenuStep(context, step);
  }

  return {
    stepId: step.stepId,
    success: false,
    message: "Unsupported command in current mounted board flow",
    error: `Unsupported commandName: ${step.commandName}`,
  };
}

async function executeDomainSteps(
  tenantId: string,
  boardId: string,
  domainPlan: DomainCommandStep[]
): Promise<StepExecutionResult[]> {
  const context: DomainExecutionContext = {
    tenantId,
    boardId,
    createdEventId: null,
  };
  const results: StepExecutionResult[] = [];

  for (const step of domainPlan) {
    const result = await executeDomainStep(context, boardId, step);
    results.push(result);
    if (!result.success) {
      break;
    }
  }

  return results;
}

async function applyBoardMutations(
  boardId: string,
  mutations: BoardMutation[]
): Promise<BoardMutationResult[]> {
  const tenantId = await requireTenantId();
  const results: BoardMutationResult[] = [];

  for (const mutation of mutations) {
    try {
      switch (mutation.type) {
        case "addNode": {
          const addResult = await addProjection(boardId, {
            entityType: mutation.entityType,
            entityId: mutation.entityId,
            positionX: mutation.positionX,
            positionY: mutation.positionY,
            width: mutation.width,
            height: mutation.height,
          });
          if (!addResult.success) {
            results.push({
              mutationType: mutation.type,
              success: false,
              message: "Unable to add node",
              error: addResult.error,
            });
            continue;
          }
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Node added to board",
          });
          break;
        }
        case "removeNode":
          await removeProjection(mutation.projectionId);
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Node removed from board",
          });
          break;
        case "moveNode":
          await updateProjectionPosition(mutation.projectionId, {
            x: mutation.positionX,
            y: mutation.positionY,
          });
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Node moved",
          });
          break;
        case "addEdge":
          await database.boardAnnotation.create({
            data: {
              tenantId,
              id: mutation.edgeId ?? crypto.randomUUID(),
              boardId,
              annotationType: "connection",
              fromProjectionId: mutation.sourceProjectionId,
              toProjectionId: mutation.targetProjectionId,
              label: mutation.label ?? null,
              color: mutation.color ?? null,
              style: mutation.style ?? null,
            },
          });
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Connection annotation created",
          });
          break;
        case "removeEdge": {
          const annotationId = mutation.edgeId.startsWith("annotation-")
            ? mutation.edgeId.slice("annotation-".length)
            : mutation.edgeId;
          const updateResult = await database.boardAnnotation.updateMany({
            where: {
              tenantId,
              boardId,
              id: annotationId,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
          results.push({
            mutationType: mutation.type,
            success: updateResult.count > 0,
            message:
              updateResult.count > 0
                ? "Connection annotation removed"
                : "No matching annotation found to remove",
          });
          break;
        }
        case "annotate":
          await database.boardAnnotation.create({
            data: {
              tenantId,
              id: crypto.randomUUID(),
              boardId,
              annotationType: "label",
              label: mutation.label,
              color: mutation.color ?? null,
            },
          });
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Board annotation added",
          });
          break;
        case "highlightNode":
          results.push({
            mutationType: mutation.type,
            success: true,
            message: "Highlight preview acknowledged (no persisted write)",
          });
          break;
      }
    } catch (error) {
      results.push({
        mutationType: mutation.type,
        success: false,
        message: "Board mutation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  revalidatePath(`/command-board/${boardId}`);
  return results;
}

function summarizeResult(
  plan: SuggestedManifestPlan,
  stepResults: StepExecutionResult[],
  boardMutationResults: BoardMutationResult[]
): { success: boolean; summary: string } {
  const failedStepCount = stepResults.filter((step) => !step.success).length;
  const failedMutationCount = boardMutationResults.filter(
    (mutation) => !mutation.success
  ).length;

  if (failedStepCount > 0 || failedMutationCount > 0) {
    return {
      success: false,
      summary: `Plan "${plan.title}" completed with issues (${failedStepCount} failed steps, ${failedMutationCount} failed board mutations).`,
    };
  }

  return {
    success: true,
    summary: `Plan "${plan.title}" executed successfully.`,
  };
}

export async function approveManifestPlan(
  boardId: string,
  planId: string,
  prerequisiteAnswers: Record<string, string> = {}
): Promise<ApproveManifestPlanResult> {
  try {
    const tenantId = await requireTenantId();
    const { userId } = await auth();

    const stored = await getPendingManifestPlan(tenantId, boardId, planId);
    if (!stored) {
      return {
        success: false,
        planId,
        summary: "Plan not found",
        stepResults: [],
        boardMutationResults: [],
        error: "Pending plan was not found for this board",
      };
    }

    const { eventId, payload } = stored;
    if (payload.state !== "pending") {
      return {
        success: false,
        planId,
        summary: "Plan is no longer pending",
        stepResults: [],
        boardMutationResults: [],
        error: "Plan has already been processed",
      };
    }

    const missingAnswers = payload.plan.prerequisites
      .filter(
        (question) =>
          question.required && !prerequisiteAnswers[question.questionId]
      )
      .map((question) => question.prompt);

    if (missingAnswers.length > 0) {
      return {
        success: false,
        planId,
        summary: "Missing required inputs",
        stepResults: [],
        boardMutationResults: [],
        error: `Missing prerequisites: ${missingAnswers.join(", ")}`,
      };
    }

    const idempotencyKey = payload.plan.execution.idempotencyKey;
    const existingIdempotentResult =
      await database.manifestIdempotency.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: idempotencyKey,
          },
        },
      });

    if (existingIdempotentResult) {
      const parsed =
        existingIdempotentResult.result as unknown as ApproveManifestPlanResult;
      return parsed;
    }

    const stepResults = await executeDomainSteps(
      tenantId,
      boardId,
      payload.plan.domainPlan
    );
    const hasStepFailure = stepResults.some((step) => !step.success);

    const boardMutationResults = hasStepFailure
      ? []
      : await applyBoardMutations(boardId, payload.plan.boardPreview);

    const summaryResult = summarizeResult(
      payload.plan,
      stepResults,
      boardMutationResults
    );

    const result: ApproveManifestPlanResult = {
      success: summaryResult.success,
      planId,
      summary: summaryResult.summary,
      stepResults,
      boardMutationResults,
      ...(summaryResult.success
        ? {}
        : { error: "One or more steps failed during execution" }),
    };

    await database.manifestIdempotency.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key: idempotencyKey,
        },
      },
      create: {
        tenantId,
        key: idempotencyKey,
        result: JSON.parse(JSON.stringify(result)),
        expiresAt: addHours(new Date(), 24),
      },
      update: {
        result: JSON.parse(JSON.stringify(result)),
        expiresAt: addHours(new Date(), 24),
      },
    });

    const nextPayload: ManifestPlanRecordPayload = {
      ...payload,
      state: result.success ? "approved" : "failed",
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      result: {
        success: result.success,
        summary: result.summary,
        stepResults: result.stepResults,
        boardMutationResults: result.boardMutationResults,
      },
    };

    await updateManifestPlanRecord({
      eventId,
      payload: nextPayload,
      published: true,
    });

    await createManifestPlanAuditEvent({
      tenantId,
      planId,
      payload: nextPayload,
    });

    return result;
  } catch (error) {
    return {
      success: false,
      planId,
      summary: "Plan approval failed",
      stepResults: [],
      boardMutationResults: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
