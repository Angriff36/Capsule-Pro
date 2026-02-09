/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */

import type {
  Dish,
  Ingredient,
  KitchenTaskClaim,
  Menu,
  MenuDish,
  PrepList,
  PrepListItem,
  PrepTask,
  PrismaClient,
  Recipe,
  RecipeIngredient,
  RecipeVersion,
} from "@repo/database";
import { Prisma } from "@repo/database";
import type { Store } from "@repo/manifest";

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
    const tasks = (await this.prisma.prepTask.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    })) as PrepTask[];

    // Fetch claims separately and map them
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

    // Group claims by taskId
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
        name: data.name as string,
        taskType: (data.taskType as string) || "prep",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        quantityTotal: data.quantityTotal as number,
        quantityUnitId: data.quantityUnitId as number | null,
        quantityCompleted: (data.quantityCompleted as number) || 0,
        servingsTotal: data.servingsTotal as number | null,
        startByDate: data.startByDate
          ? new Date(data.startByDate as number)
          : new Date(),
        dueByDate: data.dueByDate
          ? new Date(data.dueByDate as number)
          : new Date(),
        locationId: data.locationId as string,
        dishId: data.dishId as string | null,
        recipeVersionId: data.recipeVersionId as string | null,
        methodId: data.methodId as string | null,
        containerId: data.containerId as string | null,
        estimatedMinutes: data.estimatedMinutes as number | null,
        notes: data.notes as string | null,
      },
    });

    // If task has claim info, create a claim record
    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
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
    } catch {
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
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
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
    } catch {
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
        tags: (data.tags as string[]) || [],
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
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
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
    } catch {
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
export class IngredientPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return ingredients.map((ingredient) =>
      this.mapToManifestEntity(ingredient)
    );
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return ingredient ? this.mapToManifestEntity(ingredient) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const ingredient = await this.prisma.ingredient.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        name: data.name as string,
        category: (data.category as string) || null,
        defaultUnitId: (data.defaultUnitId as number) || 1,
        allergens: (data.allergens as string[]) || [],
        isActive: (data.isActive as boolean) ?? true,
      },
    });
    return this.mapToManifestEntity(ingredient);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.ingredient.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          allergens: data.allergens as string[] | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.ingredient.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.ingredient.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(ingredient: Ingredient): EntityInstance {
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
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
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
    } catch {
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
export class DishPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const dishes = await this.prisma.dish.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return dishes.map((dish) => this.mapToManifestEntity(dish));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const dish = await this.prisma.dish.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return dish ? this.mapToManifestEntity(dish) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const dish = await this.prisma.dish.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        recipeId: (data.recipeId as string) || "",
        name: data.name as string,
        description: (data.description as string) || null,
        category: (data.category as string) || null,
        serviceStyle: (data.serviceStyle as string) || null,
        presentationImageUrl: (data.presentationImageUrl as string) || null,
        dietaryTags: (data.dietaryTags as string[]) || [],
        allergens: (data.allergens as string[]) || [],
        pricePerPerson: (data.pricePerPerson as number) || null,
        costPerPerson: (data.costPerPerson as number) || null,
        minPrepLeadDays: (data.minPrepLeadDays as number) || 0,
        maxPrepLeadDays: (data.maxPrepLeadDays as number) || null,
        portionSizeDescription: (data.portionSizeDescription as string) || null,
        isActive: (data.isActive as boolean) ?? true,
      },
    });
    return this.mapToManifestEntity(dish);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.dish.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          pricePerPerson: data.pricePerPerson as number | null | undefined,
          costPerPerson: data.costPerPerson as number | null | undefined,
          minPrepLeadDays: data.minPrepLeadDays as number | undefined,
          maxPrepLeadDays: data.maxPrepLeadDays as number | null | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.dish.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.dish.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  private mapToManifestEntity(dish: Dish): EntityInstance {
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
export function createPrismaStoreProvider(
  prisma: PrismaClient,
  tenantId: string
): (entityName: string) => Store<EntityInstance> | undefined {
  return (entityName: string) => {
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
      case "PrepList":
        return new PrepListPrismaStore(prisma, tenantId);
      case "PrepListItem":
        return new PrepListItemPrismaStore(prisma, tenantId);
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
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.menu.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.menu.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
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
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
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
    } catch {
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
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return prepLists.map((prepList) => this.mapToManifestEntity(prepList));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const prepList = await this.prisma.prepList.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
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
        dietaryRestrictions: (data.dietaryRestrictions as string[]) || [],
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
          dietaryRestrictions: data.dietaryRestrictions as string[] | undefined,
          status: data.status as string | undefined,
          totalItems: data.totalItems as number | undefined,
          totalEstimatedTime: data.totalEstimatedTime as number | undefined,
          notes: data.notes as string | null | undefined,
          finalizedAt: data.finalizedAt
            ? new Date(data.finalizedAt as number)
            : undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
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
    } catch {
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
      avgTimePerItem:
        (prepList.totalItems ?? 0) > 0
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
export class PrepListItemPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const items = await this.prisma.prepListItem.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });
    return items.map((item) => this.mapToManifestEntity(item));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const item = await this.prisma.prepListItem.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });
    return item ? this.mapToManifestEntity(item) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const item = await this.prisma.prepListItem.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        prepListId: data.prepListId as string,
        stationId: (data.stationId as string) || null,
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
        allergens: (data.allergens as string[]) || [],
        dietarySubstitutions: (data.dietarySubstitutions as string[]) || [],
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
          stationId: data.stationId as string | null | undefined,
          stationName: data.stationName as string | undefined,
          baseQuantity: data.baseQuantity as number | undefined,
          scaledQuantity: data.scaledQuantity as number | undefined,
          baseUnit: data.baseUnit as string | undefined,
          scaledUnit: data.scaledUnit as string | undefined,
          preparationNotes: data.preparationNotes as string | null | undefined,
          allergens: data.allergens as string[] | undefined,
          dietarySubstitutions: data.dietarySubstitutions as
            | string[]
            | undefined,
          sortOrder: data.sortOrder as number | undefined,
          isCompleted: data.isCompleted as boolean | undefined,
          completedAt: data.completedAt
            ? new Date(data.completedAt as number)
            : undefined,
          completedBy: data.completedBy as string | null | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch {
      return undefined;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prepListItem.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepListItem.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
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
      hasDietarySubstitutions:
        Array.isArray(item.dietarySubstitutions) &&
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
