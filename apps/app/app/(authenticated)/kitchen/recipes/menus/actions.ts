"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantId } from "../../../../lib/tenant";

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const createMenu = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const minGuests = parseNumber(formData.get("minGuests"));
  const maxGuests = parseNumber(formData.get("maxGuests"));

  const menuId = randomUUID();

  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.menus (
          tenant_id,
          id,
          name,
          description,
          category,
          base_price,
          price_per_person,
          min_guests,
          max_guests,
          is_active
        )
        VALUES (
          ${tenantId},
          ${menuId},
          ${name},
          ${description},
          ${category},
          ${basePrice},
          ${pricePerPerson},
          ${minGuests},
          ${maxGuests},
          true
        )
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.created",
        payload: { menuId, name },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  redirect("/kitchen/recipes?tab=menus");
};

export const updateMenu = async (menuId: string, formData: FormData) => {
  const tenantId = await requireTenantId();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  // Verify menu exists and belongs to tenant
  const [existingMenu] = await database.$queryRaw<
    { id: string; tenant_id: string }[]
  >(
    Prisma.sql`
      SELECT id, tenant_id
      FROM tenant_kitchen.menus
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!existingMenu?.tenant_id || existingMenu.tenant_id !== tenantId) {
    throw new Error("Menu not found or access denied.");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description = String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const minGuests = parseNumber(formData.get("minGuests"));
  const maxGuests = parseNumber(formData.get("maxGuests"));
  const isActive = formData.get("isActive") === "on";

  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.menus
        SET
          name = ${name},
          description = ${description},
          category = ${category},
          base_price = ${basePrice},
          price_per_person = ${pricePerPerson},
          min_guests = ${minGuests},
          max_guests = ${maxGuests},
          is_active = ${isActive},
          updated_at = NOW()
        WHERE id = ${menuId}
          AND tenant_id = ${tenantId}
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.updated",
        payload: { menuId, name },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const deleteMenu = async (menuId: string) => {
  const tenantId = await requireTenantId();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  // Verify menu exists and belongs to tenant
  const [existingMenu] = await database.$queryRaw<
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

  if (!existingMenu?.tenant_id || existingMenu.tenant_id !== tenantId) {
    throw new Error("Menu not found or access denied.");
  }

  // Soft delete the menu + emit outbox event atomically
  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.menus
        SET deleted_at = NOW()
        WHERE id = ${menuId}
          AND tenant_id = ${tenantId}
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.deleted",
        payload: { menuId, name: existingMenu.name },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export interface MenuSummary {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  basePrice: number | null;
  pricePerPerson: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  dishCount: number;
  createdAt: Date;
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
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  isTemplate: boolean;
  basePrice: number | null;
  pricePerPerson: number | null;
  minGuests: number | null;
  maxGuests: number | null;
  createdAt: Date;
  updatedAt: Date;
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
  const menuDishId = randomUUID();

  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.menu_dishes (
          tenant_id,
          id,
          menu_id,
          dish_id,
          course,
          sort_order,
          is_optional
        )
        VALUES (
          ${tenantId},
          ${menuDishId},
          ${menuId},
          ${dishId},
          ${course || null},
          ${nextSortOrder},
          false
        )
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.dish_added",
        payload: { menuId, dishId, menuDishId, course: course || null },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const removeDishFromMenu = async (menuId: string, dishId: string) => {
  const tenantId = await requireTenantId();

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

  // Soft delete the menu-dish relationship + emit outbox event atomically
  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.menu_dishes
        SET deleted_at = NOW()
        WHERE menu_id = ${menuId}
          AND dish_id = ${dishId}
          AND tenant_id = ${tenantId}
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.dish_removed",
        payload: { menuId, dishId, menuDishId: menuDish.id },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const reorderMenuDishes = async (menuId: string, dishIds: string[]) => {
  const tenantId = await requireTenantId();

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
  const menuDishes = await database.$queryRaw<{ dish_id: string }[]>(
    Prisma.sql`
      SELECT dish_id
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

  // Update sort order for all dishes + emit outbox event atomically
  await database.$transaction(async (tx) => {
    for (let i = 0; i < dishIds.length; i++) {
      await tx.$executeRaw(
        Prisma.sql`
          UPDATE tenant_kitchen.menu_dishes
          SET sort_order = ${i + 1},
              updated_at = NOW()
          WHERE menu_id = ${menuId}
            AND dish_id = ${dishIds[i]}
            AND tenant_id = ${tenantId}
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.dishes_reordered",
        payload: { menuId, dishIds },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
export interface DishSummary {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface DishWithCost extends DishSummary {
  dietaryTags: string[];
  allergens: string[];
  pricePerPerson: number | null;
  costPerPerson: number | null;
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
  id: string;
  name: string;
  category: string | null;
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

  const dishId = randomUUID();

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.dishes (
        tenant_id,
        id,
        recipe_id,
        name,
        description,
        category,
        is_active
      )
      VALUES (
        ${tenantId},
        ${dishId},
        ${recipeId},
        ${name.trim()},
        ${description?.trim() || null},
        ${category?.trim() || null},
        true
      )
    `
  );

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
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  dishCount: number;
  createdAt: Date;
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
    { id: string; name: string; description: string | null; category: string | null }[]
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
    { dish_id: string; course: string | null; sort_order: number; is_optional: boolean }[]
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

  const templateId = randomUUID();

  await database.$transaction(async (tx) => {
    // Create template menu
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.menus (
          tenant_id,
          id,
          name,
          description,
          category,
          is_active,
          is_template
        )
        VALUES (
          ${tenantId},
          ${templateId},
          ${`${originalMenu.name} (Template)`},
          ${originalMenu.description},
          ${originalMenu.category},
          true,
          true
        )
      `
    );

    // Copy dishes to template
    for (const md of menuDishes) {
      const menuDishId = randomUUID();
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.menu_dishes (
            tenant_id,
            id,
            menu_id,
            dish_id,
            course,
            sort_order,
            is_optional
          )
          VALUES (
            ${tenantId},
            ${menuDishId},
            ${templateId},
            ${md.dish_id},
            ${md.course},
            ${md.sort_order},
            ${md.is_optional}
          )
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: templateId,
        eventType: "menu.template_created",
        payload: { templateId, sourceMenuId: menuId },
        status: "pending" as const,
      },
    });
  });

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
    { id: string; name: string; description: string | null; category: string | null }[]
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
    { dish_id: string; course: string | null; sort_order: number; is_optional: boolean }[]
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

  const menuId = randomUUID();

  await database.$transaction(async (tx) => {
    // Create new menu from template
    await tx.$executeRaw(
      Prisma.sql`
        INSERT INTO tenant_kitchen.menus (
          tenant_id,
          id,
          name,
          description,
          category,
          is_active,
          is_template
        )
        VALUES (
          ${tenantId},
          ${menuId},
          ${name.trim()},
          ${template.description},
          ${template.category},
          true,
          false
        )
      `
    );

    // Copy dishes to new menu
    for (const td of templateDishes) {
      const menuDishId = randomUUID();
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.menu_dishes (
            tenant_id,
            id,
            menu_id,
            dish_id,
            course,
            sort_order,
            is_optional
          )
          VALUES (
            ${tenantId},
            ${menuDishId},
            ${menuId},
            ${td.dish_id},
            ${td.course},
            ${td.sort_order},
            ${td.is_optional}
          )
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.created_from_template",
        payload: { menuId, templateId },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");

  return menuId;
};

// ============ Batch Menu Dish Updates ============

export interface MenuDishInput {
  dishId: string;
  course: string | null;
  sortOrder: number;
  isOptional: boolean;
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

  await database.$transaction(async (tx) => {
    // Remove existing dishes (soft delete)
    await tx.$executeRaw(
      Prisma.sql`
        UPDATE tenant_kitchen.menu_dishes
        SET deleted_at = NOW()
        WHERE menu_id = ${menuId}
          AND tenant_id = ${tenantId}
          AND deleted_at IS NULL
      `
    );

    // Insert new dishes
    for (const dish of dishes) {
      const menuDishId = randomUUID();
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.menu_dishes (
            tenant_id,
            id,
            menu_id,
            dish_id,
            course,
            sort_order,
            is_optional
          )
          VALUES (
            ${tenantId},
            ${menuDishId},
            ${menuId},
            ${dish.dishId},
            ${dish.course},
            ${dish.sortOrder},
            ${dish.isOptional}
          )
        `
      );
    }

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "menu",
        aggregateId: menuId,
        eventType: "menu.dishes_updated",
        payload: { menuId, dishCount: dishes.length },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const updateDishCourse = async (
  menuId: string,
  dishId: string,
  course: string | null
): Promise<void> => {
  const tenantId = await requireTenantId();

  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.menu_dishes
      SET course = ${course}, updated_at = NOW()
      WHERE menu_id = ${menuId}
        AND dish_id = ${dishId}
        AND tenant_id = ${tenantId}
        AND deleted_at IS NULL
    `
  );

  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
