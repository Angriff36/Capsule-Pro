/**
 * @module actions-ingredient
 * @intent Server action for creating ingredients via Manifest runtime
 * @responsibility Parse form data, validate, create via governed command
 * @domain Kitchen
 * @tags ingredients, server-action, create, governed
 * @canonical true
 */

"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export interface IngredientActionResult {
  error?: string;
  ingredientId?: string;
  redirectUrl?: string;
  success: boolean;
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
  const user = await requireCurrentUser();

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { success: false, error: "Ingredient name is required." };
  }

  const category = String(formData.get("category") || "").trim() || "";
  const defaultUnitId = parseNumber(formData.get("defaultUnitId")) ?? 1;
  const shelfLifeDays = parseNumber(formData.get("shelfLifeDays")) ?? 0;
  const storageInstructions =
    String(formData.get("storageInstructions") || "").trim() || "";
  const allergens = parseList(formData.get("allergens"));

  const result = await runManifestCommand({
    entity: "Ingredient",
    command: "create",
    body: {
      name,
      category,
      defaultUnitId,
      densityGPerMl: 0,
      shelfLifeDays,
      storageInstructions,
      allergens,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    return {
      success: false,
      error: result.message || "Failed to create ingredient.",
    };
  }

  const ingredientId = (result.result as { id?: string } | null)?.id;

  revalidatePath("/kitchen/recipes");

  return {
    success: true,
    ingredientId,
    redirectUrl: "/kitchen/recipes?tab=ingredients",
  };
};
