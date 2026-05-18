/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */
import { Prisma } from "@repo/database/standalone";
import { ContainerPrismaStore, PrepMethodPrismaStore, } from "./prisma-stores/broken-read-batch01-prep-container";
import { WasteEntryPrismaStore, WorkflowPrismaStore, } from "./prisma-stores/broken-read-batch01-waste-workflow";
import { ApiKeyPrismaStore, BattleBoardPrismaStore, BudgetAlertPrismaStore, } from "./prisma-stores/broken-read-batch02-api-battle-budget";
import { AdminChatParticipantPrismaStore, AdminTaskPrismaStore, } from "./prisma-stores/broken-read-batch02-participant-task";
import { BudgetLineItemPrismaStore, BulkOrderRulePrismaStore, CateringOrderPrismaStore, } from "./prisma-stores/broken-read-batch03-budget-bulk-catering";
import { ChartOfAccountPrismaStore, ClientPrismaStore, } from "./prisma-stores/broken-read-batch03-chart-client";
import { ClientContactPrismaStore, ClientInteractionPrismaStore, ClientPreferencePrismaStore, } from "./prisma-stores/broken-read-batch04-client-trio";
import { CommandBoardCardPrismaStore, CommandBoardPrismaStore, } from "./prisma-stores/broken-read-batch04-command-board";
import { CommandBoardConnectionPrismaStore, CommandBoardGroupPrismaStore, CommandBoardLayoutPrismaStore, } from "./prisma-stores/broken-read-batch05-command-board";
import { ContractSignaturePrismaStore, CycleCountRecordPrismaStore, } from "./prisma-stores/broken-read-batch05-contract-cycle";
import { CycleCountSessionPrismaStore, DishPrismaStore, } from "./prisma-stores/broken-read-batch06-cycle-dish";
export { DishPrismaStore };
import { EmailTemplatePrismaStore, EmailWorkflowPrismaStore, } from "./prisma-stores/broken-read-batch06-email";
export { EmailTemplatePrismaStore };
import { EmployeeAvailabilityPrismaStore } from "./prisma-stores/broken-read-batch06-employee-availability";
import { EmployeeCertificationPrismaStore, EmployeeDeductionPrismaStore, } from "./prisma-stores/broken-read-batch07-employee";
import { EventBudgetPrismaStore, EventContractPrismaStore, EventPrismaStore, } from "./prisma-stores/broken-read-batch07-event";
export { EventPrismaStore };
import { EventDishPrismaStore } from "./prisma-stores/broken-read-batch08-event-dish";
import { EventGuestPrismaStore, EventImportPrismaStore, } from "./prisma-stores/broken-read-batch08-event-guest-import";
import { EventProfitabilityPrismaStore, EventReportPrismaStore, } from "./prisma-stores/broken-read-batch08-event-profit-report";
import { EventStaffAssignmentPrismaStore, EventSummaryPrismaStore, } from "./prisma-stores/broken-read-batch09-event-staff-summary";
import { IngredientPrismaStore } from "./prisma-stores/broken-read-batch09-ingredient";
export { IngredientPrismaStore };
import { InventoryItemPrismaStore, InventorySupplierPrismaStore, } from "./prisma-stores/broken-read-batch09-inventory";
export { InventoryItemPrismaStore };
import { InventoryTransactionPrismaStore } from "./prisma-stores/broken-read-batch10-inventory-transaction";
import { LaborBudgetPrismaStore, LeadPrismaStore, } from "./prisma-stores/broken-read-batch10-labor-budget-lead";
import { OverrideAuditPrismaStore } from "./prisma-stores/broken-read-batch11-override-audit";
import { PayrollApprovalHistoryPrismaStore, PayrollPeriodPrismaStore, PayrollRunPrismaStore, } from "./prisma-stores/broken-read-batch11-payroll";
import { PrepCommentPrismaStore, PricingTierPrismaStore, } from "./prisma-stores/broken-read-batch12-prep-pricing";
import { TimecardEditRequestPrismaStore, TimeEntryPrismaStore, TrainingAssignmentPrismaStore, } from "./prisma-stores/broken-read-batch12-staff-time";
import { ProposalLineItemPrismaStore, PurchaseOrderItemPrismaStore, } from "./prisma-stores/broken-read-batch13-order-proposal";
import { ScheduleShiftPrismaStore } from "./prisma-stores/broken-read-batch13-schedule-shipment";
import { TrainingModulePrismaStore, VarianceReportPrismaStore, } from "./prisma-stores/broken-read-batch13-training-variance";
import { VendorCatalogPrismaStore, VendorContractPrismaStore, } from "./prisma-stores/broken-read-batch13-vendor";
import { CollectionActionPrismaStore, CollectionCasePrismaStore, CollectionPaymentPlanPrismaStore, } from "./prisma-stores/broken-read-batch14-collections";
import { InvoicePrismaStore, PaymentMethodPrismaStore, PaymentPrismaStore, } from "./prisma-stores/broken-read-batch14-invoice-payment";
import { RolePolicyPrismaStore, TimeOffRequestPrismaStore, } from "./prisma-stores/broken-read-batch15-rolepolicy-timeoff";
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
function reportStoreError(error, store, op) {
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
function reportOp(self, op, error) {
    reportStoreError(error, self.constructor.name, op);
}
/**
 * Prisma-backed store for PrepTask entities
 *
 * Maps Manifest PrepTask entities to the Prisma PrepTask and KitchenTaskClaim tables.
 * The Manifest entity has inline claimedBy/claimedAt fields, while Prisma uses a
 * separate KitchenTaskClaim table for tracking claims.
 */
export class PrepTaskPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        // Fetch all prep tasks for this tenant
        const tasks = await this.prisma.prepTask.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        // Return mapped entities (claims will be fetched on-demand if needed)
        return tasks.map((task) => this.mapToManifestEntity(task, []));
    }
    async getById(id) {
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
    async create(data) {
        const task = await this.prisma.prepTask.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                eventId: data.eventId,
                name: data.name,
                taskType: data.taskType || "prep",
                status: data.status || "pending",
                priority: data.priority || 5,
                quantityTotal: data.quantityTotal,
                quantityUnitId: data.quantityUnitId,
                quantityCompleted: data.quantityCompleted || 0,
                servingsTotal: data.servingsTotal,
                startByDate: data.startByDate
                    ? new Date(data.startByDate)
                    : new Date(),
                dueByDate: data.dueByDate
                    ? new Date(data.dueByDate)
                    : new Date(),
                locationId: data.locationId,
                dishId: data.dishId,
                recipeVersionId: data.recipeVersionId,
                methodId: data.methodId,
                containerId: data.containerId,
                estimatedMinutes: data.estimatedMinutes,
                notes: data.notes,
            },
        });
        // If task has claim info, create a claim record
        if (data.claimedBy && data.claimedAt) {
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: task.id,
                    employeeId: data.claimedBy,
                    claimedAt: new Date(data.claimedAt),
                },
            });
        }
        return this.mapToManifestEntity(task, []);
    }
    async update(id, data) {
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
                status: data.status,
                priority: data.priority,
                quantityCompleted: data.quantityCompleted,
                quantityTotal: data.quantityTotal,
                actualMinutes: data.actualMinutes,
                notes: data.notes,
                updatedAt: new Date(),
            },
        });
        // Handle claim changes
        const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
            where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
        });
        const newClaimedBy = data.claimedBy;
        if (newClaimedBy && !activeClaim) {
            // Create new claim
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: id,
                    employeeId: newClaimedBy,
                    claimedAt: data.claimedAt
                        ? new Date(data.claimedAt)
                        : new Date(),
                },
            });
        }
        else if (!newClaimedBy && activeClaim && data.status === "open") {
            // Release existing claim - use compound unique key
            await this.prisma.kitchenTaskClaim.update({
                where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
                data: {
                    releasedAt: new Date(),
                    releaseReason: data.releaseReason,
                },
            });
        }
        else if (newClaimedBy &&
            activeClaim &&
            newClaimedBy !== activeClaim.employeeId) {
            // Reassign: release old claim, create new one
            await this.prisma.kitchenTaskClaim.update({
                where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
                data: { releasedAt: new Date() },
            });
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: id,
                    employeeId: newClaimedBy,
                    claimedAt: data.claimedAt
                        ? new Date(data.claimedAt)
                        : new Date(),
                },
            });
        }
        return this.mapToManifestEntity(updated, []);
    }
    async delete(id) {
        try {
            await this.prisma.prepTask.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.prepTask.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    /**
     * Map Prisma PrepTask to Manifest PrepTask entity
     */
    mapToManifestEntity(task, claims) {
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
            locationId: task.locationId,
            dishId: task.dishId ?? "",
            recipeVersionId: task.recipeVersionId ?? "",
            methodId: task.methodId ?? "",
            containerId: task.containerId ?? "",
            estimatedMinutes: task.estimatedMinutes ?? 0,
            actualMinutes: task.actualMinutes ?? 0,
            notes: task.notes ?? "",
            stationId: "", // Not tracked in Prisma schema
            claimedBy: activeClaim?.employeeId ?? "",
            claimedAt: activeClaim?.claimedAt.getTime() ?? 0,
            createdAt: task.createdAt.getTime(),
            updatedAt: task.updatedAt.getTime(),
        };
    }
    /**
     * Map Prisma status to Manifest status
     */
    mapStatus(status) {
        const statusMap = {
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
export class RecipePrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const recipes = await this.prisma.recipe.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return recipes.map((recipe) => this.mapToManifestEntity(recipe));
    }
    async getById(id) {
        const recipe = await this.prisma.recipe.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return recipe ? this.mapToManifestEntity(recipe) : undefined;
    }
    async create(data) {
        const recipe = await this.prisma.recipe.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                name: data.name,
                category: data.category || null,
                cuisineType: data.cuisineType || null,
                description: data.description || null,
                tags: data.tags || [],
                isActive: data.isActive ?? true,
            },
        });
        return this.mapToManifestEntity(recipe);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.recipe.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    name: data.name,
                    category: data.category,
                    cuisineType: data.cuisineType,
                    description: data.description,
                    tags: data.tags,
                    isActive: data.isActive,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.recipe.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.recipe.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(recipe) {
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
            createdAt: recipe.createdAt.getTime(),
            updatedAt: recipe.updatedAt.getTime(),
        };
    }
}
/**
 * Prisma-backed store for RecipeVersion entities
 *
 * Maps Manifest RecipeVersion entities to the Prisma RecipeVersion table.
 */
export class RecipeVersionPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const versions = await this.prisma.recipeVersion.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return versions.map((version) => this.mapToManifestEntity(version));
    }
    async getById(id) {
        const version = await this.prisma.recipeVersion.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return version ? this.mapToManifestEntity(version) : undefined;
    }
    /**
     * Get the latest RecipeVersion for a specific recipe (by versionNumber DESC).
     * This replaces the need for raw SQL queries like MAX(version_number).
     */
    async getLatestByRecipeId(recipeId) {
        const version = await this.prisma.recipeVersion.findFirst({
            where: { tenantId: this.tenantId, recipeId, deletedAt: null },
            orderBy: { versionNumber: "desc" },
        });
        return version ? this.mapToManifestEntity(version) : undefined;
    }
    /**
     * Get all versions for a specific recipe, ordered by version number descending.
     */
    async getByRecipeId(recipeId) {
        const versions = await this.prisma.recipeVersion.findMany({
            where: { tenantId: this.tenantId, recipeId, deletedAt: null },
            orderBy: { versionNumber: "desc" },
        });
        return versions.map((version) => this.mapToManifestEntity(version));
    }
    async create(data) {
        const version = await this.prisma.recipeVersion.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                recipeId: data.recipeId,
                name: data.name,
                category: data.category || null,
                cuisineType: data.cuisineType || null,
                description: data.description || null,
                tags: data.tags || [],
                versionNumber: data.versionNumber || 1,
                yieldQuantity: data.yieldQuantity,
                yieldUnitId: data.yieldUnitId,
                yieldDescription: data.yieldDescription || null,
                prepTimeMinutes: data.prepTimeMinutes || null,
                cookTimeMinutes: data.cookTimeMinutes || null,
                restTimeMinutes: data.restTimeMinutes || null,
                difficultyLevel: data.difficultyLevel || null,
                instructions: data.instructions || null,
                notes: data.notes || null,
            },
        });
        return this.mapToManifestEntity(version);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.recipeVersion.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    yieldQuantity: data.yieldQuantity,
                    yieldUnitId: data.yieldUnitId,
                    prepTimeMinutes: data.prepTimeMinutes,
                    cookTimeMinutes: data.cookTimeMinutes,
                    restTimeMinutes: data.restTimeMinutes,
                    difficultyLevel: data.difficultyLevel,
                    instructions: data.instructions,
                    notes: data.notes,
                    totalCost: data.totalCost,
                    costPerYield: data.costPerYield,
                    costCalculatedAt: data.totalCost !== undefined ? new Date() : undefined,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.recipeVersion.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.recipeVersion.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(version) {
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
            tags: Array.isArray(version.tags) ? version.tags.join(",") : "",
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
            createdAt: version.createdAt.getTime(),
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
export class RecipeIngredientPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const ingredients = await this.prisma.recipeIngredient.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return ingredients.map((ingredient) => this.mapToManifestEntity(ingredient));
    }
    async getById(id) {
        const ingredient = await this.prisma.recipeIngredient.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return ingredient ? this.mapToManifestEntity(ingredient) : undefined;
    }
    async create(data) {
        const ingredient = await this.prisma.recipeIngredient.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                recipeVersionId: data.recipeVersionId,
                ingredientId: data.ingredientId,
                quantity: data.quantity,
                unitId: data.unitId,
                preparationNotes: data.preparationNotes || null,
                isOptional: data.isOptional,
                sortOrder: data.sortOrder || 0,
                wasteFactor: data.wasteFactor ?? 1.0,
            },
        });
        return this.mapToManifestEntity(ingredient);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.recipeIngredient.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    quantity: data.quantity,
                    unitId: data.unitId,
                    wasteFactor: data.wasteFactor,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.recipeIngredient.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.recipeIngredient.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(ingredient) {
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
            createdAt: ingredient.createdAt.getTime(),
            updatedAt: ingredient.updatedAt.getTime(),
        };
    }
}
/**
 * Prisma-backed store for RecipeStep entities
 *
 * Maps Manifest RecipeStep entities to the Prisma RecipeStep table.
 * Note: Prisma model uses snake_case (RecipeStep).
 */
export class RecipeStepPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const steps = await this.prisma.recipeStep.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return steps.map((step) => this.mapToManifestEntity(step));
    }
    async getById(id) {
        const step = await this.prisma.recipeStep.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return step ? this.mapToManifestEntity(step) : undefined;
    }
    async create(data) {
        const step = await this.prisma.recipeStep.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                recipeVersionId: data.recipeVersionId,
                stepNumber: data.stepNumber,
                instruction: data.instruction,
                durationMinutes: data.durationMinutes || null,
                temperatureValue: data.temperatureValue || null,
                temperatureUnit: data.temperatureUnit || null,
                equipmentNeeded: data.equipmentNeeded
                    ? data.equipmentNeeded
                        .split(",")
                        .filter(Boolean)
                    : [],
                tips: data.tips || null,
                videoUrl: data.videoUrl || null,
                imageUrl: data.imageUrl || null,
            },
        });
        return this.mapToManifestEntity(step);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.recipeStep.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    instruction: data.instruction,
                    durationMinutes: data.durationMinutes,
                    tips: data.tips,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.recipeStep.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.recipeStep.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(step) {
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
            equipmentNeeded: step.equipmentNeeded?.join(",") ?? "",
            tips: step.tips ?? "",
            videoUrl: step.videoUrl ?? "",
            imageUrl: step.imageUrl ?? "",
            createdAt: step.createdAt.getTime(),
            updatedAt: step.updatedAt.getTime(),
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
export class KitchenTaskPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const tasks = (await this.prisma.kitchenTask.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        }));
        // Fetch claims in batch (not N+1 - uses single IN query)
        const taskIds = tasks.map((t) => t.id);
        const claims = taskIds.length > 0
            ? await this.prisma.kitchenTaskClaim.findMany({
                where: {
                    tenantId: this.tenantId,
                    taskId: { in: taskIds },
                    releasedAt: null,
                },
                orderBy: { claimedAt: "desc" },
            })
            : [];
        const claimsByTaskId = new Map();
        for (const claim of claims) {
            const existing = claimsByTaskId.get(claim.taskId) || [];
            existing.push(claim);
            claimsByTaskId.set(claim.taskId, existing);
        }
        return tasks.map((task) => this.mapToManifestEntity(task, claimsByTaskId.get(task.id) || []));
    }
    async getById(id) {
        const task = await this.prisma.kitchenTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!task) {
            console.error(`[KitchenTaskPrismaStore] getById(${id}) returned null for tenant ${this.tenantId}`);
            return undefined;
        }
        const claims = await this.prisma.kitchenTaskClaim.findMany({
            where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
            orderBy: { claimedAt: "desc" },
            take: 1,
        });
        return this.mapToManifestEntity(task, claims);
    }
    async create(data) {
        const task = await this.prisma.kitchenTask.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                title: data.title || "",
                summary: data.summary || "",
                status: data.status || "pending",
                priority: data.priority || 5,
                complexity: data.complexity || 5,
                tags: Array.isArray(data.tags) ? data.tags : [],
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                completedAt: data.completedAt
                    ? new Date(data.completedAt)
                    : undefined,
            },
        });
        if (data.claimedBy && data.claimedAt) {
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: task.id,
                    employeeId: data.claimedBy,
                    claimedAt: new Date(data.claimedAt),
                },
            });
        }
        return this.mapToManifestEntity(task, []);
    }
    async update(id, data) {
        const existing = await this.prisma.kitchenTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!existing) {
            console.error(`[KitchenTaskPrismaStore] update(${id}) — task not found for tenant ${this.tenantId}`);
            return undefined;
        }
        const updated = await this.prisma.kitchenTask.update({
            where: { tenantId_id: { tenantId: this.tenantId, id } },
            data: {
                status: data.status,
                priority: data.priority,
                complexity: data.complexity,
                title: data.title,
                summary: data.summary,
                tags: Array.isArray(data.tags) ? data.tags : undefined,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                completedAt: data.completedAt
                    ? new Date(data.completedAt)
                    : undefined,
                updatedAt: new Date(),
            },
        });
        const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
            where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
        });
        const newClaimedBy = data.claimedBy;
        if (newClaimedBy && !activeClaim) {
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: id,
                    employeeId: newClaimedBy,
                    claimedAt: data.claimedAt
                        ? new Date(data.claimedAt)
                        : new Date(),
                },
            });
        }
        else if (!newClaimedBy && activeClaim) {
            await this.prisma.kitchenTaskClaim.update({
                where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
                data: {
                    releasedAt: new Date(),
                    releaseReason: data.releaseReason,
                },
            });
        }
        else if (newClaimedBy &&
            activeClaim &&
            newClaimedBy !== activeClaim.employeeId) {
            await this.prisma.kitchenTaskClaim.update({
                where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
                data: { releasedAt: new Date() },
            });
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: id,
                    employeeId: newClaimedBy,
                    claimedAt: data.claimedAt
                        ? new Date(data.claimedAt)
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
    async delete(id) {
        const existing = await this.prisma.kitchenTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!existing) {
            return false;
        }
        await this.prisma.kitchenTask.update({
            where: { tenantId_id: { tenantId: this.tenantId, id } },
            data: { deletedAt: new Date() },
        });
        return true;
    }
    async clear() {
        // No-op for Prisma stores — we don't bulk-delete production data
    }
    mapToManifestEntity(task, claims = []) {
        const activeClaim = claims[0];
        return {
            id: task.id,
            tenantId: task.tenantId,
            title: task.title,
            summary: task.summary,
            status: task.status, // No remapping — manifest uses same values as DB
            priority: task.priority,
            complexity: task.complexity,
            tags: Array.isArray(task.tags) ? task.tags.join(",") : "",
            dueDate: task.dueDate ? task.dueDate.getTime() : 0,
            completedAt: task.completedAt ? task.completedAt.getTime() : 0,
            claimedBy: activeClaim?.employeeId ?? "",
            claimedAt: activeClaim?.claimedAt.getTime() ?? 0,
            createdAt: task.createdAt.getTime(),
            updatedAt: task.updatedAt.getTime(),
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
export class AllergenWarningPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const warnings = await this.prisma.allergenWarning.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return warnings.map((warning) => this.mapToManifestEntity(warning));
    }
    async getById(id) {
        const warning = await this.prisma.allergenWarning.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return warning ? this.mapToManifestEntity(warning) : undefined;
    }
    async create(data) {
        const warning = await this.prisma.allergenWarning.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                eventId: data.eventId,
                dishId: data.dishId || null,
                warningType: data.warningType,
                allergens: this.stringToArray(data.allergens),
                affectedGuests: this.stringToArray(data.affectedGuests),
                severity: data.severity || "warning",
                isAcknowledged: data.isAcknowledged ?? false,
                acknowledgedBy: data.acknowledgedBy || null,
                acknowledgedAt: data.acknowledgedAt
                    ? new Date(data.acknowledgedAt)
                    : null,
                overrideReason: data.overrideReason || null,
                resolved: data.resolved ?? false,
                resolvedAt: data.resolvedAt
                    ? new Date(data.resolvedAt)
                    : null,
                notes: data.notes || null,
            },
        });
        return this.mapToManifestEntity(warning);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.allergenWarning.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    isAcknowledged: data.isAcknowledged,
                    acknowledgedBy: data.acknowledgedBy,
                    acknowledgedAt: data.acknowledgedAt
                        ? new Date(data.acknowledgedAt)
                        : undefined,
                    overrideReason: data.overrideReason,
                    resolved: data.resolved,
                    resolvedAt: data.resolvedAt
                        ? new Date(data.resolvedAt)
                        : undefined,
                    notes: data.notes,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.allergenWarning.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.allergenWarning.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    /**
     * Convert Manifest string property to Prisma array
     * Manifest stores arrays as comma-separated strings
     */
    stringToArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === "string" && value.length > 0) {
            return value.split(",").filter(Boolean);
        }
        return [];
    }
    /**
     * Convert Prisma array to Manifest string property
     */
    arrayToString(arr) {
        if (!(arr && Array.isArray(arr)) || arr.length === 0) {
            return "";
        }
        return arr.join(",");
    }
    mapToManifestEntity(warning) {
        return {
            id: warning.id,
            tenantId: warning.tenantId,
            eventId: warning.eventId,
            dishId: warning.dishId ?? "",
            warningType: warning.warningType,
            allergens: this.arrayToString(warning.allergens),
            affectedGuests: this.arrayToString(warning.affectedGuests),
            severity: warning.severity,
            isAcknowledged: warning.isAcknowledged,
            acknowledgedBy: warning.acknowledgedBy ?? "",
            acknowledgedAt: warning.acknowledgedAt
                ? warning.acknowledgedAt.getTime()
                : 0,
            overrideReason: warning.overrideReason ?? "",
            resolved: warning.resolved,
            resolvedAt: warning.resolvedAt ? warning.resolvedAt.getTime() : 0,
            notes: warning.notes ?? "",
            createdAt: warning.createdAt.getTime(),
            updatedAt: warning.updatedAt.getTime(),
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
export class AlertsConfigPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.alertsConfig.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.alertsConfig.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.alertsConfig.create({
            data: {
                tenantId: this.tenantId,
                id,
                channel: data.channel ?? "",
                destination: data.destination ?? "",
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.channel !== undefined) {
                patch.channel = data.channel;
            }
            if (data.destination !== undefined) {
                patch.destination = data.destination;
            }
            const row = await this.prisma.alertsConfig.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.alertsConfig.delete({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.alertsConfig.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
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
export class PrepTaskPlanWorkflowPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.prepTaskPlanWorkflow.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.prepTaskPlanWorkflow.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const now = new Date();
        const created = await this.prisma.prepTaskPlanWorkflow.create({
            data: {
                tenantId: this.tenantId,
                id,
                eventId: data.eventId ?? "",
                idempotencyKey: data.idempotencyKey ?? id,
                status: data.status ?? "created",
                currentStep: data.currentStep ?? 0,
                totalSteps: data.totalSteps ?? 5,
                generationOptions: data.generationOptions ?? "{}",
                generatedTasks: data.generatedTasks ?? "[]",
                reviewedTasks: data.reviewedTasks ?? "[]",
                approvedTaskIds: data.approvedTaskIds ?? "[]",
                rejectedTaskIds: data.rejectedTaskIds ?? "[]",
                instantiatedTaskIds: data.instantiatedTaskIds ?? "[]",
                scheduledWindows: data.scheduledWindows ?? "{}",
                constraintOutcomes: data.constraintOutcomes ?? "[]",
                errors: data.errors ?? "[]",
                warnings: data.warnings ?? "[]",
                generatedCount: data.generatedCount ?? 0,
                approvedCount: data.approvedCount ?? 0,
                instantiatedCount: data.instantiatedCount ?? 0,
                reviewedBy: data.reviewedBy || null,
                reviewedAt: timestampToDate(data.reviewedAt),
                approvedBy: data.approvedBy || null,
                approvedAt: timestampToDate(data.approvedAt),
                startedAt: timestampToDate(data.startedAt),
                completedAt: timestampToDate(data.completedAt),
                createdAt: timestampToDate(data.createdAt) ?? now,
                updatedAt: timestampToDate(data.updatedAt) ?? now,
            },
        });
        return this.mapToManifestEntity(created);
    }
    async update(id, data) {
        try {
            // Build update payload — only set fields the caller actually provided
            // so we never clobber existing workflow state with stale defaults.
            const updateData = {
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
            ];
            for (const f of stringFields) {
                if (data[f] !== undefined) {
                    // reviewedBy / approvedBy are nullable strings — empty string -> null
                    if ((f === "reviewedBy" || f === "approvedBy") && data[f] === "") {
                        updateData[f] = null;
                    }
                    else {
                        updateData[f] = data[f];
                    }
                }
            }
            const numberFields = [
                "currentStep",
                "totalSteps",
                "generatedCount",
                "approvedCount",
                "instantiatedCount",
            ];
            for (const f of numberFields) {
                if (data[f] !== undefined) {
                    updateData[f] = data[f];
                }
            }
            const dateFields = [
                "reviewedAt",
                "approvedAt",
                "startedAt",
                "completedAt",
            ];
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
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.prepTaskPlanWorkflow.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.prepTaskPlanWorkflow.updateMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }
    /**
     * Map the Prisma row to a Manifest EntityInstance.
     * Timestamps become epoch-millis numbers (manifest contract); nullable
     * scalars get manifest-default empty strings/zero numbers so guards like
     * `self.status == ""` behave consistently.
     */
    mapToManifestEntity(w) {
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
            deletedAt: w.deletedAt ? w.deletedAt.getTime() : 0,
            isDeleted: w.deletedAt !== null,
        };
    }
}
/**
 * Convert a manifest timestamp (epoch millis number) to a Prisma `Date | null`.
 * Treats `0`, `undefined`, and `null` as "no value" since the manifest uses
 * `0` as the default for unset timestamps.
 */
function timestampToDate(value) {
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
export function createPrismaStoreProvider(prisma, tenantId) {
    return (entityName) => {
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
                return new EventStaffAssignmentPrismaStore(prisma, tenantId);
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
            default:
                console.error(`[createPrismaStoreProvider] No store for entity "${entityName}" — commands will fail`);
                return undefined;
        }
    };
}
/**
 * Load a PrepTask from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepTaskFromPrisma(prisma, tenantId, taskId) {
    const store = new PrepTaskPrismaStore(prisma, tenantId);
    return store.getById(taskId);
}
/**
 * Sync a PrepTask from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepTaskToPrisma(prisma, tenantId, entity) {
    const store = new PrepTaskPrismaStore(prisma, tenantId);
    // Check if task exists
    const existing = await prisma.prepTask.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a Recipe from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeFromPrisma(prisma, tenantId, recipeId) {
    const store = new RecipePrismaStore(prisma, tenantId);
    return store.getById(recipeId);
}
/**
 * Sync a Recipe from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeToPrisma(prisma, tenantId, entity) {
    const store = new RecipePrismaStore(prisma, tenantId);
    // Check if recipe exists
    const existing = await prisma.recipe.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a Dish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadDishFromPrisma(prisma, tenantId, dishId) {
    const store = new DishPrismaStore(prisma, tenantId);
    return store.getById(dishId);
}
/**
 * Sync a Dish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncDishToPrisma(prisma, tenantId, entity) {
    const store = new DishPrismaStore(prisma, tenantId);
    // Check if dish exists
    const existing = await prisma.dish.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Prisma-backed store for Menu entities
 *
 * Maps Manifest Menu entities to the Prisma Menu table.
 */
export class MenuPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const menus = await this.prisma.menu.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return menus.map((menu) => this.mapToManifestEntity(menu));
    }
    async getById(id) {
        const menu = await this.prisma.menu.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return menu ? this.mapToManifestEntity(menu) : undefined;
    }
    async create(data) {
        const menu = await this.prisma.menu.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                name: data.name,
                description: data.description || null,
                category: data.category || null,
                isActive: data.isActive ?? true,
                basePrice: data.basePrice
                    ? new Prisma.Decimal(data.basePrice)
                    : null,
                pricePerPerson: data.pricePerPerson
                    ? new Prisma.Decimal(data.pricePerPerson)
                    : null,
                minGuests: data.minGuests || null,
                maxGuests: data.maxGuests || null,
            },
        });
        return this.mapToManifestEntity(menu);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.menu.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    isActive: data.isActive,
                    basePrice: data.basePrice
                        ? new Prisma.Decimal(data.basePrice)
                        : undefined,
                    pricePerPerson: data.pricePerPerson
                        ? new Prisma.Decimal(data.pricePerPerson)
                        : undefined,
                    minGuests: data.minGuests,
                    maxGuests: data.maxGuests,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.menu.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.menu.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(menu) {
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
            hasPricePerPerson: menu.pricePerPerson !== null && Number(menu.pricePerPerson) > 0,
            hasGuestConstraints: menu.minGuests !== null ||
                (menu.maxGuests !== null && Number(menu.maxGuests) > 0),
            guestRangeValid: (menu.minGuests ?? 0) <=
                (menu.maxGuests ? Number(menu.maxGuests) : Number.MAX_SAFE_INTEGER),
            createdAt: menu.createdAt.getTime(),
            updatedAt: menu.updatedAt.getTime(),
        };
    }
}
/**
 * Prisma-backed store for MenuDish entities
 *
 * Maps Manifest MenuDish entities to the Prisma MenuDish table.
 */
export class MenuDishPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const menuDishes = await this.prisma.menuDish.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return menuDishes.map((md) => this.mapToManifestEntity(md));
    }
    async getById(id) {
        const menuDish = await this.prisma.menuDish.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return menuDish ? this.mapToManifestEntity(menuDish) : undefined;
    }
    async create(data) {
        const menuDish = await this.prisma.menuDish.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                menuId: data.menuId,
                dishId: data.dishId,
                course: data.course || null,
                sortOrder: data.sortOrder ?? 0,
                isOptional: data.isOptional ?? false,
            },
        });
        return this.mapToManifestEntity(menuDish);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.menuDish.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    course: data.course,
                    sortOrder: data.sortOrder,
                    isOptional: data.isOptional,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.menuDish.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.menuDish.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(menuDish) {
        return {
            id: menuDish.id,
            tenantId: menuDish.tenantId,
            menuId: menuDish.menuId,
            dishId: menuDish.dishId,
            course: menuDish.course ?? "",
            sortOrder: menuDish.sortOrder,
            isOptional: menuDish.isOptional,
            createdAt: menuDish.createdAt.getTime(),
            updatedAt: menuDish.updatedAt.getTime(),
        };
    }
}
/**
 * Load a Menu from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadMenuFromPrisma(prisma, tenantId, menuId) {
    const store = new MenuPrismaStore(prisma, tenantId);
    return store.getById(menuId);
}
/**
 * Sync a Menu from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncMenuToPrisma(prisma, tenantId, entity) {
    const store = new MenuPrismaStore(prisma, tenantId);
    // Check if menu exists
    const existing = await prisma.menu.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a MenuDish from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadMenuDishFromPrisma(prisma, tenantId, menuDishId) {
    const store = new MenuDishPrismaStore(prisma, tenantId);
    return store.getById(menuDishId);
}
/**
 * Sync a MenuDish from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncMenuDishToPrisma(prisma, tenantId, entity) {
    const store = new MenuDishPrismaStore(prisma, tenantId);
    // Check if menu dish exists
    const existing = await prisma.menuDish.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Prisma-backed store for PrepList entities
 *
 * Maps Manifest PrepList entities to the Prisma PrepList table.
 */
export class PrepListPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const prepLists = await this.prisma.prepList.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return prepLists.map((prepList) => this.mapToManifestEntity(prepList));
    }
    async getById(id) {
        const prepList = await this.prisma.prepList.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return prepList ? this.mapToManifestEntity(prepList) : undefined;
    }
    async create(data) {
        const prepList = await this.prisma.prepList.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                eventId: data.eventId,
                name: data.name,
                batchMultiplier: data.batchMultiplier ?? 1,
                dietaryRestrictions: data.dietaryRestrictions || [],
                status: data.status || "draft",
                totalItems: data.totalItems || 0,
                totalEstimatedTime: data.totalEstimatedTime || 0,
                notes: data.notes || null,
                generatedAt: data.generatedAt
                    ? new Date(data.generatedAt)
                    : new Date(),
                finalizedAt: data.finalizedAt
                    ? new Date(data.finalizedAt)
                    : null,
            },
        });
        return this.mapToManifestEntity(prepList);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.prepList.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    name: data.name,
                    batchMultiplier: data.batchMultiplier,
                    dietaryRestrictions: data.dietaryRestrictions,
                    status: data.status,
                    totalItems: data.totalItems,
                    totalEstimatedTime: data.totalEstimatedTime,
                    notes: data.notes,
                    finalizedAt: data.finalizedAt
                        ? new Date(data.finalizedAt)
                        : undefined,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.prepList.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.prepList.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(prepList) {
        const batchMultiplier = Number(prepList.batchMultiplier ?? 1);
        return {
            id: prepList.id,
            tenantId: prepList.tenantId,
            eventId: prepList.eventId,
            name: prepList.name,
            batchMultiplier,
            dietaryRestrictions: Array.isArray(prepList.dietaryRestrictions)
                ? prepList.dietaryRestrictions.join(",")
                : "",
            status: prepList.status ?? "draft",
            totalItems: prepList.totalItems ?? 0,
            totalEstimatedTime: prepList.totalEstimatedTime ?? 0,
            notes: prepList.notes ?? "",
            generatedAt: prepList.generatedAt
                ? prepList.generatedAt.getTime()
                : Date.now(),
            finalizedAt: prepList.finalizedAt ? prepList.finalizedAt.getTime() : 0,
            isActive: prepList.deletedAt === null,
            isDraft: prepList.status === "draft",
            isFinalized: prepList.status === "finalized",
            isCompleted: prepList.status === "completed",
            hasItems: (prepList.totalItems ?? 0) > 0,
            avgTimePerItem: (prepList.totalItems ?? 0) > 0
                ? (prepList.totalEstimatedTime ?? 0) / (prepList.totalItems ?? 1)
                : 0,
            createdAt: prepList.createdAt.getTime(),
            updatedAt: prepList.updatedAt.getTime(),
        };
    }
}
/**
 * Prisma-backed store for PrepListItem entities
 *
 * Maps Manifest PrepListItem entities to the Prisma PrepListItem table.
 */
export class PrepListItemPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const items = await this.prisma.prepListItem.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return items.map((item) => this.mapToManifestEntity(item));
    }
    async getById(id) {
        const item = await this.prisma.prepListItem.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return item ? this.mapToManifestEntity(item) : undefined;
    }
    async create(data) {
        const item = await this.prisma.prepListItem.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                prepListId: data.prepListId,
                stationId: data.stationId || null,
                stationName: data.stationName,
                ingredientId: data.ingredientId,
                ingredientName: data.ingredientName,
                category: data.category || null,
                baseQuantity: data.baseQuantity ?? 0,
                baseUnit: data.baseUnit || "",
                scaledQuantity: data.scaledQuantity ?? 0,
                scaledUnit: data.scaledUnit || "",
                isOptional: data.isOptional ?? false,
                preparationNotes: data.preparationNotes || null,
                allergens: data.allergens || [],
                dietarySubstitutions: data.dietarySubstitutions || [],
                dishId: data.dishId || null,
                dishName: data.dishName || null,
                recipeVersionId: data.recipeVersionId || null,
                sortOrder: data.sortOrder ?? 0,
                isCompleted: data.isCompleted ?? false,
                completedAt: data.completedAt
                    ? new Date(data.completedAt)
                    : null,
                completedBy: data.completedBy || null,
            },
        });
        return this.mapToManifestEntity(item);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.prepListItem.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    stationId: data.stationId,
                    stationName: data.stationName,
                    baseQuantity: data.baseQuantity,
                    scaledQuantity: data.scaledQuantity,
                    baseUnit: data.baseUnit,
                    scaledUnit: data.scaledUnit,
                    preparationNotes: data.preparationNotes,
                    allergens: data.allergens,
                    dietarySubstitutions: data.dietarySubstitutions,
                    sortOrder: data.sortOrder,
                    isCompleted: data.isCompleted,
                    completedAt: data.completedAt
                        ? new Date(data.completedAt)
                        : undefined,
                    completedBy: data.completedBy,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.prepListItem.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.prepListItem.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(item) {
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
            allergens: Array.isArray(item.allergens) ? item.allergens.join(",") : "",
            dietarySubstitutions: Array.isArray(item.dietarySubstitutions)
                ? item.dietarySubstitutions.join(",")
                : "",
            dishId: item.dishId ?? "",
            dishName: item.dishName ?? "",
            recipeVersionId: item.recipeVersionId ?? "",
            sortOrder: item.sortOrder ?? 0,
            isCompleted: item.isCompleted ?? false,
            completedAt: item.completedAt ? item.completedAt.getTime() : 0,
            completedBy: item.completedBy ?? "",
            hasAllergens: Array.isArray(item.allergens) && item.allergens.length > 0,
            hasDietarySubstitutions: Array.isArray(item.dietarySubstitutions) &&
                item.dietarySubstitutions.length > 0,
            isRequired: !(item.isOptional ?? false),
            createdAt: item.createdAt.getTime(),
            updatedAt: item.updatedAt.getTime(),
        };
    }
}
/**
 * Load a PrepList from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepListFromPrisma(prisma, tenantId, prepListId) {
    const store = new PrepListPrismaStore(prisma, tenantId);
    return store.getById(prepListId);
}
/**
 * Sync a PrepList from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepListToPrisma(prisma, tenantId, entity) {
    const store = new PrepListPrismaStore(prisma, tenantId);
    // Check if prep list exists
    const existing = await prisma.prepList.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a PrepListItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepListItemFromPrisma(prisma, tenantId, itemId) {
    const store = new PrepListItemPrismaStore(prisma, tenantId);
    return store.getById(itemId);
}
/**
 * Sync a PrepListItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepListItemToPrisma(prisma, tenantId, entity) {
    const store = new PrepListItemPrismaStore(prisma, tenantId);
    // Check if prep list item exists
    const existing = await prisma.prepListItem.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Prisma-backed store for Station entities
 *
 * Maps Manifest Station entities to the Prisma Station table.
 */
export class StationPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const stations = await this.prisma.station.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return stations.map((station) => this.mapToManifestEntity(station));
    }
    async getById(id) {
        const station = await this.prisma.station.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return station ? this.mapToManifestEntity(station) : undefined;
    }
    async create(data) {
        const station = await this.prisma.station.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                locationId: data.locationId,
                name: data.name,
                stationType: data.stationType || "prep-station",
                capacitySimultaneousTasks: data.capacitySimultaneousTasks || 1,
                equipmentList: typeof data.equipmentList === "string"
                    ? data.equipmentList.split(",").filter(Boolean)
                    : [],
                isActive: data.isActive ?? true,
                notes: data.notes || null,
            },
        });
        return this.mapToManifestEntity(station);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.station.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    name: data.name,
                    stationType: data.stationType,
                    capacitySimultaneousTasks: data.capacitySimultaneousTasks,
                    equipmentList: data.equipmentList !== undefined
                        ? typeof data.equipmentList === "string"
                            ? data.equipmentList.split(",").filter(Boolean)
                            : []
                        : undefined,
                    isActive: data.isActive,
                    notes: data.notes,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.station.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.station.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(station) {
        return {
            id: station.id,
            tenantId: station.tenantId,
            locationId: station.locationId,
            name: station.name,
            stationType: station.stationType ?? "prep-station",
            capacitySimultaneousTasks: station.capacitySimultaneousTasks ?? 1,
            equipmentList: Array.isArray(station.equipmentList)
                ? station.equipmentList.join(",")
                : "",
            isActive: station.isActive ?? true,
            currentTaskCount: 0, // Not persisted in Prisma - computed at runtime
            notes: station.notes ?? "",
            createdAt: station.createdAt.getTime(),
            updatedAt: station.updatedAt.getTime(),
        };
    }
}
/**
 * Load a Station from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadStationFromPrisma(prisma, tenantId, stationId) {
    const store = new StationPrismaStore(prisma, tenantId);
    return store.getById(stationId);
}
/**
 * Sync a Station from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncStationToPrisma(prisma, tenantId, entity) {
    const store = new StationPrismaStore(prisma, tenantId);
    // Check if station exists
    const existing = await prisma.station.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load an InventoryItem from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadInventoryItemFromPrisma(prisma, tenantId, itemId) {
    const store = new InventoryItemPrismaStore(prisma, tenantId);
    return store.getById(itemId);
}
/**
 * Sync an InventoryItem from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncInventoryItemToPrisma(prisma, tenantId, entity) {
    const store = new InventoryItemPrismaStore(prisma, tenantId);
    // Check if inventory item exists
    const existing = await prisma.inventoryItem.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a RecipeVersion from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeVersionFromPrisma(prisma, tenantId, versionId) {
    const store = new RecipeVersionPrismaStore(prisma, tenantId);
    return store.getById(versionId);
}
/**
 * Sync a RecipeVersion from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeVersionToPrisma(prisma, tenantId, entity) {
    const store = new RecipeVersionPrismaStore(prisma, tenantId);
    // Check if recipe version exists
    const existing = await prisma.recipeVersion.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load an Ingredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadIngredientFromPrisma(prisma, tenantId, ingredientId) {
    const store = new IngredientPrismaStore(prisma, tenantId);
    return store.getById(ingredientId);
}
/**
 * Sync an Ingredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncIngredientToPrisma(prisma, tenantId, entity) {
    const store = new IngredientPrismaStore(prisma, tenantId);
    // Check if ingredient exists
    const existing = await prisma.ingredient.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Load a RecipeIngredient from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadRecipeIngredientFromPrisma(prisma, tenantId, recipeIngredientId) {
    const store = new RecipeIngredientPrismaStore(prisma, tenantId);
    return store.getById(recipeIngredientId);
}
/**
 * Sync a RecipeIngredient from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncRecipeIngredientToPrisma(prisma, tenantId, entity) {
    const store = new RecipeIngredientPrismaStore(prisma, tenantId);
    // Check if recipe ingredient exists
    const existing = await prisma.recipeIngredient.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
/**
 * Generic PrismaStore class that wraps entity-specific stores
 *
 * This class provides a unified interface for working with different entity types
 * through their Prisma-backed store implementations. It supports the outbox pattern
 * for reliable event delivery.
 */
export class PrismaStore {
    store;
    outboxWriter;
    eventCollector;
    constructor(config) {
        this.store = createPrismaStoreProvider(config.prisma, config.tenantId)(config.entityName);
        this.outboxWriter = config.outboxWriter;
        this.eventCollector = config.eventCollector;
    }
    async getAll() {
        return this.store.getAll();
    }
    async getById(id) {
        return this.store.getById(id);
    }
    async create(data) {
        return this.store.create(data);
    }
    async update(id, data) {
        return this.store.update(id, data);
    }
    async delete(id) {
        return this.store.delete(id);
    }
    async clear() {
        return this.store.clear();
    }
    /**
     * Write events to the outbox within a transaction
     *
     * This method is called by the manifest runtime to persist events
     * transactionally with state mutations.
     */
    async writeEvents(events) {
        // If we have a Prisma transaction context, use it
        // Otherwise, create a new transaction
        if (this.eventCollector) {
            // Add events to the in-memory collector for later writing
            this.eventCollector.push(...events);
        }
        else {
            // Write directly to outbox (creates its own transaction)
            throw new Error("Direct outbox writing not supported - use eventCollector pattern");
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
export function createPrismaOutboxWriter(entityName, tenantId) {
    return async (tx, events) => {
        for (const event of events) {
            const eventData = event;
            await tx.outboxEvent.create({
                data: {
                    tenantId,
                    aggregateType: entityName,
                    eventType: eventData.eventType || eventData.name || "unknown",
                    payload: eventData.payload,
                    aggregateId: eventData.aggregateId ||
                        eventData.payload?.taskId ||
                        eventData.payload?.id ||
                        "unknown",
                    status: "pending",
                },
            });
        }
    };
}
