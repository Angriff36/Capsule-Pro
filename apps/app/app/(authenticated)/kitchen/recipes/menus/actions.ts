"use server";

import { database, Prisma } from "@repo/database";
import { randomUUID } from "crypto";
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

const enqueueOutboxEvent = async (
  tenantId: string,
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Prisma.InputJsonValue
) => {
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType,
      aggregateId,
      eventType,
      payload,
    },
  });
};

export const createMenu = async (formData: FormData) => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description =
    String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const minGuests = parseNumber(formData.get("minGuests"));
  const maxGuests = parseNumber(formData.get("maxGuests"));

  const menuId = randomUUID();

  await database.$executeRaw(
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

  revalidatePath("/kitchen/recipes/menus");
  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.created", {
    menuId,
    name,
  });
  redirect("/kitchen/recipes/menus");
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

  if (!existingMenu) {
    throw new Error("Menu not found or access denied.");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Menu name is required.");
  }

  const description =
    String(formData.get("description") || "").trim() || null;
  const category = String(formData.get("category") || "").trim() || null;
  const basePrice = parseNumber(formData.get("basePrice"));
  const pricePerPerson = parseNumber(formData.get("pricePerPerson"));
  const minGuests = parseNumber(formData.get("minGuests"));
  const maxGuests = parseNumber(formData.get("maxGuests"));
  const isActive = formData.get("isActive") === "on";

  await database.$executeRaw(
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

  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.updated", {
    menuId,
    name,
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

  if (!existingMenu) {
    throw new Error("Menu not found or access denied.");
  }

  // Soft delete the menu
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.menus
      SET deleted_at = NOW()
      WHERE id = ${menuId}
        AND tenant_id = ${tenantId}
    `
  );

  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.deleted", {
    menuId,
    name: existingMenu.name,
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export type MenuSummary = {
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
};

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
    basePrice: menu.base_price ? parseFloat(menu.base_price) : null,
    pricePerPerson: menu.price_per_person
      ? parseFloat(menu.price_per_person)
      : null,
    minGuests: menu.min_guests,
    maxGuests: menu.max_guests,
    dishCount: menu.dish_count,
    createdAt: menu.created_at,
  }));
};

export type MenuDetail = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
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
  }[];
};

export const getMenuById = async (menuId: string): Promise<MenuDetail | null> => {
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

  // Fetch menu dishes with dish names
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
        d.allergens
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
    basePrice: menu.base_price ? parseFloat(menu.base_price) : null,
    pricePerPerson: menu.price_per_person
      ? parseFloat(menu.price_per_person)
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
  const [existingMenuDish] = await database.$queryRaw<
    { id: string }[]
  >(
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

  await database.$executeRaw(
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

  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.dish_added", {
    menuId,
    dishId,
    menuDishId,
    course: course || null,
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

  // Soft delete the menu-dish relationship
  await database.$executeRaw(
    Prisma.sql`
      UPDATE tenant_kitchen.menu_dishes
      SET deleted_at = NOW()
      WHERE menu_id = ${menuId}
        AND dish_id = ${dishId}
        AND tenant_id = ${tenantId}
    `
  );

  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.dish_removed", {
    menuId,
    dishId,
    menuDishId: menuDish.id,
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const reorderMenuDishes = async (menuId: string, dishIds: string[]) => {
  const tenantId = await requireTenantId();

  if (!menuId) {
    throw new Error("Menu ID is required.");
  }

  if (!dishIds || !Array.isArray(dishIds) || dishIds.length === 0) {
    throw new Error("Dish IDs array is required.");
  }

  // Verify menu exists and belongs to tenant
  const [menu] = await database.$queryRaw<
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

  if (!menu) {
    throw new Error("Menu not found or access denied.");
  }

  // Verify all dishes are in the menu and belong to tenant
  const menuDishes = await database.$queryRaw<
    { dish_id: string }[]
  >(
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

  // Update sort order for all dishes
  for (let i = 0; i < dishIds.length; i++) {
    await database.$executeRaw(
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

  await enqueueOutboxEvent(tenantId, "menu", menuId, "menu.dishes_reordered", {
    menuId,
    dishIds,
  });

  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
export type DishSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
};

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
