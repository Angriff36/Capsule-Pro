"use server";

/**
 * Dish creation server actions.
 *
 * apps/app does not execute Manifest directly (architecture contract:
 * docs/manifest-architecture-contract.md). These actions parse form data and
 * upload images, then forward to the allowlisted apps/api orchestration route
 * `POST /api/kitchen/dishes/commands/create`, which runs the governed
 * Dish.create constraint check and persists the dish + outbox event.
 */

import { randomUUID } from "node:crypto";
import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { apiPostJsonServer } from "../../../lib/api-server";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";

// ============ Helper Functions ============

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

interface OverrideRequestInput {
  constraintCode: string;
  reason: string;
  authorizedBy: string;
  timestamp: number;
}

/**
 * Create override requests from user-provided reason and details
 */
function createOverrideRequests(
  constraints: ConstraintOutcome[],
  reason: string,
  userId: string
): OverrideRequestInput[] {
  return constraints.map((c) => ({
    constraintCode: c.code,
    reason,
    authorizedBy: userId,
    timestamp: Date.now(),
  }));
}

// ============ Result Types ============

/**
 * Response type for Manifest-enabled actions
 * Contains constraint outcomes and redirect info for client-side handling
 */
export interface ManifestActionResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  redirectUrl?: string;
  error?: string;
  recipeId?: string;
  dishId?: string;
}

// ============ Public Actions ============

/**
 * Create a new dish: parses form data, uploads the hero image, then calls the
 * apps/api orchestration route for governed constraint checking + persistence.
 *
 * @param formData - Dish form data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes and redirect URL
 */
export const createDish = async (
  formData: FormData,
  overrideRequests?: OverrideRequestInput[]
): Promise<ManifestActionResult> => {
  const tenantId = await requireTenantId();

  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    return { success: false, error: "Dish name and recipe are required." };
  }

  const imageFile = readImageFile(formData, "imageFile");
  const dishUploadId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `dishes/${dishUploadId}/hero`, imageFile)
    : null;

  let response: Response;
  try {
    response = await apiPostJsonServer("/api/kitchen/dishes/commands/create", {
      name,
      recipeId,
      category: String(formData.get("category") || "").trim() || null,
      serviceStyle: String(formData.get("serviceStyle") || "").trim() || null,
      description: String(formData.get("description") || "").trim() || null,
      imageUrl,
      dietaryTags: parseList(formData.get("dietaryTags")),
      allergens: parseList(formData.get("allergens")),
      pricePerPerson: parseNumber(formData.get("pricePerPerson")),
      costPerPerson: parseNumber(formData.get("costPerPerson")),
      minPrepLeadDays: parseNumber(formData.get("minPrepLeadDays")),
      maxPrepLeadDays: parseNumber(formData.get("maxPrepLeadDays")),
      portionSizeDescription:
        String(formData.get("portionSizeDescription") || "").trim() || null,
      ...(overrideRequests && overrideRequests.length > 0
        ? { overrideRequests }
        : {}),
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create dish",
    };
  }

  const result = (await response
    .json()
    .catch(() => null)) as ManifestActionResult | null;

  if (!result) {
    return {
      success: false,
      error: `Failed to create dish (${response.status})`,
    };
  }

  if (result.success) {
    revalidatePath("/kitchen/recipes");
  }

  return result;
};

/**
 * Create a dish with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const createDishWithOverride = async (
  formData: FormData,
  reason: string,
  details: string
): Promise<ManifestActionResult> => {
  const currentUser = await requireCurrentUser();

  // First run without overrides to get constraint outcomes
  const initialResult = await createDish(formData);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      currentUser.id
    );

    // Re-run with override requests
    return createDish(formData, overrideRequests);
  }

  return initialResult;
};

// ============ Re-export other actions from original ============

// Note: In "use server" files, we must import and re-export individually

import {
  getRecipeForEdit as _getRecipeForEdit,
  updateRecipeImage as _updateRecipeImage,
} from "./actions";

export const getRecipeForEdit = _getRecipeForEdit;
export const updateRecipeImage = _updateRecipeImage;

// Type export
export type { RecipeForEdit } from "./actions";
