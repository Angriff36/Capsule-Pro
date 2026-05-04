/**
 * @module actions-ingredient
 * @intent Server action for creating ingredients directly in the database
 * @responsibility Parse form data, validate, insert into tenant_kitchen.ingredients, emit outbox event
 * @domain Kitchen
 * @tags ingredients, server-action, create
 * @canonical true
 */

"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";

export interface IngredientActionResult {
  success: boolean;
  ingredientId?: string;
  redirectUrl?: string;
  error?: string;
}

const parseList = (value: FormDataEntryValue | null): string[] =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const parseNumber = (value: FormDataEntryValue | null): number | null => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const createIngredient = async (
  formData: FormData
): Promise<IngredientActionResult> => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Ingredient name is required." };
  }

  const category = String(formData.get("category") || "").trim() || null;
  const defaultUnitId = parseNumber(formData.get("defaultUnitId"));
  const shelfLifeDays = parseNumber(formData.get("shelfLifeDays"));
  const storageInstructions =
    String(formData.get("storageInstructions") || "").trim() || null;
  const allergens = parseList(formData.get("allergens"));

  const ingredientId = randomUUID();

  await database.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        category,
        default_unit_id,
        shelf_life_days,
        storage_instructions,
        allergens,
        is_active
      )
      VALUES (
        ${tenantId},
        ${ingredientId},
        ${name},
        ${category},
        ${defaultUnitId ?? 1},
        ${shelfLifeDays},
        ${storageInstructions},
        ${allergens.length > 0 ? allergens : []},
        true
      )
    `
  );

  revalidatePath("/kitchen/recipes");

  return {
    success: true,
    ingredientId,
    redirectUrl: "/kitchen/recipes?tab=ingredients",
  };
};
