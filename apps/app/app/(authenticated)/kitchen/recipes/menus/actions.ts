"use server";

import {
  dishCreate,
  listDishes,
  listMenuDishes,
  listMenus,
  listRecipes,
  menuArchive,
  menuCreate,
  menuDishCreate,
  menuDishRemove,
  menuDishUpdateCourse,
  menuUpdate,
} from "@/app/lib/manifest-client.generated";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "../../../../lib/tenant";

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const createMenu = async (formData: FormData) => {
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Menu name is required.");
  await menuCreate({
    name,
    description: String(formData.get("description") || "").trim() || "",
    category: String(formData.get("category") || "").trim() || "",
    basePrice: parseNumber(formData.get("basePrice")) ?? 0,
    pricePerPerson: parseNumber(formData.get("pricePerPerson")) ?? 0,
    minGuests: parseNumber(formData.get("minGuests")) ?? 0,
    maxGuests: parseNumber(formData.get("maxGuests")) ?? 0,
  });
  revalidatePath("/kitchen/recipes/menus");
  redirect("/kitchen/recipes?tab=menus");
};

export const updateMenu = async (menuId: string, formData: FormData) => {
  const name = String(formData.get("name") || "").trim();
  if (!menuId) throw new Error("Menu ID is required.");
  if (!name) throw new Error("Menu name is required.");
  await menuUpdate({
    id: menuId,
    newName: name,
    newDescription: String(formData.get("description") || "").trim() || "",
    newCategory: String(formData.get("category") || "").trim() || "",
    newBasePrice: parseNumber(formData.get("basePrice")) ?? 0,
    newPricePerPerson: parseNumber(formData.get("pricePerPerson")) ?? 0,
    newMinGuests: parseNumber(formData.get("minGuests")) ?? 0,
    newMaxGuests: parseNumber(formData.get("maxGuests")) ?? 0,
  });
  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const deleteMenu = async (menuId: string) => {
  if (!menuId) throw new Error("Menu ID is required.");
  await menuArchive({ id: menuId, reason: "Deleted via menu management" });
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
  const [menus, menuDishes] = await Promise.all([listMenus(), listMenuDishes()]);
  const dishCountByMenu = new Map<string, number>();
  for (const menuDish of menuDishes.data) {
    if (!menuDish.deletedAt) {
      dishCountByMenu.set(
        menuDish.menuId ?? "",
        (dishCountByMenu.get(menuDish.menuId ?? "") ?? 0) + 1
      );
    }
  }
  return menus.data
    .filter((menu) => !menu.deletedAt)
    .map((menu) => ({
      id: menu.id,
      name: menu.name ?? "",
      description: menu.description ?? null,
      category: menu.category ?? null,
      isActive: menu.isActive ?? false,
      basePrice: menu.basePrice ?? null,
      pricePerPerson: menu.pricePerPerson ?? null,
      minGuests: menu.minGuests ?? null,
      maxGuests: menu.maxGuests ?? null,
      dishCount: dishCountByMenu.get(menu.id) ?? 0,
      createdAt: new Date(menu.createdAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

export const getMenuById = async (menuId: string): Promise<MenuDetail | null> => {
  if (!menuId) return null;
  const [menus, menuDishes, dishes] = await Promise.all([
    listMenus(),
    listMenuDishes(),
    listDishes(),
  ]);
  const menu = menus.data.find((entry) => entry.id === menuId && !entry.deletedAt);
  if (!menu) return null;
  const dishById = new Map(dishes.data.map((dish) => [dish.id, dish]));
  const mappedDishes = menuDishes.data
    .filter((entry) => entry.menuId === menuId && !entry.deletedAt)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((entry) => {
      const dish = dishById.get(entry.dishId ?? "");
      return {
        id: entry.id,
        dishId: entry.dishId ?? "",
        dishName: dish?.name ?? "Dish",
        course: entry.course ?? null,
        sortOrder: entry.sortOrder ?? 0,
        isOptional: entry.isOptional ?? false,
        dietaryTags: dish?.dietaryTags ?? [],
        allergens: dish?.allergens ?? [],
        pricePerPerson: dish?.pricePerPerson ?? null,
        costPerPerson: dish?.costPerPerson ?? null,
      };
    });
  return {
    id: menu.id,
    name: menu.name ?? "",
    description: menu.description ?? null,
    category: menu.category ?? null,
    isActive: menu.isActive ?? false,
    isTemplate: menu.isTemplate ?? false,
    basePrice: menu.basePrice ?? null,
    pricePerPerson: menu.pricePerPerson ?? null,
    minGuests: menu.minGuests ?? null,
    maxGuests: menu.maxGuests ?? null,
    createdAt: new Date(menu.createdAt),
    updatedAt: new Date(menu.updatedAt),
    dishes: mappedDishes,
  };
};

export const addDishToMenu = async (menuId: string, dishId: string, course?: string) => {
  if (!menuId) throw new Error("Menu ID is required.");
  if (!dishId) throw new Error("Dish ID is required.");
  const menuDishes = await listMenuDishes();
  if (menuDishes.data.some((entry) => entry.menuId === menuId && entry.dishId === dishId && !entry.deletedAt)) {
    throw new Error("Dish is already in the menu.");
  }
  const nextSortOrder =
    menuDishes.data
      .filter((entry) => entry.menuId === menuId && !entry.deletedAt)
      .reduce((max, entry) => Math.max(max, entry.sortOrder ?? 0), 0) + 1;
  await menuDishCreate({
    menuId,
    dishId,
    course: course || "",
    sortOrder: nextSortOrder,
    isOptional: false,
  });
  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const removeDishFromMenu = async (menuId: string, dishId: string) => {
  const user = await requireCurrentUser();
  const menuDish = (await listMenuDishes()).data.find(
    (entry) => entry.menuId === menuId && entry.dishId === dishId && !entry.deletedAt
  );
  if (!menuDish) throw new Error("Dish is not in the menu or access denied.");
  await menuDishRemove({ id: menuDish.id, userId: user.id });
  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const reorderMenuDishes = async (menuId: string, dishIds: string[]) => {
  const menuDishes = (await listMenuDishes()).data.filter(
    (entry) => entry.menuId === menuId && !entry.deletedAt
  );
  if (menuDishes.length !== dishIds.length) {
    throw new Error("One or more dishes not found in menu or access denied.");
  }
  const menuDishByDishId = new Map(menuDishes.map((entry) => [entry.dishId ?? "", entry]));
  for (let index = 0; index < dishIds.length; index += 1) {
    const menuDish = menuDishByDishId.get(dishIds[index]);
    if (!menuDish) continue;
    await menuDishUpdateCourse({
      id: menuDish.id,
      newCourse: menuDish.course ?? "",
      newSortOrder: index + 1,
      newIsOptional: menuDish.isOptional ?? false,
    });
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

export const getDishes = async (): Promise<DishSummary[]> =>
  (await listDishes()).data
    .filter((dish) => !dish.deletedAt && dish.isActive)
    .map((dish) => ({
      id: dish.id,
      name: dish.name ?? "",
      description: dish.description ?? null,
      category: dish.category ?? null,
    }));

export const getDishesWithCost = async (): Promise<DishWithCost[]> =>
  (await listDishes()).data
    .filter((dish) => !dish.deletedAt && dish.isActive)
    .map((dish) => ({
      id: dish.id,
      name: dish.name ?? "",
      description: dish.description ?? null,
      category: dish.category ?? null,
      dietaryTags: dish.dietaryTags ?? [],
      allergens: dish.allergens ?? [],
      pricePerPerson: dish.pricePerPerson ?? null,
      costPerPerson: dish.costPerPerson ?? null,
    }));

export interface RecipeForDishCreation {
  category: string | null;
  id: string;
  name: string;
}

export const getRecipesForDishCreation = async (): Promise<RecipeForDishCreation[]> =>
  (await listRecipes()).data
    .filter((recipe) => !recipe.deletedAt)
    .map((recipe) => ({
      id: recipe.id,
      name: recipe.name ?? "",
      category: recipe.category ?? null,
    }));

export const createDishInline = async (
  name: string,
  recipeId: string,
  category?: string,
  description?: string
): Promise<DishSummary> => {
  if (!name?.trim()) throw new Error("Dish name is required.");
  if (!recipeId?.trim()) throw new Error("Recipe is required.");
  const created = await dishCreate({
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
  });
  revalidatePath("/kitchen/recipes");
  revalidatePath("/kitchen/recipes/menus");
  return {
    id: created?.id ?? "",
    name: name.trim(),
    description: description?.trim() || null,
    category: category?.trim() || null,
  };
};

export interface MenuTemplate {
  category: string | null;
  createdAt: Date;
  description: string | null;
  dishCount: number;
  id: string;
  name: string;
}

export const getMenuTemplates = async (): Promise<MenuTemplate[]> => {
  const [menus, menuDishes] = await Promise.all([listMenus(), listMenuDishes()]);
  const dishCountByMenu = new Map<string, number>();
  for (const menuDish of menuDishes.data) {
    if (!menuDish.deletedAt) {
      dishCountByMenu.set(
        menuDish.menuId ?? "",
        (dishCountByMenu.get(menuDish.menuId ?? "") ?? 0) + 1
      );
    }
  }
  return menus.data
    .filter((menu) => !menu.deletedAt && menu.isTemplate)
    .map((menu) => ({
      id: menu.id,
      name: menu.name ?? "",
      description: menu.description ?? null,
      category: menu.category ?? null,
      createdAt: new Date(menu.createdAt),
      dishCount: dishCountByMenu.get(menu.id) ?? 0,
    }));
};

export const saveAsTemplate = async (menuId: string): Promise<string> => {
  const source = await getMenuById(menuId);
  if (!source) throw new Error("Menu not found.");
  const created = await menuCreate({
    name: `${source.name} (Template)`,
    description: source.description ?? "",
    category: source.category ?? "",
    basePrice: 0,
    pricePerPerson: 0,
    minGuests: 0,
    maxGuests: 0,
  });
  const templateId = created?.id ?? "";
  for (const dish of source.dishes) {
    await menuDishCreate({
      menuId: templateId,
      dishId: dish.dishId,
      course: dish.course ?? "",
      sortOrder: dish.sortOrder,
      isOptional: dish.isOptional,
    });
  }
  revalidatePath("/kitchen/recipes/menus");
  return templateId;
};

export const createFromTemplate = async (
  templateId: string,
  name: string
): Promise<string> => {
  const template = await getMenuById(templateId);
  if (!template) throw new Error("Template not found.");
  const created = await menuCreate({
    name: name.trim(),
    description: template.description ?? "",
    category: template.category ?? "",
    basePrice: 0,
    pricePerPerson: 0,
    minGuests: 0,
    maxGuests: 0,
  });
  const menuId = created?.id ?? "";
  for (const dish of template.dishes) {
    await menuDishCreate({
      menuId,
      dishId: dish.dishId,
      course: dish.course ?? "",
      sortOrder: dish.sortOrder,
      isOptional: dish.isOptional,
    });
  }
  revalidatePath("/kitchen/recipes/menus");
  return menuId;
};

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
  const user = await requireCurrentUser();
  const existing = (await listMenuDishes()).data.filter(
    (entry) => entry.menuId === menuId && !entry.deletedAt
  );
  for (const menuDish of existing) {
    await menuDishRemove({ id: menuDish.id, userId: user.id });
  }
  for (const dish of dishes) {
    await menuDishCreate({
      menuId,
      dishId: dish.dishId,
      course: dish.course ?? "",
      sortOrder: dish.sortOrder,
      isOptional: dish.isOptional,
    });
  }
  revalidatePath("/kitchen/recipes/menus");
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};

export const updateDishCourse = async (
  menuId: string,
  dishId: string,
  course: string | null
): Promise<void> => {
  const menuDish = (await listMenuDishes()).data.find(
    (entry) => entry.menuId === menuId && entry.dishId === dishId && !entry.deletedAt
  );
  if (!menuDish) throw new Error("Menu dish not found.");
  await menuDishUpdateCourse({
    id: menuDish.id,
    newCourse: course ?? "",
    newSortOrder: menuDish.sortOrder ?? 0,
    newIsOptional: menuDish.isOptional ?? false,
  });
  revalidatePath(`/kitchen/recipes/menus/${menuId}`);
};
