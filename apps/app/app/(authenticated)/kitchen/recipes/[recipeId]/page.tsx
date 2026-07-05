import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { SectionHeader } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { invariant } from "../../../../lib/invariant";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";
import {
  type CookbookStep,
  RecipeCookbookView,
} from "./components/recipe-cookbook-view";
import { RecipeDetailEditButton } from "./components/recipe-detail-edit-button";
import { RecipeDetailTabs } from "./components/recipe-detail-tabs";

interface RecipeDetailRow {
  bring_hot_notes: string | null;
  category: string | null;
  cook_on_site_notes: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  difficulty_level: number | null;
  drop_off_notes: string | null;
  id: string;
  image_url: string | null;
  instructions: string | null;
  is_active: boolean;
  is_subrecipe: boolean;
  name: string;
  notes: string | null;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  version_number: number | null;
  yield_description: string | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

interface IngredientRow {
  id: string;
  name: string;
  notes: string | null;
  order_index: number;
  quantity: number;
  unit_code: string;
}

interface RecipeStepRow {
  duration_minutes: number | null;
  equipment_needed: string[] | null;
  image_url: string | null;
  instruction: string;
  linked_recipe_id: string | null;
  linked_technique_id: string | null;
  phase: string | null;
  step_number: number;
  temperature_unit: string | null;
  temperature_value: number | null;
  tips: string | null;
  video_url: string | null;
}

interface DishSummaryRow {
  allergens: string[] | null;
  container_name: string | null;
  container_type: string | null;
  default_container_id: string | null;
  dish_id: string;
  portion_size_description: string | null;
  presentation_image_url: string | null;
}

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Beginner",
  2: "Easy",
  3: "Medium",
  4: "Advanced",
  5: "Expert",
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

const cleanString = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

// Resolve names for any sub-recipes linked from steps.
const resolveLinkedRecipeNames = async (
  tenantId: string,
  stepRows: RecipeStepRow[]
): Promise<Record<string, string>> => {
  const linkedRecipeIds = Array.from(
    new Set(
      stepRows.map((s) => cleanString(s.linked_recipe_id)).filter(Boolean)
    )
  ) as string[];
  const linkedNames: Record<string, string> = {};
  if (linkedRecipeIds.length > 0) {
    const nameRows = await database.$queryRaw<{ id: string; name: string }[]>(
      Prisma.sql`
        SELECT id, name
        FROM tenant_kitchen.recipes
        WHERE tenant_id = ${tenantId}
          AND id IN (${Prisma.join(linkedRecipeIds)})
          AND deleted_at IS NULL
      `
    );
    for (const row of nameRows) {
      linkedNames[row.id] = row.name;
    }
  }
  return linkedNames;
};

const VALID_PHASES = new Set(["prep", "method", "finish", "packaging"]);

const buildCookbookSteps = (
  stepRows: RecipeStepRow[],
  linkedNames: Record<string, string>
): CookbookStep[] =>
  stepRows.map((s) => {
    const linkedRecipeId = cleanString(s.linked_recipe_id);
    return {
      key: String(s.step_number),
      stepNumber: s.step_number,
      instruction: s.instruction,
      phase: (VALID_PHASES.has(s.phase ?? "") ? s.phase : "method") as
        | "prep"
        | "method"
        | "finish"
        | "packaging",
      durationMinutes: s.duration_minutes,
      temperatureValue: toDecimalNumberOrNull(
        s.temperature_value,
        "step.temperature_value"
      ),
      temperatureUnit: cleanString(s.temperature_unit),
      equipmentNeeded: s.equipment_needed ?? [],
      tips: s.tips,
      linkedRecipeId,
      linkedRecipeName: linkedRecipeId
        ? (linkedNames[linkedRecipeId] ?? null)
        : null,
      linkedTechniqueId: cleanString(s.linked_technique_id),
    };
  });

const deriveCategoryLabel = (recipe: RecipeDetailRow) =>
  cleanString(recipe.category) ?? (recipe.is_subrecipe ? "Sub-Recipe" : "Dish");

const deriveDifficultyLabel = (level: number | null) =>
  level ? (DIFFICULTY_LABELS[level] ?? `Level ${level}`) : "";

// Dish-level storage assignment for the rail (container may be soft-deleted,
// in which case the join returns no name).
const deriveStorageContainer = (dish: DishSummaryRow | null) =>
  dish?.default_container_id
    ? {
        containerType: dish.container_type ?? "",
        id: dish.default_container_id,
        name: dish.container_name ?? "Unknown container",
      }
    : null;

const RecipeDetailPage = async ({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) => {
  const { orgId } = await auth();
  const resolvedParams = await params;

  if (!orgId) {
    return notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const recipeId = resolvedParams.recipeId;

  // Non-uuid segments (e.g. a stray /kitchen/recipes/dishes hit) fall through
  // to this dynamic route; the raw ::uuid casts below would 500 with 22P02.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId)) {
    return notFound();
  }

  // Fetch recipe details (recipe header + latest version)
  const recipes = await database.$queryRaw<RecipeDetailRow[]>(
    Prisma.sql`
      SELECT
        r.id,
        r.name,
        r.description,
        r.category,
        r.tags,
        r.is_active,
        r.is_subrecipe,
        rv.version_number,
        rv.yield_quantity,
        rv.yield_description,
        u.code AS yield_unit,
        rv.prep_time_minutes,
        rv.cook_time_minutes,
        rv.rest_time_minutes,
        rv.difficulty_level,
        rv.instructions,
        rv.notes,
        rv.drop_off_notes,
        rv.bring_hot_notes,
        rv.cook_on_site_notes,
        (
          SELECT image_url
          FROM tenant_kitchen.recipe_steps rs
          WHERE rs.tenant_id = r.tenant_id
            AND rs.recipe_version_id = rv.id
            AND rs.deleted_at IS NULL
            AND rs.image_url IS NOT NULL
          ORDER BY rs.step_number ASC
          LIMIT 1
        ) AS image_url
      FROM tenant_kitchen.recipes r
      LEFT JOIN LATERAL (
        SELECT rv.*
        FROM tenant_kitchen.recipe_versions rv
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipe_id = r.id
          AND rv.deleted_at IS NULL
        ORDER BY rv.version_number DESC
        LIMIT 1
      ) rv ON true
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE r.tenant_id = ${tenantId}
        AND r.id = ${recipeId}
        AND r.deleted_at IS NULL
    `
  );

  const recipeRow = recipes[0];
  if (!recipeRow) {
    return notFound();
  }

  const recipe = {
    ...recipeRow,
    yield_quantity: toDecimalNumberOrNull(
      recipeRow.yield_quantity,
      "recipe.yield_quantity"
    ),
  };

  // Dish presentation data (hero image, allergens, portion) — a recipe may back
  // a plated dish; take the first one for display defaults.
  const dishRows = await database.$queryRaw<DishSummaryRow[]>(
    Prisma.sql`
      SELECT
        d.id AS dish_id,
        d.presentation_image_url,
        d.allergens,
        d.portion_size_description,
        d.default_container_id,
        c.name AS container_name,
        c.container_type
      FROM tenant_kitchen.dishes d
      LEFT JOIN tenant_kitchen.containers c
        ON c.tenant_id = d.tenant_id
        AND c.id = d.default_container_id
        AND c.deleted_at IS NULL
      WHERE d.tenant_id = ${tenantId}
        AND d.recipe_id = ${recipeId}
        AND d.deleted_at IS NULL
      ORDER BY d.created_at ASC
      LIMIT 1
    `
  );
  const dish = dishRows[0] ?? null;

  // Fetch ingredients
  const ingredientRows = await database.$queryRaw<IngredientRow[]>(
    Prisma.sql`
      SELECT
        i.id,
        i.name,
        ri.quantity,
        u.code AS unit_code,
        ri.preparation_notes AS notes,
        ri.sort_order AS order_index
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
      LEFT JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = (
          SELECT rv.id
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = ${tenantId}
            AND rv.recipe_id = ${recipeId}
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        )
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );
  const ingredients = ingredientRows.map((ingredient) => ({
    ...ingredient,
    quantity: toDecimalNumber(ingredient.quantity, "ingredient.quantity"),
  }));

  // Get the latest recipe version ID (used by the costing/history tabs)
  const recipeVersion = await database.$queryRaw<{ version_id: string }[]>(
    Prisma.sql`
      SELECT rv.id AS version_id
      FROM tenant_kitchen.recipe_versions rv
      WHERE rv.tenant_id = ${tenantId}
        AND rv.recipe_id = ${recipeId}
        AND rv.deleted_at IS NULL
      ORDER BY rv.version_number DESC
      LIMIT 1
    `
  );
  const latestVersion = recipeVersion[0];
  const recipeVersionId = latestVersion ? latestVersion.version_id : null;

  // Fetch recipe steps
  const stepRows: RecipeStepRow[] = latestVersion
    ? await database.$queryRaw<RecipeStepRow[]>(
        Prisma.sql`
          SELECT
            step_number,
            instruction,
            duration_minutes,
            temperature_value,
            temperature_unit,
            equipment_needed,
            tips,
            video_url,
            image_url,
            phase,
            linked_recipe_id,
            linked_technique_id
          FROM tenant_kitchen.recipe_steps
          WHERE tenant_id = ${tenantId}
            AND recipe_version_id = ${latestVersion.version_id}
            AND deleted_at IS NULL
          ORDER BY step_number ASC
        `
      )
    : [];

  const linkedNames = await resolveLinkedRecipeNames(tenantId, stepRows);
  const steps = buildCookbookSteps(stepRows, linkedNames);

  const equipment = Array.from(
    new Set(stepRows.flatMap((s) => s.equipment_needed ?? []).filter(Boolean))
  );

  const heroImageUrl =
    cleanString(dish?.presentation_image_url) ??
    cleanString(recipe.image_url) ??
    null;

  const yieldLabel = recipe.yield_quantity
    ? `${recipe.yield_quantity} ${recipe.yield_unit ?? ""}`.trim()
    : (cleanString(recipe.yield_description) ?? "");

  const totalMinutes =
    (recipe.prep_time_minutes ?? 0) +
    (recipe.cook_time_minutes ?? 0) +
    (recipe.rest_time_minutes ?? 0);

  return (
    <>
      <Header page={recipe.name} pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="outline">
          <Link href="/kitchen/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Link>
        </Button>
        <RecipeDetailEditButton recipeId={recipeId} recipeName={recipe.name} />
      </Header>

      <RecipeCookbookView
        activePrep={formatMinutes(recipe.prep_time_minutes)}
        allergens={dish?.allergens ?? []}
        categoryLabel={deriveCategoryLabel(recipe)}
        cookTime={formatMinutes(recipe.cook_time_minutes)}
        description={cleanString(recipe.description)}
        difficulty={deriveDifficultyLabel(recipe.difficulty_level)}
        dishId={dish?.dish_id ?? null}
        equipment={equipment}
        heroImageUrl={heroImageUrl}
        ingredients={ingredients.map((ingredient) => ({
          amountDisplay:
            `${ingredient.quantity} ${ingredient.unit_code}`.trim(),
          id: ingredient.id,
          name: ingredient.name,
          note: cleanString(ingredient.notes),
        }))}
        instructionsText={cleanString(recipe.instructions)}
        isActive={recipe.is_active}
        isSubrecipe={recipe.is_subrecipe}
        name={recipe.name}
        packaging={{
          bringHot: recipe.bring_hot_notes ?? "",
          cookOnSite: recipe.cook_on_site_notes ?? "",
          dropOff: recipe.drop_off_notes ?? "",
        }}
        portion={cleanString(dish?.portion_size_description) ?? ""}
        progressScope={recipeId}
        recipeVersionId={recipeVersionId}
        restTime={formatMinutes(recipe.rest_time_minutes)}
        steps={steps}
        storageContainer={deriveStorageContainer(dish)}
        totalTime={formatMinutes(totalMinutes)}
        versionLabel={recipe.version_number ? `v${recipe.version_number}` : ""}
        yield={yieldLabel}
      />

      {/* Power features preserved: costing, nutrition, version history */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Records" title="Analysis & history" />
        <RecipeDetailTabs
          recipe={recipe}
          recipeVersionId={recipeVersionId}
          variant="sections"
        />
      </section>
    </>
  );
};

export default RecipeDetailPage;
