"use server";

import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const createMenu = async (formData: FormData) => {
  const user = await requireCurrentUser();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description = String(formData.get("description") || "").trim() || "";
  const category = String(formData.get("category") || "").trim() || "";
  const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
  const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
  const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
  const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;

  // D6: Route through governed Menu.create command — emits MenuCreated
  // event via the IR command's emits block instead of hand-written
  // outboxEvent.create.
  const result = await runManifestCommand({
    entity: "Menu",
    command: "create",
    body: {
      name,
      description,
      category,
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create menu");
  }

  revalidatePath("/kitchen/recipes/menus");
  redirect("/kitchen/recipes?tab=menus");
};

export const updateMenu = async (menuId: string, formData: FormData) => {
  const user = await requireCurrentUser();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description = String(formData.get("description") || "").trim() || "";
  const category = String(formData.get("category") || "").trim() || "";
  const basePrice = parseNumber(formData.get("basePrice")) ?? 0;
  const pricePerPerson = parseNumber(formData.get("pricePerPerson")) ?? 0;
  const minGuests = parseNumber(formData.get("minGuests")) ?? 0;
  const maxGuests = parseNumber(formData.get("maxGuests")) ?? 0;

  // D6: Route through governed Menu.update command — emits MenuUpdated
  // event via the IR command's emits block instead of hand-written
  // outboxEvent.create.
  const result = await runManifestCommand({
    entity: "Menu",
    command: "update",
    instanceId: menuId,
    body: {
      newName: name,
      newDescription: description,
      newCategory: category,
      newBasePrice: basePrice,
      newPricePerPerson: pricePerPerson,
      newMinGuests: minGuests,
      newMaxGuests: maxGuests,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update menu");
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const deleteMenu = async (menuId: string) => {
  const user = await requireCurrentUser();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  // D6: Route through governed Menu.archive command — emits MenuArchived
  // event via the IR command's emits block instead of hand-written
  // outboxEvent.create.
  const result = await runManifestCommand({
    entity: "Menu",
    command: "archive",
    instanceId: menuId,
    body: {
      reason: "Deleted via menu management",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete menu");
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export interface MenuSummary {
  basePrice: number | null;
  category: string | null;
  createdAt: Date;
  description: string | null;
  dishCount: number;
  id: string;
  isActive: boolean;
  maxGuests: number | null;
  minGuests: number | null;
  name: string;
  pricePerPerson: number | null;
}

export const getMenus = async (): Promise<MenuSummary[]> => {
  const tenantId = await requireTenantId();

  const menus = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      is_active: boolean;
      base_price: string | null;
      price_per_person: string | null;
      min_guests: number | null;
      max_guests: number | null;
      created_at: Date;
      dish_count: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        m.id,
        m.name,
        m.description,
        m.category,
        m.is_active,
        m.base_price,
        m.price_per_person,
        m.min_guests,
        m.max_guests,
        m.created_at,
        COUNT(md.id) AS dish_count
      FROM tenant_kitchen.menus m
      LEFT JOIN tenant_kitchen.menu_dishes md
        ON m.tenant_id = md.tenant_id
        AND m.id = md.menu_id
        AND md.deleted_at IS NULL
      WHERE m.tenant_id = ${tenantId}
        AND m.deleted_at IS NULL
      GROUP BY
        m.id,
        m.name,
        m.description,
        m.category,
        m.is_active,
        m.base_price,
        m.price_per_person,
        m.min_guests,
        m.max_guests,
        m.created_at
      ORDER BY m.created_at DESC
    `
  );

  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    description: menu.description,
    category: menu.category,
    isActive: menu.is_active,
    basePrice: menu.base_price ? Number.parseFloat(menu.base_price) : null,
    pricePerPerson: menu.price_per_person
      ? Number.parseFloat(menu.price_per_person)
      : null,
    minGuests: menu.min_guests,
    maxGuests: menu.max_guests,
    dishCount: menu.dish_count,
    createdAt: menu.created_at,
  }));
};

export interface MenuDetail {
  basePrice: number | null;
  category: string | null;
  createdAt: Date;
  description: string | null;
  dishes: {
    id: string;
    dishId: string;
    dishName: string;
    course: string | null;
    sortOrder: number;
    isOptional: boolean;
    dietaryTags: string[];
    allergens: string[];
    pricePerPerson: number | null;
    costPerPerson: number | null;
  }[];
  id: string;
  isActive: boolean;
  isTemplate: boolean;
  maxGuests: number | null;
  minGuests: number | null;
  name: string;
  pricePerPerson: number | null;
  updatedAt: Date;
}

export const getMenuById = async (
  menuId: string
): Promise<MenuDetail | null> => {
  const tenantId = await requireTenantId();

  if (!menuId) {
    return null;
  }

  // Fetch menu
  const [menu] = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      is_active: boolean;
      is_template: boolean;
      base_price: string | null;
      price_per_person: string | null;
      min_guests: number | null;
      max_guests: number | null;
      created_at: Date;
      updated_at: Date;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        description,
        category,
        is_active,
        is_template,
        base_price,
        price_per_person,
        min_guests,
        max_guests,
        created_at,
        updated_at
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menu) {
    return null;
  }

  // Fetch menu dishes with dish names and cost data
  const dishes = await database.$queryRaw<
    {
      id: string;
      dish_id: string;
      dish_name: string;
      course: string | null;
      sort_order: number;
      is_optional: boolean;
      dietary_tags: string[] | null;
      allergens: string[] | null;
      price_per_person: string | null;
      cost_per_person: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        md.id,
        md.dish_id,
        d.name AS dish_name,
        md.course,
        md.sort_order,
        md.is_optional,
        d.dietary_tags,
        d.allergens,
        d.price_per_person,
        d.cost_per_person
      FROM tenant_kitchen.menu_dishes md
      JOIN tenant_kitchen.dishes d
        ON md.tenant_id = d.tenant_id
        AND md.dish_id = d.id
        AND d.deleted_at IS NULL
      WHERE md.menu_id = ${menuId}
        AND md.tenant_id = ${tenantId}
        AND md.deleted_at IS NULL
      ORDER BY md.sort_order ASC, d.name ASC
    `
  );

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description,
    category: menu.category,
    isActive: menu.is_active,
    isTemplate: menu.is_template,
    basePrice: menu.base_price ? Number.parseFloat(menu.base_price) : null,
    pricePerPerson: menu.price_per_person
      ? Number.parseFloat(menu.price_per_person)
      : null,
    minGuests: menu.min_guests,
    maxGuests: menu.max_guests,
    createdAt: menu.created_at,
    updatedAt: menu.updated_at,
    dishes: dishes.map((dish) => ({
      id: dish.id,
      dishId: dish.dish_id,
      dishName: dish.dish_name,
      course: dish.course,
      sortOrder: dish.sort_order,
      isOptional: dish.is_optional,
      dietaryTags: dish.dietary_tags || [],
      allergens: dish.allergens || [],
      pricePerPerson: dish.price_per_person
        ? Number.parseFloat(dish.price_per_person)
        : null,
      costPerPerson: dish.cost_per_person
        ? Number.parseFloat(dish.cost_per_person)
        : null,
    })),
  };
};

export const addDishToMenu = async (
  menuId: string,
  dishId: string,
  course?: string
) => {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  if (!dishId) {
    throw new Error("Dish ID is required.");
  }

  // Verify menu exists and belongs to tenant
  const [menu] = await database.$queryRaw<
    { id: string; tenant_id: string; name: string }[]
  >(
    Prisma.sql`
      SELECT id, tenant_id, name
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menu) {
    throw new Error("Menu not found or access denied.");
  }

  // Verify dish exists and belongs to tenant
  const [dish] = await database.$queryRaw<
    { id: string; tenant_id: string; name: string }[]
  >(
    Prisma.sql`
      SELECT id, tenant_id, name
      FROM tenant_kitchen.dishes
      WHERE id = ${dishId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!dish) {
    throw new Error("Dish not found or access denied.");
  }

  // Check if dish is already in menu
  const [existingMenuDish] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND dish_id = ${dishId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existingMenuDish) {
    throw new Error("Dish is already in the menu.");
  }

  // Get the next sort order for this menu
  const [maxSortOrder] = await database.$queryRaw<
    { max_sort_order: number | null }[]
  >(
    Prisma.sql`
      SELECT MAX(sort_order) as max_sort_order
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  const nextSortOrder = (maxSortOrder?.max_sort_order ?? 0) + 1;

  // D6: Route through governed MenuDish.create command — emits
  // MenuDishAdded event via the IR command's emits block instead of
  // hand-written outboxEvent.create.
  const result = await runManifestCommand({
    entity: "MenuDish",
    command: "create",
    body: {
      menuId,
      dishId,
      course: course || "",
      sortOrder: nextSortOrder,
      isOptional: false,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to add dish to menu");
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const removeDishFromMenu = async (menuId: string, dishId: string) => {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  if (!dishId) {
    throw new Error("Dish ID is required.");
  }

  // Verify menu-dish relationship exists and belongs to tenant
  const [menuDish] = await database.$queryRaw<
    { id: string; menu_id: string; dish_id: string }[]
  >(
    Prisma.sql`
      SELECT id, menu_id, dish_id
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND dish_id = ${dishId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menuDish) {
    throw new Error("Dish is not in the menu or access denied.");
  }

  // D6: Route through governed MenuDish.remove command — emits
  // MenuDishRemoved event via the IR command's emits block instead of
  // hand-written outboxEvent.create.
  const result = await runManifestCommand({
    entity: "MenuDish",
    command: "remove",
    instanceId: menuDish.id,
    body: {
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to remove dish from menu");
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const reorderMenuDishes = async (menuId: string, dishIds: string[]) => {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  if (!(dishIds && Array.isArray(dishIds)) || dishIds.length === 0) {
    throw new Error("Dish IDs array is required.");
  }

  // Verify menu exists and belongs to tenant
  const [menu] = await database.$queryRaw<{ id: string; tenant_id: string }[]>(
    Prisma.sql`
      SELECT id, tenant_id
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menu) {
    throw new Error("Menu not found or access denied.");
  }

  // Verify all dishes are in the menu and belong to tenant
  const menuDishes = await database.$queryRaw<
    { id: string; dish_id: string; course: string | null; sort_order: number; is_optional: boolean }[]
  >(
    Prisma.sql`
      SELECT id, dish_id, course, sort_order, is_optional
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND tenant_id = ${tenantId}
        AND dish_id = ANY(${dishIds})
        AND deleted_at IS NULL
    `
  );

  if (menuDishes.length !== dishIds.length) {
    throw new Error("One or more dishes not found in menu or access denied.");
  }

  // D6: Route through governed MenuDish.updateCourse command for each
  // dish — emits MenuDishUpdated event via the IR command's emits block
  // instead of hand-written outboxEvent.create.
  const menuDishByDishId = new Map(menuDishes.map((md) => [md.dish_id, md]));

  for (let i = 0; i < dishIds.length; i++) {
    const md = menuDishByDishId.get(dishIds[i]);
    if (!md) continue;

    const result = await runManifestCommand({
      entity: "MenuDish",
      command: "updateCourse",
      instanceId: md.id,
      body: {
        newCourse: md.course || "",
        newSortOrder: i + 1,
        newIsOptional: md.is_optional,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to reorder menu dishes");
    }
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
export interface DishSummary {
  category: string | null;
  description: string | null;
  id: string;
  name: string;
}

export interface DishWithCost extends DishSummary {
  allergens: string[];
  costPerPerson: number | null;
  dietaryTags: string[];
  pricePerPerson: number | null;
}

export const getDishes = async (): Promise<DishSummary[]> => {
  const tenantId = await requireTenantId();

  const dishes = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        description,
        category
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `
  );

  return dishes;
};

export const getDishesWithCost = async (): Promise<DishWithCost[]> => {
  const tenantId = await requireTenantId();

  const dishes = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      dietary_tags: string[] | null;
      allergens: string[] | null;
      price_per_person: string | null;
      cost_per_person: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        description,
        category,
        dietary_tags,
        allergens,
        price_per_person,
        cost_per_person
      FROM tenant_kitchen.dishes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_active = true
      ORDER BY name ASC
    `
  );

  return dishes.map((dish) => ({
    id: dish.id,
    name: dish.name,
    description: dish.description,
    category: dish.category,
    dietaryTags: dish.dietary_tags || [],
    allergens: dish.allergens || [],
    pricePerPerson: dish.price_per_person
      ? Number.parseFloat(dish.price_per_person)
      : null,
    costPerPerson: dish.cost_per_person
      ? Number.parseFloat(dish.cost_per_person)
      : null,
  }));
};

export interface RecipeForDishCreation {
  category: string | null;
  id: string;
  name: string;
}

export const getRecipesForDishCreation = async (): Promise<
  RecipeForDishCreation[]
> => {
  const tenantId = await requireTenantId();

  const recipes = await database.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        category
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `
  );

  return recipes;
};

export const createDishInline = async (
  name: string,
  recipeId: string,
  category?: string,
  description?: string
): Promise<DishSummary> => {
  const tenantId = await requireTenantId();

  if (!name?.trim()) {
    throw new Error("Dish name is required.");
  }

  if (!recipeId?.trim()) {
    throw new Error("Recipe is required.");
  }

  // Verify recipe exists
  const [recipe] = await database.$queryRaw<{ id: string; name: string }[]>(
    Prisma.sql`
      SELECT id, name
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

  const user = await requireCurrentUser();

  const result = await runManifestCommand({
    entity: "Dish",
    command: "create",
    body: {
      recipeId,
      name: name.trim(),
      description: description?.trim() || "",
      category: category?.trim() || "",
      serviceStyle: "",
      defaultContainerId: "",
      presentationImageUrl: "",
      minPrepLeadDays: 0,
      maxPrepLeadDays: 0,
      portionSizeDescription: "",
      dietaryTags: [],
      allergens: [],
      pricePerPerson: 0,
      costPerPerson: 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create dish");
  }

  const dishId = (result.result as { id: string }).id;

  revalidatePath("/kitchen/recipes");
  revalidatePath("/kitchen/recipes/menus");

  return {
    id: dishId,
    name: name.trim(),
    description: description?.trim() || null,
    category: category?.trim() || null,
  };
};

// ============ Menu Template Actions ============

export interface MenuTemplate {
  category: string | null;
  createdAt: Date;
  description: string | null;
  dishCount: number;
  id: string;
  name: string;
}

export const getMenuTemplates = async (): Promise<MenuTemplate[]> => {
  const tenantId = await requireTenantId();

  const templates = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
      created_at: Date;
      dish_count: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        m.id,
        m.name,
        m.description,
        m.category,
        m.created_at,
        COUNT(md.id) AS dish_count
      FROM tenant_kitchen.menus m
      LEFT JOIN tenant_kitchen.menu_dishes md
        ON m.tenant_id = md.tenant_id
        AND m.id = md.menu_id
        AND md.deleted_at IS NULL
      WHERE m.tenant_id = ${tenantId}
        AND m.deleted_at IS NULL
        AND m.is_template = true
      GROUP BY
        m.id,
        m.name,
        m.description,
        m.category,
        m.created_at
      ORDER BY m.created_at DESC
    `
  );

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    dishCount: t.dish_count,
    createdAt: t.created_at,
  }));
};

export const saveAsTemplate = async (menuId: string): Promise<string> => {
  const tenantId = await requireTenantId();

  // Get the original menu
  const [originalMenu] = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, name, description, category
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!originalMenu) {
    throw new Error("Menu not found.");
  }

  // Get all menu dishes
  const menuDishes = await database.$queryRaw<
    {
      dish_id: string;
      course: string | null;
      sort_order: number;
      is_optional: boolean;
    }[]
  >(
    Prisma.sql`
      SELECT dish_id, course, sort_order, is_optional
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `
  );

  const user = await requireCurrentUser();

  // D1: Route through governed Menu.create command instead of direct
  // tx.menu.create + tx.outboxEvent.create. The command emits MenuCreated.
  // TODO(manifest-divergence): Menu entity lacks an isTemplate property in
  // the IR, so the template flag is not set via the governed command.
  const createResult = await runManifestCommand({
    entity: "Menu",
    command: "create",
    body: {
      name: `${originalMenu.name} (Template)`,
      description: originalMenu.description ?? "",
      category: originalMenu.category ?? "",
      basePrice: 0,
      pricePerPerson: 0,
      minGuests: 0,
      maxGuests: 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!createResult.ok) {
    throw new Error(createResult.message || "Failed to create template menu");
  }

  const templateId = (createResult.result as { id?: string } | null)?.id;
  if (!templateId) {
    throw new Error("Menu.create did not return an id");
  }

  // D1: Copy dishes via governed MenuDish.create commands.
  for (const md of menuDishes) {
    const dishResult = await runManifestCommand({
      entity: "MenuDish",
      command: "create",
      body: {
        menuId: templateId,
        dishId: md.dish_id,
        course: md.course || "",
        sortOrder: md.sort_order,
        isOptional: md.is_optional,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!dishResult.ok) {
      throw new Error(dishResult.message || "Failed to copy dish to template");
    }
  }

  revalidatePath("/kitchen/recipes/menus");

  return templateId;
};

export const createFromTemplate = async (
  templateId: string,
  name: string
): Promise<string> => {
  const tenantId = await requireTenantId();

  // Get the template
  const [template] = await database.$queryRaw<
    {
      id: string;
      name: string;
      description: string | null;
      category: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT id, name, description, category
      FROM tenant_kitchen.menus
      WHERE id = ${templateId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
        AND is_template = true
      LIMIT 1
    `
  );

  if (!template) {
    throw new Error("Template not found.");
  }

  // Get template dishes
  const templateDishes = await database.$queryRaw<
    {
      dish_id: string;
      course: string | null;
      sort_order: number;
      is_optional: boolean;
    }[]
  >(
    Prisma.sql`
      SELECT dish_id, course, sort_order, is_optional
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${templateId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `
  );

  const user = await requireCurrentUser();

  // D1: Route through governed Menu.create command instead of direct
  // tx.menu.create + tx.outboxEvent.create. The command emits MenuCreated.
  const createResult = await runManifestCommand({
    entity: "Menu",
    command: "create",
    body: {
      name: name.trim(),
      description: template.description ?? "",
      category: template.category ?? "",
      basePrice: 0,
      pricePerPerson: 0,
      minGuests: 0,
      maxGuests: 0,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!createResult.ok) {
    throw new Error(
      createResult.message || "Failed to create menu from template"
    );
  }

  const menuId = (createResult.result as { id?: string } | null)?.id;
  if (!menuId) {
    throw new Error("Menu.create did not return an id");
  }

  // D1: Copy dishes via governed MenuDish.create commands.
  for (const td of templateDishes) {
    const dishResult = await runManifestCommand({
      entity: "MenuDish",
      command: "create",
      body: {
        menuId,
        dishId: td.dish_id,
        course: td.course || "",
        sortOrder: td.sort_order,
        isOptional: td.is_optional,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!dishResult.ok) {
      throw new Error(dishResult.message || "Failed to copy dish to menu");
    }
  }

  revalidatePath("/kitchen/recipes/menus");

  return menuId;
};

// ============ Batch Menu Dish Updates ============

export interface MenuDishInput {
  course: string | null;
  dishId: string;
  isOptional: boolean;
  sortOrder: number;
}

export const updateMenuDishes = async (
  menuId: string,
  dishes: MenuDishInput[]
): Promise<void> => {
  const tenantId = await requireTenantId();

  // Verify menu exists
  const [menu] = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menu) {
    throw new Error("Menu not found.");
  }

  const user = await requireCurrentUser();

  // D1: Fetch existing menu dish IDs for governed removal.
  const existingMenuDishes = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  // D1: Remove existing dishes via governed MenuDish.remove commands.
  for (const md of existingMenuDishes) {
    const removeResult = await runManifestCommand({
      entity: "MenuDish",
      command: "remove",
      instanceId: md.id,
      body: { userId: user.id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!removeResult.ok) {
      throw new Error(
        removeResult.message || "Failed to remove existing menu dishes"
      );
    }
  }

  // D1: Insert new dishes via governed MenuDish.create commands.
  for (const dish of dishes) {
    const createResult = await runManifestCommand({
      entity: "MenuDish",
      command: "create",
      body: {
        menuId,
        dishId: dish.dishId,
        course: dish.course || "",
        sortOrder: dish.sortOrder,
        isOptional: dish.isOptional,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!createResult.ok) {
      throw new Error(createResult.message || "Failed to add menu dish");
    }
  }

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const updateDishCourse = async (
  menuId: string,
  dishId: string,
  course: string | null
): Promise<void> => {
  const user = await requireCurrentUser();

  // Look up the MenuDish record (need ID as instanceId + current values to preserve)
  const [menuDish] = await database.$queryRaw<
    { id: string; sort_order: number; is_optional: boolean }[]
  >(
    Prisma.sql`
      SELECT id, sort_order, is_optional
      FROM tenant_kitchen.menu_dishes
      WHERE menu_id = ${menuId}
        AND dish_id = ${dishId}
        AND tenant_id = ${user.tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!menuDish) {
    throw new Error("Menu dish not found.");
  }

  const result = await runManifestCommand({
    entity: "MenuDish",
    command: "updateCourse",
    instanceId: menuDish.id,
    body: {
      newCourse: course || "",
      newSortOrder: menuDish.sort_order,
      newIsOptional: menuDish.is_optional,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update dish course");
  }

  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
