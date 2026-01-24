/**
 * @module RecipeStepsAPI
 * @intent Fetch recipe steps for mobile viewer with step-by-step instructions
 * @responsibility Provide paginated recipe steps for mobile recipe viewer
 * @domain Kitchen
 * @tags recipes, steps, api, mobile
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/recipes/[recipeId]/steps
 * Fetch recipe steps for the latest version of a recipe
 */
async function GET(request, { params }) {
  try {
    const { recipeId } = await params;
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // First, get the latest version of the recipe
    const recipes = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT
          r.id,
          r.name,
          rv.id AS version_id,
          r.description,
          rv.prep_time_minutes,
          rv.cook_time_minutes,
          rv.rest_time_minutes,
          rv.yield_quantity,
          u.code AS yield_unit_code
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
      `);
    if (recipes.length === 0) {
      return server_2.NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }
    const recipe = recipes[0];
    // Fetch recipe steps for the latest version
    const steps = await database_1.database.$queryRaw(database_1.Prisma.sql`
        SELECT
          step_number,
          instruction,
          duration_minutes,
          temperature_value,
          temperature_unit,
          equipment_needed,
          tips,
          video_url,
          image_url
        FROM tenant_kitchen.recipe_steps
        WHERE tenant_id = ${tenantId}
          AND recipe_version_id = ${recipe.version_id}
          AND deleted_at IS NULL
        ORDER BY step_number ASC
      `);
    // Calculate total duration for all timed steps
    const totalDuration = steps.reduce(
      (sum, step) => sum + (step.duration_minutes || 0),
      0
    );
    const response = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeVersionId: recipe.version_id,
      description: recipe.description,
      prepTimeMinutes: recipe.prep_time_minutes,
      cookTimeMinutes: recipe.cook_time_minutes,
      restTimeMinutes: recipe.rest_time_minutes,
      yieldQuantity: recipe.yield_quantity,
      yieldUnit: recipe.yield_unit_code,
      steps: steps.map((step) => ({
        stepNumber: step.step_number,
        instruction: step.instruction,
        durationMinutes: step.duration_minutes,
        temperatureValue: step.temperature_value,
        temperatureUnit: step.temperature_unit,
        equipmentNeeded: step.equipment_needed,
        tips: step.tips,
        videoUrl: step.video_url,
        imageUrl: step.image_url,
      })),
      totalDuration,
    };
    return server_2.NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching recipe steps:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch recipe steps" },
      { status: 500 }
    );
  }
}
