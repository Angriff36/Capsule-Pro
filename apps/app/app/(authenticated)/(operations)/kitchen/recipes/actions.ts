"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runManifestBatch } from "@/lib/manifest-batch";
import { runManifestCommand } from "@/lib/manifest-command";
import { invariant } from "../../../../lib/invariant";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

const parseList = (value: FormDataEntryValue | null) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDecimalNumber = (value: unknown, field: string): number => {
  if (typeof value === "number") {
    return value;
  }

  if (Prisma.Decimal.isDecimal(value)) {
    const parsed = Number(value.toJSON());
    invariant(
      Number.isFinite(parsed),
      `${field} must be a finite decimal value`
    );
    return parsed;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    invariant(Number.isFinite(parsed), `${field} must be a numeric string`);
    return parsed;
  }

  invariant(false, `${field} must be a number or Decimal`);
};

const toDecimalNumberOrNull = (
  value: unknown,
  field: string
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return toDecimalNumber(value, field);
};

const readImageFile = (formData: FormData, key: string) => {
  const file = formData.get(key);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Image must be an image file.");
  }

  return file;
};

const uploadImage = async (
  tenantId: string,
  pathPrefix: string,
  file: File
) => {
  const filename = file.name?.trim() || "image";
  const blob = await put(
    `tenants/${tenantId}/${pathPrefix}/${filename}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    }
  );
  return blob.url;
};

export const updateRecipeImage = async (
  recipeId: string,
  formData: FormData
) => {
  const tenantId = await requireTenantId();
  if (!recipeId) {
    throw new Error("Recipe id is required.");
  }

  const imageFile = readImageFile(formData, "imageFile");
  if (!imageFile) {
    return;
  }
  const imageUrl = await uploadImage(
    tenantId,
    `recipes/${recipeId}/hero`,
    imageFile
  );

  const [version] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND recipe_id = ${recipeId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `
  );

  let versionId = version?.id;
  let newVersionData: {
    recipe: {
      name: string;
      category: string | null;
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
    };
    maxVersion: number;
    fallbackUnitId: number;
  } | null = null;

  if (!versionId) {
    const [maxVersion] = await database.$queryRaw<{ max: number | null }[]>(
      Prisma.sql`
        SELECT MAX(version_number)::int AS max
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}
          AND recipe_id = ${recipeId}
      `
    );
    const [fallbackUnit] = await database.$queryRaw<{ id: number }[]>(
      Prisma.sql`
        SELECT id
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
    );

    if (!fallbackUnit?.id) {
      throw new Error("No units configured in core.units.");
    }

    const [recipe] = await database.$queryRaw<
      {
        name: string;
        category: string | null;
        cuisine_type: string | null;
        description: string | null;
        tags: string[] | null;
      }[]
    >(
      Prisma.sql`
        SELECT name, category, cuisine_type, description, tags
        FROM tenant_kitchen.recipes
        WHERE tenant_id = ${tenantId}
          AND id = ${recipeId}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (!recipe) {
      throw new Error("Recipe not found.");
    }

    versionId = randomUUID();
    newVersionData = {
      recipe,
      maxVersion: maxVersion?.max ?? 0,
      fallbackUnitId: fallbackUnit.id,
    };
  }

  const [step] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.recipe_steps
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
      LIMIT 1
    `
  );

  await database.$transaction(async (tx) => {
    if (newVersionData) {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.recipe_versions (
            tenant_id,
            id,
            recipe_id,
            name,
            category,
            cuisine_type,
            description,
            tags,
            version_number,
            yield_quantity,
            yield_unit_id,
            updated_at
          )
          VALUES (
            ${tenantId},
            ${versionId},
            ${recipeId},
            ${newVersionData.recipe.name},
            ${newVersionData.recipe.category},
            ${newVersionData.recipe.cuisine_type},
            ${newVersionData.recipe.description},
            ${newVersionData.recipe.tags ?? null},
            ${newVersionData.maxVersion + 1},
            1,
            ${newVersionData.fallbackUnitId},
            NOW()
          )
        `
      );
    }

    if (step?.id) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE tenant_kitchen.recipe_steps
          SET image_url = ${imageUrl}
          WHERE tenant_id = ${tenantId}
            AND id = ${step.id}
        `
      );
    } else {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.recipe_steps (
            tenant_id,
            id,
            recipe_version_id,
            step_number,
            instruction,
            image_url,
            updated_at
          )
          VALUES (
            ${tenantId},
            ${randomUUID()},
            ${versionId},
            1,
            'Reference photo',
            ${imageUrl},
            NOW()
          )
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "recipe",
        aggregateId: recipeId,
        eventType: "recipe.image.updated",
        payload: {
          recipeId,
          imageUrl,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes");
};

export const createDish = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    throw new Error("Dish name and recipe are required.");
  }

  const category = String(formData.get("category") || "").trim() || null;
  const serviceStyle =
    String(formData.get("serviceStyle") || "").trim() || null;
  const description = String(formData.get("description") || "").trim() || null;
  const imageFile = readImageFile(formData, "imageFile");
  const dietaryTags = parseList(formData.get("dietaryTags"));
  const allergens = parseList(formData.get("allergens"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const costPerPerson = parseNumber(formData.get("costPerPerson"));
  const minLead = parseNumber(formData.get("minPrepLeadDays"));
  const maxLead = parseNumber(formData.get("maxPrepLeadDays"));
  const portionSize =
    String(formData.get("portionSizeDescription") || "").trim() || null;

  const dishId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `dishes/${dishId}/hero`, imageFile)
    : null;

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (
        tenant_id,
        id,
        recipe_id,
        name,
        description,
        category,
        service_style,
        presentation_image_url,
        dietary_tags,
        allergens,
        price_per_person,
        cost_per_person,
        min_prep_lead_days,
        max_prep_lead_days,
        portion_size_description,
        is_active,
        updated_at
      )
      VALUES (
        ${tenantId},
        ${dishId},
        ${recipeId},
        ${name},
        ${description},
        ${category},
        ${serviceStyle},
        ${imageUrl},
        ${dietaryTags.length > 0 ? dietaryTags : null},
        ${allergens.length > 0 ? allergens : null},
        ${pricePerPerson},
        ${costPerPerson},
        ${minLead ?? 0},
        ${maxLead},
        ${portionSize},
        true,
        NOW()
      )
    `
  );

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes?tab=dishes");
};

export interface RecipeForEdit {
  category: string | null;
  description: string | null;
  id: string;
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    sortOrder: number;
  }[];
  name: string;
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    imageUrl: string | null;
  }[];
  tags: string[];
  version: {
    id: string;
    versionNumber: number;
    yieldQuantity: number;
    yieldUnit: string;
    yieldDescription: string | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    restTimeMinutes: number | null;
    difficultyLevel: number | null;
    notes: string | null;
  };
}

export const getRecipeForEdit = async (
  recipeId: string
): Promise<RecipeForEdit | null> => {
  const tenantId = await requireTenantId();

  if (!recipeId) {
    return null;
  }

  // Fetch recipe base data
  const [recipe] = await database.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, name, category, cuisine_type, description, tags
      FROM tenant_kitchen.recipes
      WHERE id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!recipe) {
    return null;
  }

  // Fetch latest version
  let [version] = await database.$queryRaw<
    {
      id: string;
      version_number: number;
      yield_quantity: number;
      yield_unit_id: number;
      yield_description: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      rest_time_minutes: number | null;
      difficulty_level: number | null;
      notes: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        version_number,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        notes
      FROM tenant_kitchen.recipe_versions
      WHERE recipe_id = ${recipeId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY version_number DESC
      LIMIT 1
    `
  );

  let yieldUnit = "";
  if (version) {
    // Fetch unit code for yield
    const [yieldUnitRow] = await database.$queryRaw<{ code: string }[]>(
      Prisma.sql`
        SELECT code
        FROM core.units
        WHERE id = ${version.yield_unit_id}
        LIMIT 1
      `
    );
    yieldUnit = yieldUnitRow?.code ?? "";
  } else {
    const [maxVersion] = await database.$queryRaw<{ max: number | null }[]>(
      Prisma.sql`
        SELECT MAX(version_number)::int AS max
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}
          AND recipe_id = ${recipeId}
      `
    );
    const [fallbackUnit] = await database.$queryRaw<
      { id: number; code: string }[]
    >(
      Prisma.sql`
        SELECT id, code
        FROM core.units
        ORDER BY id ASC
        LIMIT 1
      `
    );

    if (!fallbackUnit?.id) {
      throw new Error("No units configured in core.units.");
    }

    const newVersionId = randomUUID();
    await database.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.recipe_versions (
          tenant_id,
          id,
          recipe_id,
          name,
          category,
          cuisine_type,
          description,
          tags,
          version_number,
          yield_quantity,
          yield_unit_id,
          updated_at
        )
        VALUES (
          ${tenantId},
          ${newVersionId},
          ${recipeId},
          ${recipe.name},
          ${recipe.category},
          ${recipe.cuisine_type},
          ${recipe.description},
          ${recipe.tags ?? null},
          ${(maxVersion?.max ?? 0) + 1},
          1,
          ${fallbackUnit.id},
          NOW()
        )
      `
    );

    version = {
      id: newVersionId,
      version_number: (maxVersion?.max ?? 0) + 1,
      yield_quantity: 1,
      yield_unit_id: fallbackUnit.id,
      yield_description: null,
      prep_time_minutes: null,
      cook_time_minutes: null,
      rest_time_minutes: null,
      difficulty_level: null,
      notes: null,
    };
    yieldUnit = fallbackUnit.code;
  }

  // Fetch ingredients with their names and unit codes
  const ingredients = await database.$queryRaw<
    {
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_code: string;
      is_optional: boolean;
      sort_order: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity,
        u.code AS unit_code,
        COALESCE(ri.is_optional, false) AS is_optional,
        ri.sort_order
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.recipe_version_id = ${version.id}
        AND ri.tenant_id = ${tenantId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );

  // Fetch steps
  const steps = await database.$queryRaw<
    {
      id: string;
      step_number: number;
      instruction: string;
      image_url: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, step_number, instruction, image_url
      FROM tenant_kitchen.recipe_steps
      WHERE recipe_version_id = ${version.id}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
    `
  );

  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    description: recipe.description,
    tags: recipe.tags ?? [],
    version: {
      id: version.id,
      versionNumber: version.version_number,
      yieldQuantity: toDecimalNumber(
        version.yield_quantity,
        "recipe_versions.yield_quantity"
      ),
      yieldUnit,
      yieldDescription: version.yield_description,
      prepTimeMinutes: toDecimalNumberOrNull(
        version.prep_time_minutes,
        "recipe_versions.prep_time_minutes"
      ),
      cookTimeMinutes: toDecimalNumberOrNull(
        version.cook_time_minutes,
        "recipe_versions.cook_time_minutes"
      ),
      restTimeMinutes: toDecimalNumberOrNull(
        version.rest_time_minutes,
        "recipe_versions.rest_time_minutes"
      ),
      difficultyLevel: toDecimalNumberOrNull(
        version.difficulty_level,
        "recipe_versions.difficulty_level"
      ),
      notes: version.notes,
    },
    ingredients: ingredients.map((ing) => ({
      id: ing.id,
      ingredientId: ing.ingredient_id,
      name: ing.ingredient_name,
      quantity: toDecimalNumber(ing.quantity, "recipe_ingredients.quantity"),
      unit: ing.unit_code,
      isOptional: ing.is_optional,
      sortOrder: ing.sort_order,
    })),
    steps: steps.map((step) => ({
      id: step.id,
      stepNumber: step.step_number,
      instruction: step.instruction,
      imageUrl: step.image_url,
    })),
  };
};

// Governed soft-delete (Design B): "Delete" sets deletedAt via the Manifest
// runtime — guards/policy/audit run. It does NOT auto-remove committed
// downstream work (EventDish / PrepListItem / PrepTask): a catalog record and a
// confirmed event commitment are different business facts. Any removal of
// committed work is explicit and user-chosen (see the dish-deletion impact flow
// below). NOT a raw UPDATE, NOT deactivate (separate isActive axis).
const DELETE_REASON = "Deleted from recipe catalog";

/**
 * Impact of deleting a catalog dish: how much CONFIRMED vs DRAFT commitment and
 * active production work still references it. Reads only (bypass the runtime).
 * "Upcoming" = event_date >= today. EventDish/PrepListItem have no status of
 * their own — confirmation is read through the parent Event.status. Active prep
 * tasks are those not already done/canceled.
 */
export interface DishDeletionImpact {
  activePrepListItems: number;
  activePrepTasks: number;
  confirmedUpcomingEvents: number;
  draftUpcomingEvents: number;
  hasDependencies: boolean;
}

export const getDishDeletionImpact = async (
  dishId: string
): Promise<DishDeletionImpact> => {
  const tenantId = await requireTenantId();
  const [row] = await database.$queryRaw<
    {
      confirmed: bigint;
      draft: bigint;
      prep_items: bigint;
      prep_tasks: bigint;
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM tenant_events.event_dishes ed
         JOIN tenant_events.events e
           ON e.tenant_id = ed.tenant_id AND e.id = ed.event_id
        WHERE ed.tenant_id = ${tenantId} AND ed.dish_id = ${dishId}::uuid
          AND ed.deleted_at IS NULL AND e.deleted_at IS NULL
          AND e.status = 'confirmed' AND e.event_date >= CURRENT_DATE) AS confirmed,
      (SELECT COUNT(*) FROM tenant_events.event_dishes ed
         JOIN tenant_events.events e
           ON e.tenant_id = ed.tenant_id AND e.id = ed.event_id
        WHERE ed.tenant_id = ${tenantId} AND ed.dish_id = ${dishId}::uuid
          AND ed.deleted_at IS NULL AND e.deleted_at IS NULL
          AND e.status = 'draft' AND e.event_date >= CURRENT_DATE) AS draft,
      (SELECT COUNT(*) FROM tenant_kitchen.prep_list_items
        WHERE tenant_id = ${tenantId} AND dish_id = ${dishId}::uuid
          AND deleted_at IS NULL) AS prep_items,
      (SELECT COUNT(*) FROM tenant_kitchen.prep_tasks
        WHERE tenant_id = ${tenantId} AND dish_id = ${dishId}::uuid
          AND deleted_at IS NULL AND status::text NOT IN ('done', 'canceled')) AS prep_tasks
  `;
  const confirmedUpcomingEvents = Number(row?.confirmed ?? 0);
  const draftUpcomingEvents = Number(row?.draft ?? 0);
  const activePrepListItems = Number(row?.prep_items ?? 0);
  const activePrepTasks = Number(row?.prep_tasks ?? 0);
  return {
    confirmedUpcomingEvents,
    draftUpcomingEvents,
    activePrepListItems,
    activePrepTasks,
    hasDependencies:
      confirmedUpcomingEvents +
        draftUpcomingEvents +
        activePrepListItems +
        activePrepTasks >
      0,
  };
};

/** EventDish rows for this dish on UPCOMING DRAFT events (the only ones the V1
 * "remove from draft events only" option retires). Reads only. */
const loadUpcomingDraftEventDishIds = async (
  tenantId: string,
  dishId: string
): Promise<string[]> => {
  const rows = await database.$queryRaw<{ id: string }[]>`
    SELECT ed.id::text AS id
    FROM tenant_events.event_dishes ed
    JOIN tenant_events.events e
      ON e.tenant_id = ed.tenant_id AND e.id = ed.event_id
    WHERE ed.tenant_id = ${tenantId} AND ed.dish_id = ${dishId}::uuid
      AND ed.deleted_at IS NULL AND e.deleted_at IS NULL
      AND e.status = 'draft' AND e.event_date >= CURRENT_DATE
  `;
  return rows.map((r) => r.id);
};

/** Delete mode chosen by the user when dependencies exist. */
export type DishDeleteMode = "preserve" | "removeDrafts";

/**
 * Soft-delete a dish, honoring the chosen mode when commitments exist:
 * - "preserve" (default): hide the catalog dish; leave ALL downstream work.
 * - "removeDrafts": explicitly remove the dish from UPCOMING DRAFT event menus
 *   (governed EventDish.remove), preserving confirmed events, then soft-delete.
 * Never removes confirmed commitments or prep work in V1.
 */
const governedDeleteDish = async (dishId: string, mode: DishDeleteMode) => {
  const user = await requireCurrentUser();
  if (mode === "removeDrafts") {
    const tenantId = await requireTenantId();
    const draftEventDishIds = await loadUpcomingDraftEventDishIds(
      tenantId,
      dishId
    );
    const batchResult = await runManifestBatch({
      operations: [
        ...draftEventDishIds.map((eventDishId) => ({
          entity: "EventDish",
          command: "remove",
          params: {
            id: eventDishId,
            reason: "Dish removed from catalog (draft events only)",
            userId: user.id,
          },
        })),
        {
          entity: "Dish",
          command: "softDelete",
          params: {
            id: dishId,
            reason: DELETE_REASON,
            userId: user.id,
          },
        },
      ],
    });
    if (!batchResult.ok) {
      throw new Error(batchResult.message || "Failed to delete dish");
    }
    return;
  }
  const actor = { id: user.id, tenantId: user.tenantId, role: user.role };
  const result = await runManifestCommand({
    entity: "Dish",
    command: "softDelete",
    instanceId: dishId,
    body: { reason: DELETE_REASON, userId: user.id },
    user: actor,
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to delete dish");
  }
};

export const deleteRecipe = async (recipeId: string) => {
  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "Recipe",
    command: "softDelete",
    instanceId: recipeId,
    body: { reason: DELETE_REASON, userId: user.id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to delete recipe");
  }
  revalidatePath("/kitchen/recipes");
};

export const deleteDish = async (
  dishId: string,
  mode: DishDeleteMode = "preserve"
) => {
  await governedDeleteDish(dishId, mode);
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteRecipes = async (recipeIds: string[]) => {
  const user = await requireCurrentUser();
  for (const id of recipeIds) {
    const result = await runManifestCommand({
      entity: "Recipe",
      command: "softDelete",
      instanceId: id,
      body: { reason: DELETE_REASON, userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
    if (!result.ok) {
      throw new Error(result.message || `Failed to delete recipe ${id}`);
    }
  }
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteDishes = async (
  dishIds: string[],
  mode: DishDeleteMode = "preserve"
) => {
  for (const id of dishIds) {
    await governedDeleteDish(id, mode);
  }
  revalidatePath("/kitchen/recipes");
};

// --- Governed field-update helpers (Design B cleanup) -----------------------
// The Manifest update commands reject partial payloads (every field param is
// required) and their nullable FK params must be passed explicitly. So a
// single-field edit loads the CURRENT row (a read — allowed to bypass the
// runtime) and sends a full governed payload with only the target field changed.

interface RecipeUpdateFields {
  category: string | null;
  cuisine_type: string | null;
  description: string | null;
  tags: string[] | null;
}

const loadRecipeUpdateFields = async (tenantId: string, recipeId: string) => {
  const [row] = await database.$queryRaw<RecipeUpdateFields[]>`
    SELECT category, cuisine_type, description, tags
    FROM tenant_kitchen.recipes
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `;
  return row;
};

/** Rename a recipe through the governed Recipe.update command (name only). */
const governedRenameRecipe = async (recipeId: string, newName: string) => {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error("Recipe name cannot be empty.");
  }
  const tenantId = await requireTenantId();
  const current = await loadRecipeUpdateFields(tenantId, recipeId);
  if (!current) {
    throw new Error("Recipe not found.");
  }
  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "Recipe",
    command: "update",
    instanceId: recipeId,
    body: {
      newName: trimmedName,
      newCategory: current.category ?? "",
      newCuisineType: current.cuisine_type ?? "",
      newDescription: current.description ?? "",
      newTags: current.tags ?? [],
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to rename recipe");
  }
  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);
};

export const renameRecipe = async (recipeId: string, newName: string) => {
  await governedRenameRecipe(recipeId, newName);
};

interface DishUpdateFields {
  allergens: string[] | null;
  category: string | null;
  cost_per_person: number | null;
  default_container_id: string | null;
  description: string | null;
  dietary_tags: string[] | null;
  is_active: boolean;
  name: string;
  portion_size_description: string | null;
  presentation_image_url: string | null;
  service_style: string | null;
}

const loadDishUpdateFields = async (tenantId: string, dishId: string) => {
  const [row] = await database.$queryRaw<DishUpdateFields[]>`
    SELECT name, description, category, service_style, default_container_id,
           presentation_image_url, portion_size_description, dietary_tags,
           allergens, cost_per_person, is_active
    FROM tenant_kitchen.dishes
    WHERE tenant_id = ${tenantId} AND id = ${dishId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `;
  return row;
};

/** Full Dish.update payload from a current row, overlaying any changed fields. */
const dishUpdateBody = (
  current: DishUpdateFields,
  overrides: Partial<{
    name: string;
    description: string | null;
    category: string | null;
    serviceStyle: string | null;
    portionSizeDescription: string | null;
    dietaryTags: string[];
    allergens: string[];
  }> = {}
) => ({
  name: overrides.name ?? current.name,
  description: overrides.description ?? current.description,
  category: overrides.category ?? current.category,
  serviceStyle: overrides.serviceStyle ?? current.service_style,
  defaultContainerId: current.default_container_id,
  presentationImageUrl: current.presentation_image_url,
  portionSizeDescription:
    overrides.portionSizeDescription ?? current.portion_size_description,
  dietaryTags: overrides.dietaryTags ?? current.dietary_tags ?? [],
  allergens: overrides.allergens ?? current.allergens ?? [],
});

/**
 * Edit a dish through the governed Manifest commands (Design B). The raw path
 * set every axis in one UPDATE; governance splits them into distinct commands,
 * each guarded on `self.isActive`. So the ordering matters: if the edit
 * reactivates the dish, activate FIRST (the field writes require an active
 * dish); if it deactivates, do the field writes while still active, then
 * deactivate LAST. Editing a dish that stays inactive is blocked by the
 * commands' own guard (intended enforcement).
 *
 * Not wrapped in a single DB transaction — the commands run sequentially — so
 * inputs are validated up front (name, non-negative price/cost) to keep the
 * happy path all-or-nothing in practice.
 */
export const updateDish = async (dishId: string, formData: FormData) => {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Dish name is required.");
  }
  const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
  const costPerPerson = parseNumber(formData.get("costPerPerson")) ?? 0;
  const minLead = parseNumber(formData.get("minPrepLeadDays")) ?? 0;
  const maxLead = parseNumber(formData.get("maxPrepLeadDays")) ?? 0;
  invariant(pricePerPerson >= 0, "Price per person cannot be negative");
  invariant(costPerPerson >= 0, "Cost per person cannot be negative");

  const tenantId = await requireTenantId();
  const current = await loadDishUpdateFields(tenantId, dishId);
  if (!current) {
    throw new Error("Dish not found.");
  }
  const user = await requireCurrentUser();
  const actor = { id: user.id, tenantId: user.tenantId, role: user.role };
  const targetActive = formData.get("isActive") === "true";

  const run = async (
    command: string,
    body: Record<string, unknown>,
    failMsg: string
  ) => {
    const result = await runManifestCommand({
      entity: "Dish",
      command,
      instanceId: dishId,
      body,
      user: actor,
    });
    if (!result.ok) {
      throw new Error(result.message || failMsg);
    }
  };

  // Reactivate first so the guarded field writes can run.
  if (targetActive && !current.is_active) {
    await run("activate", {}, "Failed to reactivate dish");
  }

  await run(
    "update",
    dishUpdateBody(current, {
      name,
      description: String(formData.get("description") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || null,
      serviceStyle: String(formData.get("serviceStyle") || "").trim() || null,
      portionSizeDescription:
        String(formData.get("portionSizeDescription") || "").trim() || null,
      dietaryTags: parseList(formData.get("dietaryTags")),
      allergens: parseList(formData.get("allergens")),
    }),
    "Failed to update dish"
  );
  await run(
    "updatePricing",
    { pricePerPerson, costPerPerson, userId: user.id },
    "Failed to update dish pricing"
  );
  await run(
    "updateLeadTime",
    { minPrepLeadDays: minLead, maxPrepLeadDays: maxLead, userId: user.id },
    "Failed to update dish lead time"
  );

  // Deactivate last so the field writes above still saw an active dish.
  if (!targetActive && current.is_active) {
    await run(
      "deactivate",
      { reason: "Deactivated via dish edit", userId: user.id },
      "Failed to deactivate dish"
    );
  }

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/dishes/${dishId}`);
};

/**
 * Relink a dish to a different recipe via the governed Dish.changeRecipe
 * command. Prep-list generation resolves ingredients through this link, so
 * corrections must go through the Manifest runtime (audit + events).
 */
export const changeDishRecipe = async (dishId: string, recipeId: string) => {
  const tenantId = await requireTenantId();
  invariant(recipeId.trim().length > 0, "Recipe is required");

  const [recipe] = await database.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM tenant_kitchen.recipes
    WHERE tenant_id = ${tenantId} AND id = ${recipeId}::uuid AND deleted_at IS NULL
    LIMIT 1
  `;
  if (!recipe) {
    throw new Error("Recipe not found.");
  }

  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "Dish",
    command: "changeRecipe",
    instanceId: dishId,
    body: { recipeId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to change recipe");
  }

  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/dishes/${dishId}`);
};

/** Active recipes for pickers (id + name only). */
export const listRecipeOptions = async () => {
  const tenantId = await requireTenantId();
  return await database.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM tenant_kitchen.recipes
    WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
    ORDER BY name
  `;
};

export const updateRecipeName = async (recipeId: string, name: string) => {
  await governedRenameRecipe(recipeId, name);
};

export const updateDishName = async (dishId: string, name: string) => {
  invariant(name.trim().length > 0, "Name cannot be empty");
  const tenantId = await requireTenantId();
  const current = await loadDishUpdateFields(tenantId, dishId);
  if (!current) {
    throw new Error("Dish not found.");
  }
  const user = await requireCurrentUser();
  const result = await runManifestCommand({
    entity: "Dish",
    command: "update",
    instanceId: dishId,
    body: dishUpdateBody(current, { name: name.trim() }),
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to rename dish");
  }
  revalidatePath("/kitchen/recipes");
};

const governedUpdateDishPrice = async (
  tenantId: string,
  dishId: string,
  num: number,
  actor: { id: string; tenantId: string; role: string }
) => {
  const current = await loadDishUpdateFields(tenantId, dishId);
  if (!current) {
    throw new Error("Dish not found.");
  }
  const result = await runManifestCommand({
    entity: "Dish",
    command: "updatePricing",
    instanceId: dishId,
    body: {
      pricePerPerson: num,
      costPerPerson: current.cost_per_person ?? 0,
      userId: actor.id,
    },
    user: actor,
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to update dish price");
  }
};

export const updateDishPrice = async (dishId: string, price: string) => {
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();
  await governedUpdateDishPrice(tenantId, dishId, num, {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateDishPrice = async (dishIds: string[], price: string) => {
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();
  const actor = { id: user.id, tenantId: user.tenantId, role: user.role };
  for (const id of dishIds) {
    await governedUpdateDishPrice(tenantId, id, num, actor);
  }
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateNames = async (
  ids: string[],
  type: "recipes" | "dishes",
  name: string
) => {
  invariant(name.trim().length > 0, "Name cannot be empty");
  for (const id of ids) {
    if (type === "recipes") {
      await governedRenameRecipe(id, name);
    } else {
      await updateDishName(id, name);
    }
  }
  revalidatePath("/kitchen/recipes");
};
