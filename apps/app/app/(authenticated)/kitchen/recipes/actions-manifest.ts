"use server";

import { randomUUID } from "node:crypto";
import { database, Prisma } from "@repo/database";
import {
  createDish as createDishManifest,
  createRecipeRuntime,
  type KitchenOpsContext,
} from "@repo/manifest-adapters";
import { put } from "@repo/storage";
// biome-ignore lint/performance/noNamespaceImport: Sentry.logger requires namespace import
import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invariant } from "../../../lib/invariant";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";

// ============ Helper Functions (from original actions.ts) ============

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

const parseLines = (value: FormDataEntryValue | null) =>
  typeof value === "string"
    ? value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

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

const _toDecimalNumberOrNull = (
  value: unknown,
  field: string
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return toDecimalNumber(value, field);
};

interface IngredientInput {
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
}

interface StepInput {
  instruction: string;
}

const parseJsonArray = (value: string): unknown[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseIngredientInput = (
  value: FormDataEntryValue | null
): IngredientInput[] => {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const jsonItems = parseJsonArray(trimmed);
  if (jsonItems) {
    return jsonItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const name = typeof record.name === "string" ? record.name.trim() : "";
        if (!name) {
          return null;
        }
        const unit =
          typeof record.unit === "string" && record.unit.trim().length > 0
            ? record.unit.trim()
            : null;
        const quantityRaw = record.quantity;
        let quantity = 1;
        if (typeof quantityRaw === "number" && Number.isFinite(quantityRaw)) {
          quantity = quantityRaw;
        } else if (typeof quantityRaw === "string") {
          const parsed = Number(quantityRaw);
          if (Number.isFinite(parsed)) {
            quantity = parsed;
          }
        }
        const preparationNotes =
          typeof record.notes === "string" && record.notes.trim().length > 0
            ? record.notes.trim()
            : null;
        const isOptional =
          typeof record.isOptional === "boolean"
            ? record.isOptional
            : typeof record.optional === "boolean"
              ? record.optional
              : false;
        return { name, quantity, unit, preparationNotes, isOptional };
      })
      .filter((item): item is IngredientInput => item !== null);
  }

  return parseLines(trimmed).map((line) => {
    const parsed = parseIngredientLine(line);
    return {
      name: parsed.name || line,
      quantity: parsed.quantity,
      unit: parsed.unit,
      preparationNotes: null,
      isOptional: false,
    };
  });
};

const parseStepInput = (value: FormDataEntryValue | null): StepInput[] => {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const jsonItems = parseJsonArray(trimmed);
  if (jsonItems) {
    return jsonItems
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const record = item as Record<string, unknown>;
        const instruction =
          typeof record.instruction === "string"
            ? record.instruction.trim()
            : typeof record.text === "string"
              ? record.text.trim()
              : "";
        if (!instruction) {
          return null;
        }
        return { instruction };
      })
      .filter((item): item is StepInput => item !== null);
  }

  return parseLines(trimmed).map((line) => ({ instruction: line }));
};

const buildInstructionsText = (steps: StepInput[]): string | null =>
  steps.length > 0 ? steps.map((step) => step.instruction).join("\n") : null;

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

const loadUnitMap = async (codes: string[]) => {
  if (codes.length === 0) {
    return new Map<string, number>();
  }
  const rows = await database.$queryRaw<{ id: number; code: string }[]>(
    Prisma.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN (${Prisma.join(codes)})
    `
  );
  return new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
};

type TxClient = Parameters<Parameters<typeof database.$transaction>[0]>[0];

const ensureIngredientId = async (
  tx: TxClient,
  tenantId: string,
  name: string,
  defaultUnitId: number
) => {
  const [existing] = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing?.id) {
    return existing.id;
  }

  const id = randomUUID();
  await tx.$executeRaw(
    Prisma.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${defaultUnitId}, true)
    `
  );
  return id;
};

const INGREDIENT_LINE_RE = /^([\d.]+)\s*([a-zA-Z]+)?\s*(.*)$/;

const parseIngredientLine = (line: string) => {
  const match = line.match(INGREDIENT_LINE_RE);
  if (!match) {
    return { quantity: 1, unit: null, name: line };
  }
  const quantity = Number(match[1]);
  const unit = match[2] ? match[2].toLowerCase() : null;
  const name = match[3]?.trim() || line;
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
    name,
  };
};

// ============ Helper: Create Manifest Runtime Context ============

/**
 * Creates a Manifest runtime context with Prisma store provider
 * for persistent entity storage and constraint checking.
 *
 * Uses requireCurrentUser() which auto-provisions the User record
 * if the Clerk user doesn't have one in this tenant yet.
 */
async function createRuntimeContext(): Promise<KitchenOpsContext> {
  const currentUser = await requireCurrentUser();

  // Dynamically import PrismaStore to avoid circular dependencies
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  return {
    tenantId: currentUser.tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, currentUser.tenantId),
  };
}

// ============ Public Actions ============

/**
 * Create a new dish using Manifest runtime for constraint checking.
 *
 * This action:
 * 1. Parses form data
 * 2. Uploads image to storage
 * 3. Creates Dish entity in Manifest for constraint checking (pricing, lead times)
 * 4. Throws if any BLOCK constraints fail
 * 5. Persists to Prisma database
 * 6. Creates outbox events
 */
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

  // Create Manifest runtime for constraint checking
  const runtimeContext = await createRuntimeContext();
  const runtime = await createRecipeRuntime(runtimeContext);

  // Create dish via Manifest (constraint checking for pricing, margins, lead times)
  const result = await createDishManifest(
    runtime,
    dishId,
    name,
    recipeId,
    description ?? "",
    category ?? "",
    serviceStyle ?? "",
    dietaryTags.join(",") ?? "",
    allergens.join(",") ?? "",
    pricePerPerson ?? 0,
    costPerPerson ?? 0,
    minLead ?? 0,
    maxLead ?? 7,
    portionSize ?? ""
  );

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "block"
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    const messages = blockingConstraints.map((c) => c.formatted).join("; ");
    throw new Error(`Cannot create dish: ${messages}`);
  }

  // Log warning constraints for observability
  // Note: constraintOutcomes are included in outbox event below for UI consumption
  const warningConstraints = result.constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "warn"
  );
  if (warningConstraints && warningConstraints.length > 0) {
    const { logger } = Sentry;
    logger.warn(
      logger.fmt`[Manifest] Dish creation warnings: ${warningConstraints.map((c) => `${c.code}: ${c.formatted}`).join(", ")}`
    );
  }

  // Persist to Prisma database + outbox atomically
  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
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
          is_active
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
          true
        )
      `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "dish",
        aggregateId: dishId,
        eventType: "dish.created",
        payload: {
          dishId,
          recipeId,
          name,
          pricePerPerson,
          costPerPerson,
          constraintOutcomes:
            result.constraintOutcomes as unknown as Prisma.InputJsonValue,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes?tab=dishes");
};

// ============ Other Actions (keep original logic) ============

// For now, keep updateRecipeImage from original
// This can be migrated later if needed
// Note: In "use server" files, we must import and re-export individually

import {
  getRecipeForEdit as _getRecipeForEdit,
  updateRecipeImage as _updateRecipeImage,
} from "./actions";

export const getRecipeForEdit = _getRecipeForEdit;
export const updateRecipeImage = _updateRecipeImage;

// Type export
export type { RecipeForEdit } from "./actions";
