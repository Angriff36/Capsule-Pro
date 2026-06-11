/**
 * Menu Commands
 *
 * Commands for managing menus:
 * - update, activate, deactivate, create, createMenuDish
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { MenuCommandResult, MenuDishCommandResult } from "../types";

/**
 * Update a menu
 */
export async function updateMenu(
  engine: RuntimeEngine,
  menuId: string,
  newName: string,
  newDescription: string,
  newCategory: string,
  newBasePrice: number,
  newPricePerPerson: number,
  newMinGuests: number,
  newMaxGuests: number,
  newIsActive: boolean,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "update",
    {
      newName,
      newDescription,
      newCategory,
      newBasePrice,
      newPricePerPerson,
      newMinGuests,
      newMaxGuests,
      newIsActive,
    },
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: instance?.isActive as boolean | undefined,
  };
}

/**
 * Activate a menu
 */
export async function activateMenu(
  engine: RuntimeEngine,
  menuId: string,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "activate",
    {},
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}

/**
 * Deactivate a menu
 */
export async function deactivateMenu(
  engine: RuntimeEngine,
  menuId: string,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    {},
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: false,
  };
}

/**
 * Create a menu via Manifest runtime with constraint validation and event emission
 */
export async function createMenu(
  engine: RuntimeEngine,
  menuId: string,
  name: string,
  description: string,
  category: string,
  basePrice: number,
  pricePerPerson: number,
  minGuests: number,
  maxGuests: number,
  overrideRequests?: OverrideRequest[]
): Promise<MenuCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      name,
      description,
      category,
      basePrice,
      pricePerPerson,
      minGuests,
      maxGuests,
    },
    {
      entityName: "Menu",
      instanceId: menuId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Menu", menuId);
  return {
    ...result,
    menuId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}

/**
 * Create a new menu dish association via Manifest command pipeline
 */
export async function createMenuDish(
  engine: RuntimeEngine,
  menuDishId: string,
  menuId: string,
  dishId: string,
  course: string,
  sortOrder: number,
  isOptional: boolean,
  overrideRequests?: OverrideRequest[]
): Promise<MenuDishCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      menuId,
      dishId,
      course,
      sortOrder,
      isOptional,
    },
    {
      entityName: "MenuDish",
      instanceId: menuDishId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("MenuDish", menuDishId);
  return {
    ...result,
    menuDishId,
    menuId: instance?.menuId as string | undefined,
    dishId: instance?.dishId as string | undefined,
  };
}
