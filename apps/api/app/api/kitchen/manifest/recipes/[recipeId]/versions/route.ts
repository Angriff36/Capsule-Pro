import { randomUUID } from "node:crypto";
import type { Prisma } from "@repo/database";
import {
  buildVersionResponse,
  type CreateVersionRequest,
  createRuntimeContext,
  executeVersionCreationWorkflow,
  fetchAndValidateRecipe,
  getAuthContext,
  getNextVersionNumber,
  normalizeCreateVersionRequest,
} from "@/app/lib/recipe-version-helpers";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

/**
 * Create a new recipe version using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes/:recipeId/versions
 *
 * This endpoint creates a new version of an existing recipe using the Manifest runtime for:
 * - Constraint checking (positive yield, valid difficulty, valid times)
 * - Warning constraints (long recipe time, high difficulty)
 * - Event emission (RecipeVersionCreated)
 * - Audit logging
 */
export async function POST(request: Request, context: RouteContext) {
  // Validate authentication and get context
  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult.response;
  }

  const { tenantId } = authResult.context;
  const { recipeId } = await context.params;
  const body = (await request.json()) as CreateVersionRequest;

  // Validate recipe exists
  const recipeResult = await fetchAndValidateRecipe(tenantId, recipeId);
  if (!recipeResult.success) {
    return recipeResult.response;
  }

  const recipe = recipeResult.recipe;
  const nextVersionNumber = await getNextVersionNumber(tenantId, recipeId);
  const runtimeContext = await createRuntimeContext(authResult.context);
  const recipeVersionId = randomUUID();

  // Normalize request data
  const normalizedData = normalizeCreateVersionRequest(body, recipe);

  // Execute version creation workflow with atomic outbox
  const workflowResult = await executeVersionCreationWorkflow(
    tenantId,
    recipeId,
    recipeVersionId,
    nextVersionNumber,
    runtimeContext,
    normalizedData,
    {
      eventType: "kitchen.recipe.version.created",
      payload: {
        versionId: recipeVersionId,
        recipeId,
        versionNumber: nextVersionNumber,
        yieldQuantity: Number(normalizedData.yieldQuantity),
      } as Prisma.InputJsonValue,
    }
  );

  if (!workflowResult.success) {
    return workflowResult.response;
  }

  return buildVersionResponse({
    versionId: recipeVersionId,
    recipeId,
    versionNumber: nextVersionNumber,
    name: normalizedData.name,
    yieldQuantity: normalizedData.yieldQuantity,
    yieldUnitId: normalizedData.yieldUnitId,
    constraintOutcomes: workflowResult.result.constraintOutcomes,
    emittedEvents: workflowResult.result.emittedEvents,
  });
}
