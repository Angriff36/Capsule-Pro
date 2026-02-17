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
  CostImpact,
  DomainCommandStep,
  ExecutionStrategy,
  ManifestPlanRecordPayload,
  RiskAssessment,
  RollbackStrategy,
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

export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface PlanPreviewResult {
  planId: string;
  dryRun: boolean;
  domainStepPreviews: StepPreviewResult[];
  boardMutationPreviews: MutationPreviewResult[];
  estimatedDuration: number;
  riskSummary: string;
  validation: ConfigValidationResult;
}

export interface StepPreviewResult {
  stepId: string;
  commandName: string;
  wouldSucceed: boolean;
  estimatedImpact: string;
  warnings: string[];
}

export interface MutationPreviewResult {
  mutationType: BoardMutation["type"];
  wouldSucceed: boolean;
  description: string;
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

async function resolveEmployeeIdFromStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<string | null> {
  const fromArgs = asString(step.args.employeeId);
  if (fromArgs) {
    return fromArgs;
  }

  if (
    step.entityType === "employee" &&
    step.entityId &&
    step.entityId !== "available_employee"
  ) {
    return step.entityId;
  }

  const employeeProjection = await database.boardProjection.findFirst({
    where: {
      tenantId: context.tenantId,
      boardId: context.boardId,
      entityType: "employee",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true },
  });

  return employeeProjection?.entityId ?? null;
}

async function resolveInventoryItemIdFromStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<string | null> {
  const fromArgs = asString(step.args.inventoryItemId);
  if (fromArgs) {
    return fromArgs;
  }

  if (step.entityType === "inventory_item" && step.entityId) {
    return step.entityId;
  }

  const inventoryProjection = await database.boardProjection.findFirst({
    where: {
      tenantId: context.tenantId,
      boardId: context.boardId,
      entityType: "inventory_item",
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { entityId: true },
  });

  return inventoryProjection?.entityId ?? null;
}

async function executeCreateTaskStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  const name = asString(step.args.name);
  if (!name) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Task name is required",
      error: "Missing required parameter: name",
    };
  }

  const eventId = await resolveEventIdFromStep(context, step);
  if (!eventId) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Event ID is required to create a task",
      error: "No event available - specify an event to associate the task with",
    };
  }

  const priorityStr = asString(step.args.priority) ?? "medium";
  const priorityMap: Record<string, number> = {
    low: 1,
    medium: 5,
    high: 7,
    urgent: 9,
  };
  const priority = priorityMap[priorityStr] ?? 5;
  const dueByDays = Math.max(1, Math.round(asNumber(step.args.dueByDays) ?? 7));
  const dueByDate = resolveFutureEventDate(dueByDays);
  const now = new Date();

  const taskId = crypto.randomUUID();

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.prep_tasks (
        id,
        tenant_id,
        event_id,
        task_type,
        name,
        status,
        priority,
        due_by_date,
        quantity_total,
        servings_total,
        quantity_completed,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (
        ${taskId},
        ${context.tenantId}::uuid,
        ${eventId},
        'prep',
        ${name},
        'pending',
        ${priority},
        ${dueByDate},
        1,
        1,
        0,
        ${now},
        ${now},
        NULL
      )
    `
  );

  const projectionResult = await addProjection(context.boardId, {
    entityType: "prep_task",
    entityId: taskId,
    positionX: 200,
    positionY: 200,
  });

  const projectionSuffix =
    projectionResult.success || !projectionResult.error
      ? ""
      : ` (board projection skipped: ${projectionResult.error})`;

  return {
    stepId: step.stepId,
    success: true,
    message: `Created task "${name}" (${taskId}).${projectionSuffix}`,
  };
}

async function executeAssignEmployeeStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  const employeeId = await resolveEmployeeIdFromStep(context, step);
  if (!employeeId) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Unable to resolve employee",
      error: "No employee available for assignment",
    };
  }

  const eventId = await resolveEventIdFromStep(context, step);
  const role = asString(step.args.role) ?? "staff";

  if (eventId) {
    const existing = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
        FROM tenant_events.event_staff
        WHERE tenant_id = ${context.tenantId}
          AND event_id = ${eventId}
          AND user_id = ${employeeId}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (existing.length > 0) {
      return {
        stepId: step.stepId,
        success: true,
        message: `Employee already assigned to event (${eventId}).`,
      };
    }

    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_events.event_staff (
          tenant_id,
          id,
          event_id,
          user_id,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${context.tenantId},
          gen_random_uuid(),
          ${eventId},
          ${employeeId},
          ${role},
          'confirmed',
          ${new Date()},
          ${new Date()}
        )
      `
    );

    return {
      stepId: step.stepId,
      success: true,
      message: `Assigned employee ${employeeId} to event ${eventId} as ${role}.`,
    };
  }

  return {
    stepId: step.stepId,
    success: false,
    message: "No event specified for employee assignment",
    error: "Event ID required for employee assignment",
  };
}

async function executeUpdateInventoryStep(
  context: DomainExecutionContext,
  step: DomainCommandStep
): Promise<StepExecutionResult> {
  const inventoryItemId = await resolveInventoryItemIdFromStep(context, step);
  if (!inventoryItemId) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Unable to resolve inventory item",
      error: "No inventory item available for update",
    };
  }

  const quantityChange = asNumber(step.args.quantityChange);
  const quantityAdjustment = asNumber(step.args.quantityAdjustment);
  const operation = asString(step.args.operation) ?? "set";

  if (quantityChange === undefined && quantityAdjustment === undefined) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Quantity change or adjustment is required",
      error: "Missing required parameter: quantityChange or quantityAdjustment",
    };
  }

  const currentItem = await database.$queryRaw<
    Array<{ id: string; quantity: number; name: string }>
  >(
    Prisma.sql`
      SELECT id, quantity, name
      FROM tenant_inventory.inventory_items
      WHERE id = ${inventoryItemId}
        AND tenant_id = ${context.tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (currentItem.length === 0) {
    return {
      stepId: step.stepId,
      success: false,
      message: "Inventory item not found",
      error: `Inventory item ${inventoryItemId} not found`,
    };
  }

  let newQuantity: number;
  if (operation === "add") {
    newQuantity =
      currentItem[0].quantity + (quantityAdjustment ?? quantityChange ?? 0);
  } else if (operation === "subtract") {
    newQuantity = Math.max(
      0,
      currentItem[0].quantity - (quantityAdjustment ?? quantityChange ?? 0)
    );
  } else {
    newQuantity = quantityChange ?? currentItem[0].quantity;
  }

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_inventory.inventory_items
      SET quantity = ${newQuantity},
          updated_at = ${new Date()}
      WHERE id = ${inventoryItemId}
        AND tenant_id = ${context.tenantId}
    `
  );

  return {
    stepId: step.stepId,
    success: true,
    message: `Updated inventory item ${currentItem[0].name}: ${currentItem[0].quantity} -> ${newQuantity}.`,
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

  if (
    normalized === "create_task" ||
    normalized === "add_task" ||
    normalized === "create_prep_task"
  ) {
    return executeCreateTaskStep(context, step);
  }

  if (
    normalized === "assign_employee" ||
    normalized === "assign_staff" ||
    normalized === "add_employee"
  ) {
    return executeAssignEmployeeStep(context, step);
  }

  if (
    normalized === "update_inventory" ||
    normalized === "adjust_inventory" ||
    normalized === "modify_inventory"
  ) {
    return executeUpdateInventoryStep(context, step);
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

/**
 * Validates execution strategy configuration for consistency and completeness.
 */
function validateExecutionStrategy(
  strategy: ExecutionStrategy | undefined,
  domainPlan: DomainCommandStep[]
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!strategy) {
    return errors; // Optional field, no validation needed
  }

  // Validate step references exist in domain plan
  const stepIds = new Set(domainPlan.map((step) => step.stepId));
  for (const stepRef of strategy.steps) {
    if (!stepIds.has(stepRef)) {
      errors.push({
        field: "executionStrategy.steps",
        message: `Step reference "${stepRef}" not found in domain plan`,
        severity: "error",
      });
    }
  }

  // Validate dependencies don't create cycles
  const dependencyGraph = new Map<string, string[]>();
  for (const dep of strategy.dependencies) {
    if (!stepIds.has(dep.before) || !stepIds.has(dep.after)) {
      continue; // Already reported as missing step
    }
    const existing = dependencyGraph.get(dep.before) ?? [];
    existing.push(dep.after);
    dependencyGraph.set(dep.before, existing);
  }

  // Check for cycles using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = dependencyGraph.get(node) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const stepId of stepIds) {
    if (!visited.has(stepId)) {
      if (hasCycle(stepId)) {
        errors.push({
          field: "executionStrategy.dependencies",
          message: "Circular dependency detected in execution strategy",
          severity: "error",
        });
        break;
      }
    }
  }

  // Validate timeout is reasonable (not too short or too long)
  if (strategy.timeout !== undefined) {
    if (strategy.timeout < 1000) {
      errors.push({
        field: "executionStrategy.timeout",
        message: "Timeout is too short (minimum 1000ms recommended)",
        severity: "warning",
      });
    }
    if (strategy.timeout > 300000) {
      // 5 minutes
      errors.push({
        field: "executionStrategy.timeout",
        message: "Timeout exceeds 5 minutes - consider breaking into smaller steps",
        severity: "warning",
      });
    }
  }

  // Validate retry policy
  if (strategy.retryPolicy) {
    if (strategy.retryPolicy.maxAttempts > 10) {
      errors.push({
        field: "executionStrategy.retryPolicy.maxAttempts",
        message: "Max retry attempts exceeds 10 - this may cause long delays",
        severity: "warning",
      });
    }
    if (strategy.retryPolicy.backoffMs < 100) {
      errors.push({
        field: "executionStrategy.retryPolicy.backoffMs",
        message: "Backoff is too short - minimum 100ms recommended",
        severity: "warning",
      });
    }
  }

  // Validate parallel batches
  if (
    strategy.approach === "parallel" &&
    strategy.parallelBatches &&
    strategy.parallelBatches > domainPlan.length
  ) {
    errors.push({
      field: "executionStrategy.parallelBatches",
      message: "Parallel batches exceeds number of domain steps",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validates rollback strategy configuration.
 */
function validateRollbackStrategy(
  strategy: RollbackStrategy | undefined
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!strategy) {
    return errors; // Optional field
  }

  // If rollback is enabled, validate steps are defined
  if (strategy.enabled && strategy.steps.length === 0) {
    if (strategy.strategy !== "manual") {
      errors.push({
        field: "rollbackStrategy.steps",
        message:
          "Rollback is enabled but no compensating steps are defined (except for manual strategy)",
        severity: "warning",
      });
    }
  }

  // Validate recovery time is reasonable
  if (strategy.estimatedRecoveryTime !== undefined) {
    if (strategy.estimatedRecoveryTime > 600000) {
      // 10 minutes
      errors.push({
        field: "rollbackStrategy.estimatedRecoveryTime",
        message:
          "Estimated recovery time exceeds 10 minutes - consider simplifying the plan",
        severity: "warning",
      });
    }
  }

  // Validate risks are documented
  if (strategy.enabled && strategy.risks.length === 0) {
    errors.push({
      field: "rollbackStrategy.risks",
      message: "Rollback is enabled but no risks are documented",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validates risk assessment configuration.
 */
function validateRiskAssessment(
  assessment: RiskAssessment | undefined
): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!assessment) {
    return errors; // Optional field
  }

  // High/critical severity should have mitigations
  if (
    (assessment.level === "high" || assessment.level === "critical") &&
    assessment.mitigations.length === 0
  ) {
    errors.push({
      field: "riskAssessment.mitigations",
      message: `${assessment.level} severity risk should have at least one mitigation`,
      severity: "warning",
    });
  }

  // Critical severity should have factors documented
  if (assessment.level === "critical" && assessment.factors.length === 0) {
    errors.push({
      field: "riskAssessment.factors",
      message: "Critical severity risk should document contributing factors",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validates cost impact configuration.
 */
function validateCostImpact(impact: CostImpact | undefined): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!impact) {
    return errors; // Optional field
  }

  // Validate financial delta consistency
  if (impact.financialDelta) {
    const { revenue, cost, profit } = impact.financialDelta;

    // Profit should roughly equal revenue - cost (within 10% tolerance for rounding)
    const expectedProfit = revenue - cost;
    if (profit !== 0 && expectedProfit !== 0) {
      const tolerance = Math.abs(expectedProfit) * 0.1;
      if (Math.abs(profit - expectedProfit) > tolerance) {
        errors.push({
          field: "costImpact.financialDelta",
          message:
            "Profit calculation is inconsistent with revenue and cost values",
          severity: "warning",
        });
      }
    }

    // Negative profit with positive revenue is a warning
    if (revenue > 0 && profit < 0) {
      errors.push({
        field: "costImpact.financialDelta.profit",
        message:
          "Plan shows negative profit despite positive revenue - verify cost estimates",
        severity: "warning",
      });
    }
  }

  // Validate cost breakdown totals match estimated cost
  if (impact.estimatedCost && impact.costBreakdown) {
    const breakdownTotal = Object.values(impact.costBreakdown).reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const tolerance = Math.abs(impact.estimatedCost) * 0.1;
    if (Math.abs(breakdownTotal - impact.estimatedCost) > tolerance) {
      errors.push({
        field: "costImpact.costBreakdown",
        message: "Cost breakdown total does not match estimated cost",
        severity: "warning",
      });
    }
  }

  return errors;
}

/**
 * Validates the complete plan configuration including execution strategy,
 * rollback strategy, risk assessment, and cost impact.
 */
export function validatePlanConfig(
  plan: SuggestedManifestPlan
): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationWarning[] = [];

  // Validate execution strategy
  errors.push(...validateExecutionStrategy(plan.executionStrategy, plan.domainPlan));

  // Validate rollback strategy
  errors.push(...validateRollbackStrategy(plan.rollbackStrategy));

  // Validate risk assessment
  errors.push(...validateRiskAssessment(plan.riskAssessment));

  // Validate cost impact
  errors.push(...validateCostImpact(plan.costImpact));

  // Separate errors and warnings
  const actualErrors = errors.filter((e) => e.severity === "error");
  const actualWarnings = errors.filter((e) => e.severity === "warning");

  for (const warning of actualWarnings) {
    warnings.push({
      field: warning.field,
      message: warning.message,
    });
  }

  return {
    valid: actualErrors.length === 0,
    errors: actualErrors,
    warnings,
  };
}

/**
 * Previews a manifest plan without executing it (dry run mode).
 * Validates configuration and simulates execution to identify potential issues.
 */
export async function previewManifestPlan(
  boardId: string,
  planId: string
): Promise<PlanPreviewResult> {
  const tenantId = await requireTenantId();

  const stored = await getPendingManifestPlan(tenantId, boardId, planId);
  if (!stored) {
    return {
      planId,
      dryRun: true,
      domainStepPreviews: [],
      boardMutationPreviews: [],
      estimatedDuration: 0,
      riskSummary: "Plan not found",
      validation: {
        valid: false,
        errors: [{ field: "planId", message: "Plan not found", severity: "error" }],
        warnings: [],
      },
    };
  }

  const { payload } = stored;
  const plan = payload.plan;

  // Validate configuration
  const validation = validatePlanConfig(plan);

  // Preview domain steps
  const domainStepPreviews: StepPreviewResult[] = [];
  let estimatedDuration = 0;

  for (const step of plan.domainPlan) {
    const preview = await previewDomainStep(tenantId, boardId, step);
    domainStepPreviews.push(preview);
    estimatedDuration += estimateStepDuration(step);
  }

  // Preview board mutations
  const boardMutationPreviews: MutationPreviewResult[] = [];
  for (const mutation of plan.boardPreview) {
    boardMutationPreviews.push(previewBoardMutation(mutation));
  }

  // Generate risk summary
  const riskSummary = generateRiskSummary(
    plan.riskAssessment,
    validation,
    domainStepPreviews
  );

  return {
    planId,
    dryRun: true,
    domainStepPreviews,
    boardMutationPreviews,
    estimatedDuration,
    riskSummary,
    validation,
  };
}

/**
 * Previews a single domain step without executing it.
 */
async function previewDomainStep(
  tenantId: string,
  _boardId: string,
  step: DomainCommandStep
): Promise<StepPreviewResult> {
  const warnings: string[] = [];
  let wouldSucceed = true;
  let estimatedImpact = "";

  const normalized = step.commandName.trim().toLowerCase();

  // Check for required arguments based on command type
  if (normalized === "create_event") {
    estimatedImpact = "Will create a new event in the database";
    if (!step.args.title) {
      warnings.push("No title provided - will use default 'AI Planned Event'");
    }
  } else if (
    normalized === "link_menu" ||
    normalized === "add_dish_to_event" ||
    normalized === "link_menu_item"
  ) {
    estimatedImpact = "Will link a dish to an event menu";

    // Check if we can resolve the event
    if (step.args.eventId) {
      const event = await database.event.findFirst({
        where: { id: asString(step.args.eventId), tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!event) {
        warnings.push("Specified event not found - may use fallback");
      }
    }

    // Check if we can resolve the dish
    if (step.args.dishId) {
      const dish = await database.dish.findFirst({
        where: { id: asString(step.args.dishId), tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!dish) {
        warnings.push("Specified dish not found - may use fallback");
      }
    }
  } else if (
    normalized === "create_task" ||
    normalized === "add_task" ||
    normalized === "create_prep_task"
  ) {
    estimatedImpact = "Will create a new prep task";
    if (!step.args.name) {
      wouldSucceed = false;
      warnings.push("Task name is required");
    }
    if (!step.args.eventId) {
      warnings.push("No event specified - will attempt to resolve from board context");
    }
  } else if (
    normalized === "assign_employee" ||
    normalized === "assign_staff" ||
    normalized === "add_employee"
  ) {
    estimatedImpact = "Will assign an employee to an event";
    if (!step.args.employeeId && step.entityType !== "employee") {
      warnings.push("No employee specified - will attempt to resolve from board context");
    }
  } else if (
    normalized === "update_inventory" ||
    normalized === "adjust_inventory" ||
    normalized === "modify_inventory"
  ) {
    estimatedImpact = "Will update inventory quantity";
    if (
      step.args.quantityChange === undefined &&
      step.args.quantityAdjustment === undefined
    ) {
      wouldSucceed = false;
      warnings.push("Quantity change or adjustment is required");
    }
  } else if (isBoardCommandId(step.commandName)) {
    estimatedImpact = `Will execute board command: ${step.commandName}`;
  } else {
    wouldSucceed = false;
    estimatedImpact = "Unknown command - will fail";
    warnings.push(`Unsupported command: ${step.commandName}`);
  }

  return {
    stepId: step.stepId,
    commandName: step.commandName,
    wouldSucceed,
    estimatedImpact,
    warnings,
  };
}

/**
 * Estimates duration in milliseconds for a domain step.
 */
function estimateStepDuration(step: DomainCommandStep): number {
  const normalized = step.commandName.trim().toLowerCase();

  // Database operations are typically fast
  if (normalized === "create_event") return 500;
  if (normalized.includes("link") || normalized.includes("menu")) return 300;
  if (normalized.includes("task")) return 400;
  if (normalized.includes("employee") || normalized.includes("assign")) return 300;
  if (normalized.includes("inventory")) return 350;

  // Default estimate
  return 500;
}

/**
 * Previews a board mutation without executing it.
 */
function previewBoardMutation(mutation: BoardMutation): MutationPreviewResult {
  switch (mutation.type) {
    case "addNode":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will add ${mutation.entityType} node at (${mutation.positionX}, ${mutation.positionY})`,
      };
    case "removeNode":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will remove node ${mutation.projectionId}`,
      };
    case "moveNode":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will move node ${mutation.projectionId} to (${mutation.positionX}, ${mutation.positionY})`,
      };
    case "addEdge":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will add edge from ${mutation.sourceProjectionId} to ${mutation.targetProjectionId}`,
      };
    case "removeEdge":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will remove edge ${mutation.edgeId}`,
      };
    case "highlightNode":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will highlight node ${mutation.projectionId}`,
      };
    case "annotate":
      return {
        mutationType: mutation.type,
        wouldSucceed: true,
        description: `Will add annotation: ${mutation.label}`,
      };
  }
}

/**
 * Generates a human-readable risk summary for the preview.
 */
function generateRiskSummary(
  riskAssessment: RiskAssessment | undefined,
  validation: ConfigValidationResult,
  stepPreviews: StepPreviewResult[]
): string {
  const parts: string[] = [];

  // Add validation summary
  if (!validation.valid) {
    parts.push(`${validation.errors.length} configuration error(s) found`);
  }
  if (validation.warnings.length > 0) {
    parts.push(`${validation.warnings.length} warning(s)`);
  }

  // Add risk assessment summary
  if (riskAssessment) {
    parts.push(`Risk level: ${riskAssessment.level}`);
    if (riskAssessment.mitigations.length > 0) {
      parts.push(`${riskAssessment.mitigations.length} mitigation(s) defined`);
    }
  }

  // Add step failure summary
  const failingSteps = stepPreviews.filter((s) => !s.wouldSucceed);
  if (failingSteps.length > 0) {
    parts.push(`${failingSteps.length} step(s) may fail`);
  }

  if (parts.length === 0) {
    return "Plan appears ready for execution";
  }

  return parts.join("; ");
}

export async function approveManifestPlan(
  boardId: string,
  planId: string,
  prerequisiteAnswers: Record<string, string> = {},
  options?: { skipValidation?: boolean }
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

    // Validate configuration before execution
    if (!options?.skipValidation) {
      const validation = validatePlanConfig(payload.plan);
      if (!validation.valid) {
        const errorMessages = validation.errors.map((e) => `${e.field}: ${e.message}`);
        return {
          success: false,
          planId,
          summary: "Configuration validation failed",
          stepResults: [],
          boardMutationResults: [],
          error: `Config validation errors: ${errorMessages.join("; ")}`,
        };
      }
    }

    // Handle dry_run mode - return preview without executing
    if (payload.plan.execution.mode === "dry_run") {
      const preview = await previewManifestPlan(boardId, planId);
      const previewStepResults: StepExecutionResult[] = preview.domainStepPreviews.map((p) => ({
        stepId: p.stepId,
        success: p.wouldSucceed,
        message: p.estimatedImpact,
        ...(p.warnings.length > 0 ? { error: p.warnings.join("; ") } : {}),
      }));
      const previewMutationResults: BoardMutationResult[] = preview.boardMutationPreviews.map((m) => ({
        mutationType: m.mutationType,
        success: m.wouldSucceed,
        message: m.description,
      }));

      return {
        success: preview.validation.valid && previewStepResults.every((s) => s.success),
        planId,
        summary: `Dry run preview: ${preview.riskSummary}`,
        stepResults: previewStepResults,
        boardMutationResults: previewMutationResults,
        ...(preview.validation.warnings.length > 0
          ? { error: `Warnings: ${preview.validation.warnings.map((w) => w.message).join("; ")}` }
          : {}),
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
