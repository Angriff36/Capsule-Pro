/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */
import { Prisma } from "@repo/database";
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
        const tasks = (await this.prisma.prepTask.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        }));
        // Fetch claims separately and map them
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
        // Group claims by taskId
        const claimsByTaskId = new Map();
        for (const claim of claims) {
            const existing = claimsByTaskId.get(claim.taskId) || [];
            existing.push(claim);
            claimsByTaskId.set(claim.taskId, existing);
        }
        return tasks.map((task) => this.mapToManifestEntity(task, claimsByTaskId.get(task.id) || []));
    }
    async getById(id) {
        const task = await this.prisma.prepTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!task)
            return undefined;
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
        if (!existing)
            return undefined;
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
        catch {
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
        catch {
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
        catch {
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
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch {
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
        catch {
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
            stepCount: 0, // Would need to query recipe_steps table
            createdAt: version.createdAt.getTime(),
            totalTimeMinutes: prepTime + cookTime + restTime,
            isVersion1: version.versionNumber === 1,
            isHighDifficulty: (version.difficultyLevel ?? 1) >= 4,
        };
    }
}
/**
 * Prisma-backed store for Ingredient entities
 *
 * Maps Manifest Ingredient entities to the Prisma Ingredient table.
 */
export class IngredientPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const ingredients = await this.prisma.ingredient.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return ingredients.map((ingredient) => this.mapToManifestEntity(ingredient));
    }
    async getById(id) {
        const ingredient = await this.prisma.ingredient.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return ingredient ? this.mapToManifestEntity(ingredient) : undefined;
    }
    async create(data) {
        const ingredient = await this.prisma.ingredient.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                name: data.name,
                category: data.category || null,
                defaultUnitId: data.defaultUnitId || 1,
                allergens: data.allergens || [],
                isActive: data.isActive ?? true,
            },
        });
        return this.mapToManifestEntity(ingredient);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.ingredient.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    allergens: data.allergens,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch {
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.ingredient.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async clear() {
        await this.prisma.ingredient.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(ingredient) {
        return {
            id: ingredient.id,
            tenantId: ingredient.tenantId,
            name: ingredient.name,
            category: ingredient.category ?? "",
            defaultUnitId: ingredient.defaultUnitId,
            allergens: Array.isArray(ingredient.allergens)
                ? ingredient.allergens.join(",")
                : "",
            isActive: ingredient.isActive,
            createdAt: ingredient.createdAt.getTime(),
            updatedAt: ingredient.updatedAt.getTime(),
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
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch {
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
        catch {
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
            sortOrder: ingredient.sortOrder,
            createdAt: ingredient.createdAt.getTime(),
            updatedAt: ingredient.updatedAt.getTime(),
        };
    }
}
/**
 * Prisma-backed store for Dish entities
 *
 * Maps Manifest Dish entities to the Prisma Dish table.
 */
export class DishPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const dishes = await this.prisma.dish.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        });
        return dishes.map((dish) => this.mapToManifestEntity(dish));
    }
    async getById(id) {
        const dish = await this.prisma.dish.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return dish ? this.mapToManifestEntity(dish) : undefined;
    }
    async create(data) {
        const dish = await this.prisma.dish.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                recipeId: data.recipeId || "",
                name: data.name,
                description: data.description || null,
                category: data.category || null,
                serviceStyle: data.serviceStyle || null,
                presentationImageUrl: data.presentationImageUrl || null,
                dietaryTags: data.dietaryTags || [],
                allergens: data.allergens || [],
                pricePerPerson: data.pricePerPerson || null,
                costPerPerson: data.costPerPerson || null,
                minPrepLeadDays: data.minPrepLeadDays || 0,
                maxPrepLeadDays: data.maxPrepLeadDays || null,
                portionSizeDescription: data.portionSizeDescription || null,
                isActive: data.isActive ?? true,
            },
        });
        return this.mapToManifestEntity(dish);
    }
    async update(id, data) {
        try {
            const updated = await this.prisma.dish.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: {
                    pricePerPerson: data.pricePerPerson,
                    costPerPerson: data.costPerPerson,
                    minPrepLeadDays: data.minPrepLeadDays,
                    maxPrepLeadDays: data.maxPrepLeadDays,
                    updatedAt: new Date(),
                },
            });
            return this.mapToManifestEntity(updated);
        }
        catch {
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.dish.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async clear() {
        await this.prisma.dish.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    mapToManifestEntity(dish) {
        return {
            id: dish.id,
            tenantId: dish.tenantId,
            name: dish.name,
            recipeId: dish.recipeId ?? "",
            description: dish.description ?? "",
            category: dish.category ?? "",
            serviceStyle: dish.serviceStyle ?? "",
            presentationImageUrl: dish.presentationImageUrl ?? "",
            dietaryTags: Array.isArray(dish.dietaryTags)
                ? dish.dietaryTags.join(",")
                : "",
            allergens: Array.isArray(dish.allergens) ? dish.allergens.join(",") : "",
            pricePerPerson: Number(dish.pricePerPerson ?? 0),
            costPerPerson: Number(dish.costPerPerson ?? 0),
            minPrepLeadDays: dish.minPrepLeadDays,
            maxPrepLeadDays: dish.maxPrepLeadDays ?? dish.minPrepLeadDays,
            portionSizeDescription: dish.portionSizeDescription ?? "",
            isActive: dish.isActive,
            createdAt: dish.createdAt.getTime(),
            updatedAt: dish.updatedAt.getTime(),
        };
    }
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
            case "Dish":
                return new DishPrismaStore(prisma, tenantId);
            case "Menu":
                return new MenuPrismaStore(prisma, tenantId);
            case "MenuDish":
                return new MenuDishPrismaStore(prisma, tenantId);
            // TODO: Add StationPrismaStore and InventoryItemPrismaStore as needed
            default:
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
        catch {
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
        catch {
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
        catch {
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
        catch {
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
