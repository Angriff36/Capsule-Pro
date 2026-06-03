/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */

import type { Store } from "@angriff36/manifest";
import type {
  AllergenWarning,
  KitchenTask,
  KitchenTaskClaim,
  Menu,
  MenuDish,
  PrepList,
  PrepListItem,
  PrepTask,
  PrepTaskPlanWorkflow,
  PrismaClient,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeVersion,
  Station,
} from "@repo/database/standalone";
import { Prisma } from "@repo/database/standalone";
import { GenericPrismaStore } from "./prisma-stores/generic-prisma-store";
import {
  ContainerPrismaStore,
  PrepMethodPrismaStore,
} from "./prisma-stores/broken-read-batch01-prep-container";
import {
  WasteEntryPrismaStore,
  WorkflowPrismaStore,
} from "./prisma-stores/broken-read-batch01-waste-workflow";
import {
  ApiKeyPrismaStore,
  BattleBoardPrismaStore,
  BudgetAlertPrismaStore,
} from "./prisma-stores/broken-read-batch02-api-battle-budget";
import {
  AdminChatParticipantPrismaStore,
  AdminTaskPrismaStore,
} from "./prisma-stores/broken-read-batch02-participant-task";
import {
  BudgetLineItemPrismaStore,
  BulkOrderRulePrismaStore,
  CateringOrderPrismaStore,
} from "./prisma-stores/broken-read-batch03-budget-bulk-catering";
import {
  ChartOfAccountPrismaStore,
  ClientPrismaStore,
} from "./prisma-stores/broken-read-batch03-chart-client";
import {
  ClientContactPrismaStore,
  ClientInteractionPrismaStore,
  ClientPreferencePrismaStore,
} from "./prisma-stores/broken-read-batch04-client-trio";
import {
  CommandBoardCardPrismaStore,
  CommandBoardPrismaStore,
} from "./prisma-stores/broken-read-batch04-command-board";
import {
  CommandBoardConnectionPrismaStore,
  CommandBoardGroupPrismaStore,
  CommandBoardLayoutPrismaStore,
} from "./prisma-stores/broken-read-batch05-command-board";
import {
  ContractSignaturePrismaStore,
  CycleCountRecordPrismaStore,
} from "./prisma-stores/broken-read-batch05-contract-cycle";
import {
  CycleCountSessionPrismaStore,
  DishPrismaStore,
} from "./prisma-stores/broken-read-batch06-cycle-dish";
export { DishPrismaStore };

import {
  EmailTemplatePrismaStore,
  EmailWorkflowPrismaStore,
} from "./prisma-stores/broken-read-batch06-email";
export { EmailTemplatePrismaStore };

import { EmployeeAvailabilityPrismaStore } from "./prisma-stores/broken-read-batch06-employee-availability";
import {
  EmployeeCertificationPrismaStore,
  EmployeeDeductionPrismaStore,
} from "./prisma-stores/broken-read-batch07-employee";
import {
  EventBudgetPrismaStore,
  EventContractPrismaStore,
  EventPrismaStore,
} from "./prisma-stores/broken-read-batch07-event";
export { EventPrismaStore };

import { EventDishPrismaStore } from "./prisma-stores/broken-read-batch08-event-dish";
import {
  EventGuestPrismaStore,
  EventImportPrismaStore,
} from "./prisma-stores/broken-read-batch08-event-guest-import";
import {
  EventProfitabilityPrismaStore,
  EventReportPrismaStore,
} from "./prisma-stores/broken-read-batch08-event-profit-report";
import { EventSummaryPrismaStore } from "./prisma-stores/broken-read-batch09-event-staff-summary";
import {
  EventStaffPrismaStore,
  StaffMemberPrismaStore,
} from "./prisma-stores/staff-slice";
import { IngredientPrismaStore } from "./prisma-stores/broken-read-batch09-ingredient";
export { IngredientPrismaStore };

import {
  InventoryItemPrismaStore,
  InventorySupplierPrismaStore,
} from "./prisma-stores/broken-read-batch09-inventory";
export { InventoryItemPrismaStore };

import { InventoryTransactionPrismaStore } from "./prisma-stores/broken-read-batch10-inventory-transaction";
import {
  LaborBudgetPrismaStore,
  LeadPrismaStore,
} from "./prisma-stores/broken-read-batch10-labor-budget-lead";
import { OverrideAuditPrismaStore } from "./prisma-stores/broken-read-batch11-override-audit";
import {
  PayrollApprovalHistoryPrismaStore,
  PayrollPeriodPrismaStore,
  PayrollRunPrismaStore,
} from "./prisma-stores/broken-read-batch11-payroll";
import {
  PrepCommentPrismaStore,
  PricingTierPrismaStore,
} from "./prisma-stores/broken-read-batch12-prep-pricing";
import {
  TimecardEditRequestPrismaStore,
  TimeEntryPrismaStore,
  TrainingAssignmentPrismaStore,
} from "./prisma-stores/broken-read-batch12-staff-time";
import {
  ProposalLineItemPrismaStore,
  PurchaseOrderItemPrismaStore,
} from "./prisma-stores/broken-read-batch13-order-proposal";
import { ScheduleShiftPrismaStore } from "./prisma-stores/broken-read-batch13-schedule-shipment";
import {
  TrainingModulePrismaStore,
  VarianceReportPrismaStore,
} from "./prisma-stores/broken-read-batch13-training-variance";
import {
  VendorCatalogPrismaStore,
  VendorContractPrismaStore,
} from "./prisma-stores/broken-read-batch13-vendor";
import {
  CollectionActionPrismaStore,
  CollectionCasePrismaStore,
  CollectionPaymentPlanPrismaStore,
} from "./prisma-stores/broken-read-batch14-collections";
import {
  InvoicePrismaStore,
  PaymentMethodPrismaStore,
  PaymentPrismaStore,
} from "./prisma-stores/broken-read-batch14-invoice-payment";
import {
  RolePolicyPrismaStore,
  TimeOffRequestPrismaStore,
} from "./prisma-stores/broken-read-batch15-rolepolicy-timeoff";
import { InventoryTransferPrismaStore } from "./prisma-stores/broken-read-batch16-inventory-transfer";
import { NotificationPrismaStore } from "./prisma-stores/broken-read-notification-parent";
import { PurchaseOrderPrismaStore } from "./prisma-stores/broken-read-po-parent";
import { ProposalPrismaStore } from "./prisma-stores/broken-read-proposal-parent";
import { PurchaseRequisitionPrismaStore } from "./prisma-stores/broken-read-requisition-parent";
import { SchedulePrismaStore } from "./prisma-stores/broken-read-schedule-parent";
import { ShipmentPrismaStore } from "./prisma-stores/broken-read-shipment-parent";

/**
 * Report a silent store error to Sentry without blocking the return path.
 * Uses dynamic import so this module doesn't hard-depend on @sentry/nextjs.
 */
function reportStoreError(error: unknown, store: string, op: string): void {
  import("@sentry/node")
    .then(({ captureException }) => {
      captureException(error, {
        tags: { source: "prisma-store", store, op },
      });
    })
    .catch(() => {
      // Sentry not available — swallow to avoid infinite loops
    });
}

/** Shorthand used inside Store classes — derives the store name from the class name. */
function reportOp(
  self: { constructor: { name: string } },
  op: string,
  error: unknown
): void {
  reportStoreError(error, self.constructor.name, op);
}

export interface EntityInstance {
  id: string;
  [key: string]: unknown;
}

interface PrepTaskWithClaims extends PrepTask {
  claims: KitchenTaskClaim[];
}

/**
 * Prisma-backed store for PrepTask entities
 *
 * Maps Manifest PrepTask entities to the Prisma PrepTask and KitchenTaskClaim tables.
 * The Manifest entity has inline claimedBy/claimedAt fields, while Prisma uses a
 * separate KitchenTaskClaim table for tracking claims.
 */
export class PrepTaskPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    // Fetch all prep tasks for this tenant
    const tasks = await this.prisma.prepTask.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });

    // Return mapped entities (claims will be fetched on-demand if needed)
    return tasks.map((task) => this.mapToManifestEntity(task as PrepTask, []));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const task = await this.prisma.prepTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });

    if (!task) {
      return undefined;
    }

    // Fetch active claims
    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(task, claims);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const task = await this.prisma.prepTask.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        eventId: data.eventId as string,
        locationId: (data.locationId as string) || "",
        name: data.name as string,
        taskType: (data.taskType as string) || "prep",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        quantityTotal: data.quantityTotal as number,
        quantityUnitId: (data.quantityUnitId as number) ?? null,
        quantityCompleted: (data.quantityCompleted as number) || 0,
        servingsTotal: data.servingsTotal as number | null,
        startByDate: data.startByDate
          ? new Date(data.startByDate as number)
          : new Date(),
        dueByDate: data.dueByDate
          ? new Date(data.dueByDate as number)
          : new Date(),
        notes: data.notes as string | null,
      },
    });

    // If task has claim info, create a claim record
    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: task.id,
          employeeId: data.claimedBy as string,
          claimedAt: new Date(data.claimedAt as number),
        },
      });
    }

    return this.mapToManifestEntity(task, []);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    // First, get the existing task
    const existing = await this.prisma.prepTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return undefined;
    }

    // Update the task
    const updated = await this.prisma.prepTask.update({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
      data: {
        status: data.status as string | undefined,
        priority: data.priority as number | undefined,
        quantityCompleted: data.quantityCompleted as number | undefined,
        quantityTotal: data.quantityTotal as number | undefined,
        actualMinutes: data.actualMinutes as number | undefined,
        notes: data.notes as string | undefined,
        updatedAt: new Date(),
      },
    });

    // Handle claim changes
    const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
    });

    const newClaimedBy = data.claimedBy as string | undefined;

    if (newClaimedBy && !activeClaim) {
      // Create new claim
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    } else if (!newClaimedBy && activeClaim && data.status === "open") {
      // Release existing claim - use compound unique key
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: {
          releasedAt: new Date(),
          releaseReason: data.releaseReason as string | undefined,
        },
      });
    } else if (
      newClaimedBy &&
      activeClaim &&
      newClaimedBy !== activeClaim.employeeId
    ) {
      // Reassign: release old claim, create new one
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: { releasedAt: new Date() },
      });

      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    }

    return this.mapToManifestEntity(updated, []);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prepTask.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepTask.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Map Prisma PrepTask to Manifest PrepTask entity
   */
  private mapToManifestEntity(
    task: PrepTask,
    claims: KitchenTaskClaim[]
  ): EntityInstance {
    const activeClaim = claims[0];

    return {
      id: task.id,
      tenantId: task.tenantId,
      eventId: task.eventId,
      name: task.name,
      taskType: task.taskType,
      status: this.mapStatus(task.status),
      priority: task.priority,
      quantityTotal: Number(task.quantityTotal),
      quantityUnitId: task.quantityUnitId ?? "",
      quantityCompleted: Number(task.quantityCompleted),
      servingsTotal: task.servingsTotal ?? 0,
      startByDate: task.startByDate ? task.startByDate.getTime() : 0,
      dueByDate: task.dueByDate ? task.dueByDate.getTime() : 0,
      notes: task.notes ?? "",
      stationId: "",
      claimedBy: activeClaim?.employeeId ?? "",
      claimedAt: activeClaim?.claimedAt
        ? activeClaim.claimedAt.getTime()
        : 0,
      createdAt: task.createdAt?.getTime() ?? 0,
      updatedAt: task.updatedAt?.getTime() ?? 0,
    };
  }

  /**
   * Map Prisma status to Manifest status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "open",
      in_progress: "in_progress",
      done: "done",
      completed: "done",
      canceled: "canceled",
    };
    return statusMap[status] ?? status;
  }
}

/**
 * Prisma-backed store for Recipe entities
 *
 * Maps Manifest Recipe entities to the Prisma Recipe table.
 */
export class RecipePrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return recipes.map((recipe) => this.mapToManifestEntity(recipe));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return recipe ? this.mapToManifestEntity(recipe) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const recipe = await this.prisma.recipe.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        name: data.name as string,
        category: (data.category as string) || null,
        cuisineType: (data.cuisineType as string) || null,
        description: (data.description as string) || null,
        tags: (data.tags as string[]) || [],
        isActive: (data.isActive as boolean) ?? true,
      },
    });
    return this.mapToManifestEntity(recipe);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.recipe.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          name: data.name as string | undefined,
          category: data.category as string | null | undefined,
          cuisineType: data.cuisineType as string | null | undefined,
          description: data.description as string | null | undefined,
          tags: data.tags as string[] | undefined,
          isActive: data.isActive as boolean | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.recipe.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.recipe.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(recipe: Recipe): EntityInstance {
    return {
      id: recipe.id,
      tenantId: recipe.tenantId,
      name: recipe.name,
      category: recipe.category ?? "",
      cuisineType: recipe.cuisineType ?? "",
      description: recipe.description ?? "",
      tags: Array.isArray(recipe.tags) ? recipe.tags.join(",") : "",
      isActive: recipe.isActive,
      hasVersion: true,
      tagCount: Array.isArray(recipe.tags) ? recipe.tags.length : 0,
    };
  }
}

/**
 * Prisma-backed store for RecipeVersion entities
 *
 * Maps Manifest RecipeVersion entities to the Prisma RecipeVersion table.
 */
export class RecipeVersionPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const versions = await this.prisma.recipeVersion.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return versions.map((version) => this.mapToManifestEntity(version));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const version = await this.prisma.recipeVersion.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return version ? this.mapToManifestEntity(version) : undefined;
  }

  /**
   * Get the latest RecipeVersion for a specific recipe (by versionNumber DESC).
   * This replaces the need for raw SQL queries like MAX(version_number).
   */
  async getLatestByRecipeId(
    recipeId: string
  ): Promise<EntityInstance | undefined> {
    const version = await this.prisma.recipeVersion.findFirst({
      where: { tenantId: this.tenantId, recipeId, deletedAt: null },
      orderBy: { versionNumber: "desc" },
    });
    return version ? this.mapToManifestEntity(version) : undefined;
  }

  /**
   * Get all versions for a specific recipe, ordered by version number descending.
   */
  async getByRecipeId(recipeId: string): Promise<EntityInstance[]> {
    const versions = await this.prisma.recipeVersion.findMany({
      where: { tenantId: this.tenantId, recipeId, deletedAt: null },
      orderBy: { versionNumber: "desc" },
    });
    return versions.map((version) => this.mapToManifestEntity(version));
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const version = await this.prisma.recipeVersion.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        recipeId: data.recipeId as string,
        name: data.name as string,
        category: (data.category as string) || null,
        cuisineType: (data.cuisineType as string) || null,
        description: (data.description as string) || null,
        tags: toStringArray(data.tags),
        versionNumber: (data.versionNumber as number) || 1,
        yieldQuantity: data.yieldQuantity as number,
        yieldUnitId: data.yieldUnitId as number,
        yieldDescription: (data.yieldDescription as string) || null,
        prepTimeMinutes: (data.prepTimeMinutes as number) || null,
        cookTimeMinutes: (data.cookTimeMinutes as number) || null,
        restTimeMinutes: (data.restTimeMinutes as number) || null,
        difficultyLevel: (data.difficultyLevel as number) || null,
        instructions: (data.instructions as string) || null,
        notes: (data.notes as string) || null,
      },
    });
    return this.mapToManifestEntity(version);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.recipeVersion.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          yieldQuantity: data.yieldQuantity as number | undefined,
          yieldUnitId: data.yieldUnitId as number | undefined,
          prepTimeMinutes: data.prepTimeMinutes as number | null | undefined,
          cookTimeMinutes: data.cookTimeMinutes as number | null | undefined,
          restTimeMinutes: data.restTimeMinutes as number | null | undefined,
          difficultyLevel: data.difficultyLevel as number | null | undefined,
          instructions: data.instructions as string | null | undefined,
          notes: data.notes as string | null | undefined,
          totalCost: data.totalCost as number | undefined,
          costPerYield: data.costPerYield as number | undefined,
          costCalculatedAt:
            data.totalCost !== undefined ? new Date() : undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.recipeVersion.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.recipeVersion.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(version: RecipeVersion): EntityInstance {
    const prepTime = version.prepTimeMinutes ?? 0;
    const cookTime = version.cookTimeMinutes ?? 0;
    const restTime = version.restTimeMinutes ?? 0;

    return {
      id: version.id,
      tenantId: version.tenantId,
      recipeId: version.recipeId,
      name: version.name,
      category: version.category ?? "",
      cuisineType: version.cuisineType ?? "",
      description: version.description ?? "",
      tags: typeof version.tags === "string" ? version.tags : "",
      versionNumber: version.versionNumber,
      yieldQuantity: Number(version.yieldQuantity),
      yieldUnitId: version.yieldUnitId,
      yieldDescription: version.yieldDescription ?? "",
      prepTimeMinutes: prepTime,
      cookTimeMinutes: cookTime,
      restTimeMinutes: restTime,
      difficultyLevel: version.difficultyLevel ?? 1,
      instructions: version.instructions ?? "",
      notes: version.notes ?? "",
      ingredientCount: 0, // Would need to query recipe_ingredients table
      stepCount: 0, // Would need to query RecipeStep table
      totalCost: Number(version.totalCost) || 0,
      costPerYield: Number(version.costPerYield) || 0,
      createdAt: version.createdAt?.getTime() ?? 0,
      totalTimeMinutes: prepTime + cookTime + restTime,
      isVersion1: version.versionNumber === 1,
      isHighDifficulty: (version.difficultyLevel ?? 1) >= 4,
    };
  }
}

/**
 * Prisma-backed store for RecipeIngredient entities
 *
 * Maps Manifest RecipeIngredient entities to the Prisma RecipeIngredient table.
 */
export class RecipeIngredientPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const ingredients = await this.prisma.recipeIngredient.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return ingredients.map((ingredient) =>
      this.mapToManifestEntity(ingredient)
    );
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const ingredient = await this.prisma.recipeIngredient.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return ingredient ? this.mapToManifestEntity(ingredient) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const ingredient = await this.prisma.recipeIngredient.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        recipeVersionId: data.recipeVersionId as string,
        ingredientId: data.ingredientId as string,
        quantity: data.quantity as number,
        unitId: data.unitId as number,
        preparationNotes: (data.preparationNotes as string) || null,
        isOptional: data.isOptional as boolean,
        sortOrder: (data.sortOrder as number) || 0,
        wasteFactor: (data.wasteFactor as number) ?? 1.0,
      },
    });
    return this.mapToManifestEntity(ingredient);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.recipeIngredient.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          quantity: data.quantity as number | undefined,
          unitId: data.unitId as number | undefined,
          wasteFactor: data.wasteFactor as number | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.recipeIngredient.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.recipeIngredient.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(ingredient: RecipeIngredient): EntityInstance {
    return {
      id: ingredient.id,
      tenantId: ingredient.tenantId,
      recipeVersionId: ingredient.recipeVersionId,
      ingredientId: ingredient.ingredientId,
      quantity: Number(ingredient.quantity),
      unitId: ingredient.unitId,
      preparationNotes: ingredient.preparationNotes ?? "",
      isOptional: ingredient.isOptional,
      wasteFactor: Number(ingredient.wasteFactor),
      sortOrder: ingredient.sortOrder,
    };
  }
}

/**
 * Prisma-backed store for RecipeStep entities
 *
 * Maps Manifest RecipeStep entities to the Prisma RecipeStep table.
 * Note: Prisma model uses snake_case (RecipeStep).
 */
export class RecipeStepPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const steps = await this.prisma.recipeStep.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return steps.map((step) => this.mapToManifestEntity(step));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const step = await this.prisma.recipeStep.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return step ? this.mapToManifestEntity(step) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const step = await this.prisma.recipeStep.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        recipeVersionId: data.recipeVersionId as string,
        stepNumber: data.stepNumber as number,
        instruction: data.instruction as string,
        durationMinutes: (data.durationMinutes as number) || null,
        temperatureValue: (data.temperatureValue as number) || null,
        temperatureUnit: (data.temperatureUnit as string) || null,
        equipmentNeeded: toStringArray(data.equipmentNeeded),
        tips: (data.tips as string) || null,
        videoUrl: (data.videoUrl as string) || null,
        imageUrl: (data.imageUrl as string) || null,
      },
    });
    return this.mapToManifestEntity(step);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.recipeStep.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          instruction: data.instruction as string | undefined,
          durationMinutes: data.durationMinutes as number | null | undefined,
          tips: data.tips as string | null | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.recipeStep.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.recipeStep.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(step: RecipeStep): EntityInstance {
    return {
      id: step.id,
      tenantId: step.tenantId,
      recipeVersionId: step.recipeVersionId,
      stepNumber: step.stepNumber,
      instruction: step.instruction,
      durationMinutes: step.durationMinutes ?? 0,
      temperatureValue: step.temperatureValue
        ? Number(step.temperatureValue)
        : 0,
      temperatureUnit: step.temperatureUnit ?? "",
      equipmentNeeded: step.equipmentNeeded ?? "",
      tips: step.tips ?? "",
      videoUrl: step.videoUrl ?? "",
      imageUrl: step.imageUrl ?? "",
    };
  }
}

/**
 * Prisma-backed store for KitchenTask entities
 *
 * Maps Manifest KitchenTask entities to the Prisma KitchenTask table.
 * Unlike PrepTask, KitchenTask is a general-purpose task (not event-driven).
 * Status values pass through directly (no remapping) since the manifest
 * uses the same values as the DB: pending, in_progress, done, cancelled.
 */
export class KitchenTaskPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const tasks = (await this.prisma.kitchenTask.findMany({
      where: { tenantId: this.tenantId },
    })) as KitchenTask[];

    // Fetch claims in batch (not N+1 - uses single IN query)
    const taskIds = tasks.map((t) => t.id);
    const claims =
      taskIds.length > 0
        ? await this.prisma.kitchenTaskClaim.findMany({
            where: {
              tenantId: this.tenantId,
              taskId: { in: taskIds },
              releasedAt: null,
            },
            orderBy: { claimedAt: "desc" },
          })
        : [];

    const claimsByTaskId = new Map<string, KitchenTaskClaim[]>();
    for (const claim of claims) {
      const existing = claimsByTaskId.get(claim.taskId) || [];
      existing.push(claim);
      claimsByTaskId.set(claim.taskId, existing);
    }

    return tasks.map((task) =>
      this.mapToManifestEntity(task, claimsByTaskId.get(task.id) || [])
    );
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const task = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!task) {
      console.error(
        `[KitchenTaskPrismaStore] getById(${id}) returned null for tenant ${this.tenantId}`
      );
      return undefined;
    }

    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(task, claims);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const task = await this.prisma.kitchenTask.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        title: (data.title as string) || "",
        summary: (data.summary as string) || "",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        complexity: (data.complexity as number) || 5,
        tags: toStringArray(data.tags),
        dueDate: data.dueDate ? new Date(data.dueDate as number) : undefined,
        completedAt: data.completedAt
          ? new Date(data.completedAt as number)
          : undefined,
      },
    });

    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: task.id,
          employeeId: data.claimedBy as string,
          claimedAt: new Date(data.claimedAt as number),
        },
      });
    }

    return this.mapToManifestEntity(task, []);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!existing) {
      console.error(
        `[KitchenTaskPrismaStore] update(${id}) — task not found for tenant ${this.tenantId}`
      );
      return undefined;
    }

    const updated = await this.prisma.kitchenTask.update({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
      data: {
        status: data.status as string | undefined,
        priority: data.priority as number | undefined,
        complexity: data.complexity as number | undefined,
        title: data.title as string | undefined,
        summary: data.summary as string | undefined,
        tags: toStringArrayOrUndefined(data.tags),
        dueDate: data.dueDate ? new Date(data.dueDate as number) : undefined,
        completedAt: data.completedAt
          ? new Date(data.completedAt as number)
          : undefined,
        updatedAt: new Date(),
      },
    });

    const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
    });

    const newClaimedBy = data.claimedBy as string | undefined;

    if (newClaimedBy && !activeClaim) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    } else if (!newClaimedBy && activeClaim) {
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: {
          releasedAt: new Date(),
          releaseReason: data.releaseReason as string | undefined,
        },
      });
    } else if (
      newClaimedBy &&
      activeClaim &&
      newClaimedBy !== activeClaim.employeeId
    ) {
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: { releasedAt: new Date() },
      });

      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    }

    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(updated, claims);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.kitchenTask.delete({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
    });

    return true;
  }

  async clear(): Promise<void> {
    // No-op for Prisma stores — we don't bulk-delete production data
  }

  private mapToManifestEntity(
    task: KitchenTask,
    claims: KitchenTaskClaim[] = []
  ): EntityInstance {
    const activeClaim = claims[0];

    return {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      summary: task.summary,
      status: task.status, // No remapping — manifest uses same values as DB
      priority: task.priority,
      complexity: task.complexity,
      tags: typeof task.tags === "string" ? task.tags : "",
      dueDate: task.dueDate ? task.dueDate.getTime() : 0,
      completedAt: task.completedAt ? task.completedAt.getTime() : 0,
      claimedBy: activeClaim?.employeeId ?? "",
      claimedAt: activeClaim?.claimedAt.getTime() ?? 0,
      createdAt: task.createdAt?.getTime() ?? 0,
      updatedAt: task.updatedAt?.getTime() ?? 0,
    };
  }
}

/**
 * Prisma-backed store for AllergenWarning entities
 *
 * Maps Manifest AllergenWarning entities to the Prisma AllergenWarning table.
 * Handles the conversion between Manifest string properties (allergens, affectedGuests)
 * and Prisma array types.
 */
export class AllergenWarningPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const warnings = await this.prisma.allergenWarning.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return warnings.map((warning) => this.mapToManifestEntity(warning));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const warning = await this.prisma.allergenWarning.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return warning ? this.mapToManifestEntity(warning) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const warning = await this.prisma.allergenWarning.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        eventId: data.eventId as string,
        dishId: (data.dishId as string) || null,
        warningType: data.warningType as string,
        allergens: toStringArray(data.allergens),
        affectedGuests: toStringArray(data.affectedGuests),
        severity: (data.severity as string) || "warning",
        isAcknowledged: (data.isAcknowledged as boolean) ?? false,
        acknowledgedBy: (data.acknowledgedBy as string) || null,
        acknowledgedAt: data.acknowledgedAt
          ? new Date(data.acknowledgedAt as number)
          : null,
        overrideReason: (data.overrideReason as string) || null,
        resolved: (data.resolved as boolean) ?? false,
        resolvedAt: data.resolvedAt
          ? new Date(data.resolvedAt as number)
          : null,
        notes: (data.notes as string) || null,
      },
    });
    return this.mapToManifestEntity(warning);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.allergenWarning.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          isAcknowledged: data.isAcknowledged as boolean | undefined,
          acknowledgedBy: data.acknowledgedBy as string | null | undefined,
          acknowledgedAt: data.acknowledgedAt
            ? new Date(data.acknowledgedAt as number)
            : undefined,
          overrideReason: data.overrideReason as string | null | undefined,
          resolved: data.resolved as boolean | undefined,
          resolvedAt: data.resolvedAt
            ? new Date(data.resolvedAt as number)
            : undefined,
          notes: data.notes as string | null | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.allergenWarning.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.allergenWarning.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Normalise any incoming value to a comma-separated string for String? columns.
   * Accepts string (passthrough), string[] (join), or null/undefined (empty string).
   */
  private toCommaString(value: unknown): string {
    if (Array.isArray(value)) {
      return (value as string[]).join(",");
    }
    if (typeof value === "string") {
      return value;
    }
    return "";
  }


  private mapToManifestEntity(warning: AllergenWarning): EntityInstance {
    return {
      id: warning.id,
      tenantId: warning.tenantId,
      eventId: warning.eventId ?? "",
      dishId: warning.dishId ?? "",
      warningType: warning.warningType ?? "",
      allergens: warning.allergens ?? "",
      affectedGuests: warning.affectedGuests ?? "",
      severity: warning.severity ?? "warning",
      isAcknowledged: warning.isAcknowledged ?? false,
      acknowledgedBy: warning.acknowledgedBy ?? "",
      acknowledgedAt: warning.acknowledgedAt
        ? warning.acknowledgedAt.getTime()
        : 0,
      overrideReason: warning.overrideReason ?? "",
      resolved: warning.resolved ?? false,
      resolvedAt: warning.resolvedAt ? warning.resolvedAt.getTime() : 0,
      notes: warning.notes ?? "",
      createdAt: warning.createdAt?.getTime() ?? 0,
      updatedAt: warning.updatedAt?.getTime() ?? 0,
      deletedAt: warning.deletedAt ? warning.deletedAt.getTime() : 0,
      isHighSeverity: warning.severity === "critical",
      isPending: !(warning.isAcknowledged || warning.resolved),
      isOverridden: !!warning.overrideReason,
      isDeleted: !!warning.deletedAt,
    };
  }
}

/**
 * Prisma-backed store for AlertsConfig (`tenant_inventory.alerts_config`).
 *
 * Manifest commands for this entity previously used `PrismaJsonStore` while
 * list/detail routes under `/api/kitchen/alerts-config/*` read
 * `database.alertsConfig` — writes never appeared in the UI.
 */
export class AlertsConfigPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.alertsConfig.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { id: "desc" },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.alertsConfig.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const row = await this.prisma.alertsConfig.create({
      data: {
        tenantId: this.tenantId,
        id,
        channel: (data.channel as string) ?? "",
        destination: (data.destination as string) ?? "",
      },
    });
    return this.mapToManifestEntity(row);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const patch: { channel?: string; destination?: string } = {};
      if (data.channel !== undefined) {
        patch.channel = data.channel as string;
      }
      if (data.destination !== undefined) {
        patch.destination = data.destination as string;
      }
      const row = await this.prisma.alertsConfig.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: patch,
      });
      return this.mapToManifestEntity(row);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.alertsConfig.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.alertsConfig.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(r: {
    tenantId: string;
    id: string;
    channel: string | null;
    destination: string | null;
  }): EntityInstance {
    return {
      id: r.id,
      tenantId: r.tenantId,
      channel: r.channel ?? "",
      destination: r.destination ?? "",
    };
  }
}

/**
 * Prisma-backed store for PrepTaskPlanWorkflow entities
 *
 * Backs the 16 lifecycle command routes for the prep-task plan pipeline
 * (generate -> review -> approve -> instantiate tasks -> schedule windows).
 *
 * Why this exists: prior to this store, command routes wrote workflow state
 * via `PrismaJsonStore` (the generic `manifest_entities` JSON blob table),
 * but read routes (`/api/kitchen/prep-task-plan-workflows/*`) queried the
 * dedicated `tenant_kitchen.prep_task_plan_workflows` table. Writes and
 * reads never connected — every workflow created via a command was invisible
 * to the UI. This store closes that mismatch.
 *
 * Field mapping: every manifest property is stored 1:1 (same name) in the
 * dedicated table; JSON-shaped properties (generatedTasks, scheduledWindows,
 * errors, etc.) are typed as `string` in the manifest and stored as TEXT in
 * Postgres holding serialized JSON payloads (e.g. `"[]"`, `"{}"`).
 */
export class PrepTaskPlanWorkflowPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.prepTaskPlanWorkflow.findMany({
      where: { tenantId: this.tenantId },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.prepTaskPlanWorkflow.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const now = new Date();
    const created = await this.prisma.prepTaskPlanWorkflow.create({
      data: {
        tenantId: this.tenantId,
        id,
        eventId: (data.eventId as string) ?? "",
        idempotencyKey: (data.idempotencyKey as string) ?? id,
        status: (data.status as string) ?? "created",
        currentStep: (data.currentStep as number) ?? 0,
        totalSteps: (data.totalSteps as number) ?? 5,
        generationOptions: (data.generationOptions as string) ?? "{}",
        generatedTasks: (data.generatedTasks as string) ?? "[]",
        reviewedTasks: (data.reviewedTasks as string) ?? "[]",
        approvedTaskIds: (data.approvedTaskIds as string) ?? "[]",
        rejectedTaskIds: (data.rejectedTaskIds as string) ?? "[]",
        instantiatedTaskIds: (data.instantiatedTaskIds as string) ?? "[]",
        scheduledWindows: (data.scheduledWindows as string) ?? "{}",
        constraintOutcomes: (data.constraintOutcomes as string) ?? "[]",
        errors: (data.errors as string) ?? "[]",
        warnings: (data.warnings as string) ?? "[]",
        generatedCount: (data.generatedCount as number) ?? 0,
        approvedCount: (data.approvedCount as number) ?? 0,
        instantiatedCount: (data.instantiatedCount as number) ?? 0,
        reviewedBy: (data.reviewedBy as string) || null,
        reviewedAt: timestampToDate(data.reviewedAt),
        approvedBy: (data.approvedBy as string) || null,
        approvedAt: timestampToDate(data.approvedAt),
        startedAt: timestampToDate(data.startedAt),
        completedAt: timestampToDate(data.completedAt),
        createdAt: timestampToDate(data.createdAt) ?? now,
        updatedAt: timestampToDate(data.updatedAt) ?? now,
      },
    });
    return this.mapToManifestEntity(created);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      // Build update payload — only set fields the caller actually provided
      // so we never clobber existing workflow state with stale defaults.
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      const stringFields = [
        "eventId",
        "idempotencyKey",
        "status",
        "generationOptions",
        "generatedTasks",
        "reviewedTasks",
        "approvedTaskIds",
        "rejectedTaskIds",
        "instantiatedTaskIds",
        "scheduledWindows",
        "constraintOutcomes",
        "errors",
        "warnings",
        "reviewedBy",
        "approvedBy",
      ] as const;
      for (const f of stringFields) {
        if (data[f] !== undefined) {
          // reviewedBy / approvedBy are nullable strings — empty string -> null
          if ((f === "reviewedBy" || f === "approvedBy") && data[f] === "") {
            updateData[f] = null;
          } else {
            updateData[f] = data[f] as string;
          }
        }
      }
      const numberFields = [
        "currentStep",
        "totalSteps",
        "generatedCount",
        "approvedCount",
        "instantiatedCount",
      ] as const;
      for (const f of numberFields) {
        if (data[f] !== undefined) {
          updateData[f] = data[f] as number;
        }
      }
      const dateFields = [
        "reviewedAt",
        "approvedAt",
        "startedAt",
        "completedAt",
      ] as const;
      for (const f of dateFields) {
        if (data[f] !== undefined) {
          updateData[f] = timestampToDate(data[f]);
        }
      }

      const updated = await this.prisma.prepTaskPlanWorkflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: updateData,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // PrepTaskPlanWorkflow has no deletedAt — mark status as "deleted"
      await this.prisma.prepTaskPlanWorkflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { status: "deleted" },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepTaskPlanWorkflow.updateMany({
      where: { tenantId: this.tenantId },
      data: { status: "deleted" },
    });
  }

  /**
   * Map the Prisma row to a Manifest EntityInstance.
   * Timestamps become epoch-millis numbers (manifest contract); nullable
   * scalars get manifest-default empty strings/zero numbers so guards like
   * `self.status == ""` behave consistently.
   */
  private mapToManifestEntity(w: PrepTaskPlanWorkflow): EntityInstance {
    return {
      id: w.id,
      tenantId: w.tenantId,
      eventId: w.eventId ?? "",
      idempotencyKey: w.idempotencyKey ?? "",
      status: w.status ?? "created",
      currentStep: w.currentStep ?? 0,
      totalSteps: w.totalSteps ?? 5,
      generationOptions: w.generationOptions ?? "{}",
      generatedTasks: w.generatedTasks ?? "[]",
      reviewedTasks: w.reviewedTasks ?? "[]",
      approvedTaskIds: w.approvedTaskIds ?? "[]",
      rejectedTaskIds: w.rejectedTaskIds ?? "[]",
      instantiatedTaskIds: w.instantiatedTaskIds ?? "[]",
      scheduledWindows: w.scheduledWindows ?? "{}",
      constraintOutcomes: w.constraintOutcomes ?? "[]",
      errors: w.errors ?? "[]",
      warnings: w.warnings ?? "[]",
      generatedCount: w.generatedCount ?? 0,
      approvedCount: w.approvedCount ?? 0,
      instantiatedCount: w.instantiatedCount ?? 0,
      reviewedBy: w.reviewedBy ?? "",
      reviewedAt: w.reviewedAt ? w.reviewedAt.getTime() : 0,
      approvedBy: w.approvedBy ?? "",
      approvedAt: w.approvedAt ? w.approvedAt.getTime() : 0,
      startedAt: w.startedAt ? w.startedAt.getTime() : 0,
      completedAt: w.completedAt ? w.completedAt.getTime() : 0,
      createdAt: w.createdAt ? w.createdAt.getTime() : 0,
      updatedAt: w.updatedAt ? w.updatedAt.getTime() : 0,
      isDeleted: w.status === "deleted",
    };
  }
}

/**
 * Convert a manifest timestamp (epoch millis number) to a Prisma `Date | null`.
 * Treats `0`, `undefined`, and `null` as "no value" since the manifest uses
 * `0` as the default for unset timestamps.
 */
function timestampToDate(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return new Date(n);
}

/**
 * Create a Prisma store provider for Kitchen-Ops entities
 *
 * This returns a function that provides the appropriate Store implementation
 * for each entity type, backed by Prisma.
 */
const loggedMissingStoreEntities = new Set<string>();

export type ManifestStoreIssueKind = "missing";

export type ManifestStoreIssueReporter = (
  entityName: string,
  kind: ManifestStoreIssueKind
) => void;

let manifestStoreIssueReporter: ManifestStoreIssueReporter | undefined;

/** Optional hook for apps to persist missing-store diagnostics. */
export function registerManifestStoreIssueReporter(
  reporter: ManifestStoreIssueReporter
): void {
  manifestStoreIssueReporter = reporter;
}

export function createPrismaStoreProvider(
  prisma: PrismaClient,
  tenantId: string,
  /** RuntimeContext.user.id, plumbed by manifest-runtime-factory.ts.
   * Used by entity stores that audit-derive a "who initiated" field
   * (e.g. InventoryTransfer.requestedBy) rather than capturing it from
   * the command body. Most stores ignore this arg. */
  userId = ""
): (entityName: string) => Store<EntityInstance> | undefined {
  return (entityName: string) => {
    switch (entityName) {
      case "AlertsConfig":
        return new AlertsConfigPrismaStore(prisma, tenantId);
      case "AllergenWarning":
        return new AllergenWarningPrismaStore(prisma, tenantId);
      case "PrepTask":
        return new PrepTaskPrismaStore(prisma, tenantId);
      case "Recipe":
        return new RecipePrismaStore(prisma, tenantId);
      case "RecipeVersion":
        return new RecipeVersionPrismaStore(prisma, tenantId);
      case "Ingredient":
        return new IngredientPrismaStore(prisma, tenantId);
      case "RecipeIngredient":
        return new RecipeIngredientPrismaStore(prisma, tenantId);
      case "RecipeStep":
        return new RecipeStepPrismaStore(prisma, tenantId);
      case "Menu":
        return new MenuPrismaStore(prisma, tenantId);
      case "MenuDish":
        return new MenuDishPrismaStore(prisma, tenantId);
      case "PrepList":
        return new PrepListPrismaStore(prisma, tenantId);
      case "PrepListItem":
        return new PrepListItemPrismaStore(prisma, tenantId);
      case "Station":
        return new StationPrismaStore(prisma, tenantId);
      case "InventoryItem":
        return new InventoryItemPrismaStore(prisma, tenantId);
      case "KitchenTask":
        return new KitchenTaskPrismaStore(prisma, tenantId);
      case "PrepTaskPlanWorkflow":
        return new PrepTaskPlanWorkflowPrismaStore(prisma, tenantId);
      case "PrepMethod":
        return new PrepMethodPrismaStore(prisma, tenantId);
      case "Container":
        return new ContainerPrismaStore(prisma, tenantId);
      case "WasteEntry":
        return new WasteEntryPrismaStore(prisma, tenantId);
      case "Workflow":
        return new WorkflowPrismaStore(prisma, tenantId);
      case "AdminChatParticipant":
        return new AdminChatParticipantPrismaStore(prisma, tenantId);
      case "AdminTask":
        return new AdminTaskPrismaStore(prisma, tenantId);
      case "ApiKey":
        return new ApiKeyPrismaStore(prisma, tenantId);
      case "BattleBoard":
        return new BattleBoardPrismaStore(prisma, tenantId);
      case "BudgetAlert":
        return new BudgetAlertPrismaStore(prisma, tenantId);
      case "BudgetLineItem":
        return new BudgetLineItemPrismaStore(prisma, tenantId);
      case "BulkOrderRule":
        return new BulkOrderRulePrismaStore(prisma, tenantId);
      case "CateringOrder":
        return new CateringOrderPrismaStore(prisma, tenantId);
      case "ChartOfAccount":
        return new ChartOfAccountPrismaStore(prisma, tenantId);
      case "Client":
        return new ClientPrismaStore(prisma, tenantId);
      case "ClientContact":
        return new ClientContactPrismaStore(prisma, tenantId);
      case "ClientInteraction":
        return new ClientInteractionPrismaStore(prisma, tenantId);
      case "ClientPreference":
        return new ClientPreferencePrismaStore(prisma, tenantId);
      case "CommandBoard":
        return new CommandBoardPrismaStore(prisma, tenantId);
      case "CommandBoardCard":
        return new CommandBoardCardPrismaStore(prisma, tenantId);
      case "CommandBoardConnection":
        return new CommandBoardConnectionPrismaStore(prisma, tenantId);
      case "CommandBoardGroup":
        return new CommandBoardGroupPrismaStore(prisma, tenantId);
      case "CommandBoardLayout":
        return new CommandBoardLayoutPrismaStore(prisma, tenantId);
      case "ContractSignature":
        return new ContractSignaturePrismaStore(prisma, tenantId);
      case "CycleCountRecord":
        return new CycleCountRecordPrismaStore(prisma, tenantId);
      case "CycleCountSession":
        return new CycleCountSessionPrismaStore(prisma, tenantId);
      case "Dish":
        return new DishPrismaStore(prisma, tenantId);
      case "EmailTemplate":
        return new EmailTemplatePrismaStore(prisma, tenantId);
      case "EmailWorkflow":
        return new EmailWorkflowPrismaStore(prisma, tenantId);
      case "EmployeeAvailability":
        return new EmployeeAvailabilityPrismaStore(prisma, tenantId);
      case "EmployeeCertification":
        return new EmployeeCertificationPrismaStore(prisma, tenantId);
      case "EmployeeDeduction":
        return new EmployeeDeductionPrismaStore(prisma, tenantId);
      case "Event":
        return new EventPrismaStore(prisma, tenantId);
      case "EventBudget":
        return new EventBudgetPrismaStore(prisma, tenantId);
      case "EventContract":
        return new EventContractPrismaStore(prisma, tenantId);
      case "EventDish":
        return new EventDishPrismaStore(prisma, tenantId);
      case "EventGuest":
        return new EventGuestPrismaStore(prisma, tenantId);
      case "EventImportWorkflow":
        return new EventImportPrismaStore(prisma, tenantId);
      case "EventProfitability":
        return new EventProfitabilityPrismaStore(prisma, tenantId);
      case "EventReport":
        return new EventReportPrismaStore(prisma, tenantId);
      case "EventStaff":
        return new EventStaffPrismaStore(prisma, tenantId);
      case "StaffMember":
        return new StaffMemberPrismaStore(prisma, tenantId);
      case "EventSummary":
        return new EventSummaryPrismaStore(prisma, tenantId);
      case "InventorySupplier":
        return new InventorySupplierPrismaStore(prisma, tenantId);
      case "InventoryTransaction":
        return new InventoryTransactionPrismaStore(prisma, tenantId);
      case "LaborBudget":
        return new LaborBudgetPrismaStore(prisma, tenantId);
      case "Lead":
        return new LeadPrismaStore(prisma, tenantId);
      case "OverrideAudit":
        return new OverrideAuditPrismaStore(prisma, tenantId);
      case "PayrollApprovalHistory":
        return new PayrollApprovalHistoryPrismaStore(prisma, tenantId);
      case "PayrollPeriod":
        return new PayrollPeriodPrismaStore(prisma, tenantId);
      case "PayrollRun":
        return new PayrollRunPrismaStore(prisma, tenantId);
      case "PrepComment":
        return new PrepCommentPrismaStore(prisma, tenantId);
      case "PricingTier":
        return new PricingTierPrismaStore(prisma, tenantId);
      case "TimeEntry":
        return new TimeEntryPrismaStore(prisma, tenantId);
      case "TimecardEditRequest":
        return new TimecardEditRequestPrismaStore(prisma, tenantId);
      case "TrainingAssignment":
        return new TrainingAssignmentPrismaStore(prisma, tenantId);
      case "Proposal":
        return new ProposalPrismaStore(prisma, tenantId);
      case "ProposalLineItem":
        return new ProposalLineItemPrismaStore(prisma, tenantId);
      case "PurchaseOrder":
        return new PurchaseOrderPrismaStore(prisma, tenantId);
      case "PurchaseOrderItem":
        return new PurchaseOrderItemPrismaStore(prisma, tenantId);
      case "Notification":
        return new NotificationPrismaStore(prisma, tenantId);
      case "Schedule":
        return new SchedulePrismaStore(prisma, tenantId);
      case "ScheduleShift":
        return new ScheduleShiftPrismaStore(prisma, tenantId);
      case "Shipment":
        return new ShipmentPrismaStore(prisma, tenantId);
      case "VendorContract":
        return new VendorContractPrismaStore(prisma, tenantId);
      case "PurchaseRequisition":
        return new PurchaseRequisitionPrismaStore(prisma, tenantId);
      case "Invoice":
        return new InvoicePrismaStore(prisma, tenantId);
      case "PaymentMethod":
        return new PaymentMethodPrismaStore(prisma, tenantId);
      case "Payment":
        return new PaymentPrismaStore(prisma, tenantId);
      case "CollectionCase":
        return new CollectionCasePrismaStore(prisma, tenantId);
      case "CollectionAction":
        return new CollectionActionPrismaStore(prisma, tenantId);
      case "CollectionPaymentPlan":
        return new CollectionPaymentPlanPrismaStore(prisma, tenantId);
      case "VendorCatalog":
        return new VendorCatalogPrismaStore(prisma, tenantId);
      case "VarianceReport":
        return new VarianceReportPrismaStore(prisma, tenantId);
      case "TrainingModule":
        return new TrainingModulePrismaStore(prisma, tenantId);
      case "RolePolicy":
        return new RolePolicyPrismaStore(prisma, tenantId);
      case "TimeOffRequest":
        return new TimeOffRequestPrismaStore(prisma, tenantId);
      case "InventoryTransfer":
        return new InventoryTransferPrismaStore(prisma, tenantId, userId);
      default: {
        if (!loggedMissingStoreEntities.has(entityName)) {
          loggedMissingStoreEntities.add(entityName);
          console.error(
            `[createPrismaStoreProvider] No store for entity "${entityName}" — commands will fail`
          );
          manifestStoreIssueReporter?.(entityName, "missing");
        }
        return undefined;
      }
    }
  };
}

/**
 * Load a PrepTask from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepTaskFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string
): Promise<EntityInstance | undefined> {
  const store = new PrepTaskPrismaStore(prisma, tenantId);
  return store.getById(taskId);
}

/**
 * Sync a PrepTask from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepTaskToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new PrepTaskPrismaStore(prisma, tenantId);

  // Check if task exists
  const existing = await prisma.prepTask.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a Recipe from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  recipeId: string
): Promise<EntityInstance | undefined> {
  const store = new RecipePrismaStore(prisma, tenantId);
  return store.getById(recipeId);
}

/**
 * Sync a Recipe from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new RecipePrismaStore(prisma, tenantId);

  // Check if recipe exists
  const existing = await prisma.recipe.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a Dish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadDishFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  dishId: string
): Promise<EntityInstance | undefined> {
  const store = new DishPrismaStore(prisma, tenantId);
  return store.getById(dishId);
}

/**
 * Sync a Dish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncDishToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new DishPrismaStore(prisma, tenantId);

  // Check if dish exists
  const existing = await prisma.dish.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Prisma-backed store for Menu entities
 *
 * Maps Manifest Menu entities to the Prisma Menu table.
 */
export class MenuPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const menus = await this.prisma.menu.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return menus.map((menu) => this.mapToManifestEntity(menu));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const menu = await this.prisma.menu.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return menu ? this.mapToManifestEntity(menu) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const menu = await this.prisma.menu.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        name: data.name as string,
        description: (data.description as string) || null,
        category: (data.category as string) || null,
        isActive: (data.isActive as boolean) ?? true,
        basePrice: data.basePrice
          ? new Prisma.Decimal(data.basePrice as number)
          : null,
        pricePerPerson: data.pricePerPerson
          ? new Prisma.Decimal(data.pricePerPerson as number)
          : null,
        minGuests: (data.minGuests as number) || null,
        maxGuests: (data.maxGuests as number) || null,
      },
    });
    return this.mapToManifestEntity(menu);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.menu.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          name: data.name as string | undefined,
          description: data.description as string | null | undefined,
          category: data.category as string | null | undefined,
          isActive: data.isActive as boolean | undefined,
          basePrice: data.basePrice
            ? new Prisma.Decimal(data.basePrice as number)
            : undefined,
          pricePerPerson: data.pricePerPerson
            ? new Prisma.Decimal(data.pricePerPerson as number)
            : undefined,
          minGuests: data.minGuests as number | null | undefined,
          maxGuests: data.maxGuests as number | null | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Menu has no deletedAt — deactivate instead
      await this.prisma.menu.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.menu.updateMany({
      where: { tenantId: this.tenantId },
      data: { isActive: false },
    });
  }

  private mapToManifestEntity(menu: Menu): EntityInstance {
    return {
      id: menu.id,
      tenantId: menu.tenantId,
      name: menu.name,
      description: menu.description ?? "",
      category: menu.category ?? "",
      isActive: menu.isActive,
      basePrice: Number(menu.basePrice ?? 0),
      pricePerPerson: Number(menu.pricePerPerson ?? 0),
      minGuests: menu.minGuests ?? 0,
      maxGuests: menu.maxGuests ?? 0,
      hasPricePerPerson:
        menu.pricePerPerson !== null && Number(menu.pricePerPerson) > 0,
      hasGuestConstraints:
        menu.minGuests !== null ||
        (menu.maxGuests !== null && Number(menu.maxGuests) > 0),
      guestRangeValid:
        (menu.minGuests ?? 0) <=
        (menu.maxGuests ? Number(menu.maxGuests) : Number.MAX_SAFE_INTEGER),
    };
  }
}

/**
 * Prisma-backed store for MenuDish entities
 *
 * Maps Manifest MenuDish entities to the Prisma MenuDish table.
 */
export class MenuDishPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const menuDishes = await this.prisma.menuDish.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return menuDishes.map((md) => this.mapToManifestEntity(md));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const menuDish = await this.prisma.menuDish.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return menuDish ? this.mapToManifestEntity(menuDish) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const menuDish = await this.prisma.menuDish.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        menuId: data.menuId as string,
        dishId: data.dishId as string,
        course: (data.course as string) || null,
        sortOrder: (data.sortOrder as number) ?? 0,
        isOptional: (data.isOptional as boolean) ?? false,
      },
    });
    return this.mapToManifestEntity(menuDish);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.menuDish.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          course: data.course as string | null | undefined,
          sortOrder: data.sortOrder as number | undefined,
          isOptional: data.isOptional as boolean | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.menuDish.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.menuDish.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(menuDish: MenuDish): EntityInstance {
    return {
      id: menuDish.id,
      tenantId: menuDish.tenantId,
      menuId: menuDish.menuId,
      dishId: menuDish.dishId,
      course: menuDish.course ?? "",
      sortOrder: menuDish.sortOrder,
      isOptional: menuDish.isOptional,
    };
  }
}

/**
 * Load a Menu from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadMenuFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  menuId: string
): Promise<EntityInstance | undefined> {
  const store = new MenuPrismaStore(prisma, tenantId);
  return store.getById(menuId);
}

/**
 * Sync a Menu from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncMenuToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new MenuPrismaStore(prisma, tenantId);

  // Check if menu exists
  const existing = await prisma.menu.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a MenuDish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadMenuDishFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  menuDishId: string
): Promise<EntityInstance | undefined> {
  const store = new MenuDishPrismaStore(prisma, tenantId);
  return store.getById(menuDishId);
}

/**
 * Sync a MenuDish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncMenuDishToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new MenuDishPrismaStore(prisma, tenantId);

  // Check if menu dish exists
  const existing = await prisma.menuDish.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Prisma-backed store for PrepList entities
 *
 * Maps Manifest PrepList entities to the Prisma PrepList table.
 */
export class PrepListPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const prepLists = await this.prisma.prepList.findMany({
      where: { tenantId: this.tenantId, isActive: true },
    });
    return prepLists.map((prepList) => this.mapToManifestEntity(prepList));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const prepList = await this.prisma.prepList.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return prepList ? this.mapToManifestEntity(prepList) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const prepList = await this.prisma.prepList.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        eventId: data.eventId as string,
        name: data.name as string,
        batchMultiplier: (data.batchMultiplier as number) ?? 1,
        dietaryRestrictions: toStringArray(data.dietaryRestrictions),
        status: (data.status as string) || "draft",
        totalItems: (data.totalItems as number) || 0,
        totalEstimatedTime: (data.totalEstimatedTime as number) || 0,
        notes: (data.notes as string) || null,
        generatedAt: data.generatedAt
          ? new Date(data.generatedAt as number)
          : new Date(),
        finalizedAt: data.finalizedAt
          ? new Date(data.finalizedAt as number)
          : null,
      },
    });
    return this.mapToManifestEntity(prepList);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.prepList.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          name: data.name as string | undefined,
          batchMultiplier: data.batchMultiplier as number | undefined,
          dietaryRestrictions: toStringArrayOrUndefined(data.dietaryRestrictions),
          status: data.status as string | undefined,
          totalItems: data.totalItems as number | undefined,
          totalEstimatedTime: data.totalEstimatedTime as number | undefined,
          notes: data.notes as string | null | undefined,
          finalizedAt: data.finalizedAt
            ? new Date(data.finalizedAt as number)
            : undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prepList.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepList.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(prepList: PrepList): EntityInstance {
    const batchMultiplier = Number(prepList.batchMultiplier ?? 1);
    return {
      id: prepList.id,
      tenantId: prepList.tenantId,
      eventId: prepList.eventId,
      name: prepList.name,
      batchMultiplier,
      dietaryRestrictions: prepList.dietaryRestrictions ?? "",
      status: prepList.status ?? "draft",
      totalItems: prepList.totalItems ?? 0,
      totalEstimatedTime: Number(prepList.totalEstimatedTime ?? 0),
      notes: prepList.notes ?? "",
      generatedAt: prepList.generatedAt
        ? prepList.generatedAt.getTime()
        : Date.now(),
      finalizedAt: prepList.finalizedAt ? prepList.finalizedAt.getTime() : 0,
      isActive: prepList.deletedAt == null,
      isDraft: prepList.status === "draft",
      isFinalized: prepList.status === "finalized",
      isCompleted: prepList.status === "completed",
      hasItems: (prepList.totalItems ?? 0) > 0,
      avgTimePerItem:
        (prepList.totalItems ?? 0) > 0
          ? Number(prepList.totalEstimatedTime ?? 0) / (prepList.totalItems ?? 1)
          : 0,
    };
  }
}

/**
 * Prisma-backed store for PrepListItem entities
 *
 * Maps Manifest PrepListItem entities to the Prisma PrepListItem table.
 */
export class PrepListItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const items = await this.prisma.prepListItem.findMany({
      where: { tenantId: this.tenantId },
    });
    return items.map((item) => this.mapToManifestEntity(item));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const item = await this.prisma.prepListItem.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return item ? this.mapToManifestEntity(item) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const item = await this.prisma.prepListItem.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        prepListId: data.prepListId as string,
        stationId: (data.stationId as string) || "",
        stationName: data.stationName as string,
        ingredientId: data.ingredientId as string,
        ingredientName: data.ingredientName as string,
        category: (data.category as string) || null,
        baseQuantity: (data.baseQuantity as number) ?? 0,
        baseUnit: (data.baseUnit as string) || "",
        scaledQuantity: (data.scaledQuantity as number) ?? 0,
        scaledUnit: (data.scaledUnit as string) || "",
        isOptional: (data.isOptional as boolean) ?? false,
        preparationNotes: (data.preparationNotes as string) || null,
        allergens: toStringArray(data.allergens),
        dietarySubstitutions: toStringArray(data.dietarySubstitutions),
        dishId: (data.dishId as string) || null,
        dishName: (data.dishName as string) || null,
        recipeVersionId: (data.recipeVersionId as string) || null,
        sortOrder: (data.sortOrder as number) ?? 0,
        isCompleted: (data.isCompleted as boolean) ?? false,
        completedAt: data.completedAt
          ? new Date(data.completedAt as number)
          : null,
        completedBy: (data.completedBy as string) || null,
      },
    });
    return this.mapToManifestEntity(item);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.prepListItem.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          stationId: data.stationId as string | undefined,
          stationName: data.stationName as string | undefined,
          baseQuantity: data.baseQuantity as number | undefined,
          scaledQuantity: data.scaledQuantity as number | undefined,
          baseUnit: data.baseUnit as string | undefined,
          scaledUnit: data.scaledUnit as string | undefined,
          preparationNotes: data.preparationNotes as string | null | undefined,
          allergens: toStringArrayOrUndefined(data.allergens),
          dietarySubstitutions: toStringArrayOrUndefined(data.dietarySubstitutions),
          sortOrder: data.sortOrder as number | undefined,
          isCompleted: data.isCompleted as boolean | undefined,
          completedAt: data.completedAt
            ? new Date(data.completedAt as number)
            : undefined,
          completedBy: data.completedBy as string | null | undefined,
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // PrepListItem has no deletedAt — hard-delete
      await this.prisma.prepListItem.delete({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepListItem.deleteMany({
      where: { tenantId: this.tenantId },
    });
  }

  private mapToManifestEntity(item: PrepListItem): EntityInstance {
    return {
      id: item.id,
      tenantId: item.tenantId,
      prepListId: item.prepListId,
      stationId: item.stationId ?? "",
      stationName: item.stationName ?? "",
      ingredientId: item.ingredientId,
      ingredientName: item.ingredientName ?? "",
      category: item.category ?? "",
      baseQuantity: Number(item.baseQuantity ?? 0),
      baseUnit: item.baseUnit ?? "",
      scaledQuantity: Number(item.scaledQuantity ?? 0),
      scaledUnit: item.scaledUnit ?? "",
      isOptional: item.isOptional ?? false,
      preparationNotes: item.preparationNotes ?? "",
      allergens: item.allergens ?? "",
      dietarySubstitutions: item.dietarySubstitutions ?? "",
      dishId: item.dishId ?? "",
      dishName: item.dishName ?? "",
      recipeVersionId: item.recipeVersionId ?? "",
      sortOrder: item.sortOrder ?? 0,
      isCompleted: item.isCompleted ?? false,
      completedAt: item.completedAt ? item.completedAt.getTime() : 0,
      completedBy: item.completedBy ?? "",
      hasAllergens: Array.isArray(item.allergens) && item.allergens.length > 0,
      hasDietarySubstitutions:
        Array.isArray(item.dietarySubstitutions) &&
        item.dietarySubstitutions.length > 0,
      isRequired: !(item.isOptional ?? false),
    };
  }
}

/**
 * Load a PrepList from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepListFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  prepListId: string
): Promise<EntityInstance | undefined> {
  const store = new PrepListPrismaStore(prisma, tenantId);
  return store.getById(prepListId);
}

/**
 * Sync a PrepList from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepListToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new PrepListPrismaStore(prisma, tenantId);

  // Check if prep list exists
  const existing = await prisma.prepList.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a PrepListItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepListItemFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  itemId: string
): Promise<EntityInstance | undefined> {
  const store = new PrepListItemPrismaStore(prisma, tenantId);
  return store.getById(itemId);
}

/**
 * Sync a PrepListItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepListItemToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new PrepListItemPrismaStore(prisma, tenantId);

  // Check if prep list item exists
  const existing = await prisma.prepListItem.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Prisma-backed store for Station entities
 *
 * Maps Manifest Station entities to the Prisma Station table.
 */
export class StationPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const stations = await this.prisma.station.findMany({
      where: { tenantId: this.tenantId, isActive: true },
    });
    return stations.map((station) => this.mapToManifestEntity(station));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const station = await this.prisma.station.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return station ? this.mapToManifestEntity(station) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const station = await this.prisma.station.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        locationId: data.locationId as string,
        name: data.name as string,
        stationType: (data.stationType as string) || "prep-station",
        capacitySimultaneousTasks:
          (data.capacitySimultaneousTasks as number) || 1,
        // equipmentList is a Postgres String[] column.
        equipmentList: toStringArray(data.equipmentList),
        isActive: (data.isActive as boolean) ?? true,
        notes: (data.notes as string) || null,
      },
    });
    return this.mapToManifestEntity(station);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.station.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          name: data.name as string | undefined,
          stationType: data.stationType as string | undefined,
          capacitySimultaneousTasks: data.capacitySimultaneousTasks as
            | number
            | undefined,
          equipmentList: toStringArrayOrUndefined(data.equipmentList),
          isActive: data.isActive as boolean | undefined,
          notes: data.notes as string | null | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Station has no deletedAt — deactivate instead
      await this.prisma.station.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.station.updateMany({
      where: { tenantId: this.tenantId },
      data: { isActive: false },
    });
  }

  private mapToManifestEntity(station: Station): EntityInstance {
    return {
      id: station.id,
      tenantId: station.tenantId,
      locationId: station.locationId,
      name: station.name,
      stationType: station.stationType ?? "prep-station",
      capacitySimultaneousTasks: station.capacitySimultaneousTasks ?? 1,
      // equipmentList is String? scalar — pass through as-is
      equipmentList: station.equipmentList ?? "",
      isActive: station.isActive ?? true,
      currentTaskCount: 0, // Not persisted in Prisma - computed at runtime
      notes: station.notes ?? "",
      createdAt: station.createdAt?.getTime() ?? 0,
      updatedAt: station.updatedAt?.getTime() ?? 0,
    };
  }
}

/**
 * Load a Station from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadStationFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  stationId: string
): Promise<EntityInstance | undefined> {
  const store = new StationPrismaStore(prisma, tenantId);
  return store.getById(stationId);
}

/**
 * Sync a Station from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncStationToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new StationPrismaStore(prisma, tenantId);

  // Check if station exists
  const existing = await prisma.station.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load an InventoryItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadInventoryItemFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  itemId: string
): Promise<EntityInstance | undefined> {
  const store = new InventoryItemPrismaStore(prisma, tenantId);
  return store.getById(itemId);
}

/**
 * Sync an InventoryItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncInventoryItemToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new InventoryItemPrismaStore(prisma, tenantId);

  // Check if inventory item exists
  const existing = await prisma.inventoryItem.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a RecipeVersion from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeVersionFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  versionId: string
): Promise<EntityInstance | undefined> {
  const store = new RecipeVersionPrismaStore(prisma, tenantId);
  return store.getById(versionId);
}

/**
 * Sync a RecipeVersion from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeVersionToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new RecipeVersionPrismaStore(prisma, tenantId);

  // Check if recipe version exists
  const existing = await prisma.recipeVersion.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load an Ingredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadIngredientFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  ingredientId: string
): Promise<EntityInstance | undefined> {
  const store = new IngredientPrismaStore(prisma, tenantId);
  return store.getById(ingredientId);
}

/**
 * Sync an Ingredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncIngredientToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new IngredientPrismaStore(prisma, tenantId);

  // Check if ingredient exists
  const existing = await prisma.ingredient.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Load a RecipeIngredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeIngredientFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  recipeIngredientId: string
): Promise<EntityInstance | undefined> {
  const store = new RecipeIngredientPrismaStore(prisma, tenantId);
  return store.getById(recipeIngredientId);
}

/**
 * Sync a RecipeIngredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeIngredientToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new RecipeIngredientPrismaStore(prisma, tenantId);

  // Check if recipe ingredient exists
  const existing = await prisma.recipeIngredient.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}

/**
 * Configuration for PrismaStore
 */
export interface PrismaStoreConfig {
  prisma: PrismaClient;
  entityName: string;
  tenantId: string;
  outboxWriter: (tx: PrismaClient, events: unknown[]) => Promise<void>;
  eventCollector?: unknown[];
  /** RuntimeContext.user.id — threaded through to per-entity stores that
   * audit-derive caller identity (e.g. InventoryTransfer.requestedBy). */
  userId?: string;
}

/**
 * Generic PrismaStore class that wraps entity-specific stores
 *
 * This class provides a unified interface for working with different entity types
 * through their Prisma-backed store implementations. It supports the outbox pattern
 * for reliable event delivery.
 */
export class PrismaStore implements Store<EntityInstance> {
  private readonly store: Store<EntityInstance>;
  private readonly outboxWriter: (
    tx: PrismaClient,
    events: unknown[]
  ) => Promise<void>;
  private readonly eventCollector?: unknown[];

  constructor(config: PrismaStoreConfig) {
    // Resolve a bespoke per-entity store from the switch; if none exists for
    // this entity (the switch returns undefined), fall back to the generic
    // metadata-driven store so a memory→durable flip needs only an
    // ENTITIES_WITH_SPECIFIC_STORES entry — no new switch case. Existing
    // entities all have a case, so this fallback never changes their behavior.
    this.store =
      (createPrismaStoreProvider(
        config.prisma,
        config.tenantId,
        config.userId ?? ""
      )(config.entityName) as Store<EntityInstance> | undefined) ??
      new GenericPrismaStore(
        config.prisma,
        config.entityName,
        config.tenantId
      );
    this.outboxWriter = config.outboxWriter;
    this.eventCollector = config.eventCollector;
  }

  async getAll(): Promise<EntityInstance[]> {
    return this.store.getAll();
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    return this.store.getById(id);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    return this.store.create(data);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    return this.store.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async clear(): Promise<void> {
    return this.store.clear();
  }

  /**
   * Write events to the outbox within a transaction
   *
   * This method is called by the manifest runtime to persist events
   * transactionally with state mutations.
   */
  async writeEvents(events: unknown[]): Promise<void> {
    // If we have a Prisma transaction context, use it
    // Otherwise, create a new transaction
    if (this.eventCollector) {
      // Add events to the in-memory collector for later writing
      this.eventCollector.push(...events);
    } else {
      // Write directly to outbox (creates its own transaction)
      throw new Error(
        "Direct outbox writing not supported - use eventCollector pattern"
      );
    }
  }
}

/**
 * Create an outbox writer function for a given entity and tenant
 *
 * The outbox writer function writes events to the OutboxEvent table
 * within a Prisma transaction for reliable event delivery.
 *
 * @param entityName - The name of the entity (e.g., "PrepTask")
 * @param tenantId - The tenant ID for multi-tenant isolation
 * @returns A function that writes events to the outbox
 */
export function createPrismaOutboxWriter(
  entityName: string,
  tenantId: string
): (tx: PrismaClient, events: unknown[]) => Promise<void> {
  return async (tx: PrismaClient, events: unknown[]) => {
    for (const event of events) {
      const eventData = event as {
        name?: string;
        eventType?: string;
        payload: { id?: string; taskId?: string };
        aggregateId?: string;
        aggregateType?: string;
      };
      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: eventData.aggregateType || entityName,
          eventType: eventData.eventType || eventData.name || "unknown",
          payload: eventData.payload as Prisma.InputJsonValue,
          aggregateId:
            eventData.aggregateId ||
            eventData.payload?.taskId ||
            eventData.payload?.id ||
            "unknown",
          status: "pending",
        },
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Shared array coercion (module-level so every *PrismaStore class can use it).
// Schema array columns are Postgres String[]; manifest values may arrive as an
// array OR a legacy comma-string. These normalize to a real string[].
// ---------------------------------------------------------------------------
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// For updates: leave the column untouched when the field wasn't provided.
function toStringArrayOrUndefined(value: unknown): string[] | undefined {
  return value === undefined ? undefined : toStringArray(value);
}
