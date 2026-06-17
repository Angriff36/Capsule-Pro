import { auth } from "@repo/auth/server";
import {
  listEvents,
  listPrepTasks,
  listRecipeVersions,
} from "@/app/lib/manifest-client.generated";
import {
  calculateRecipeCostBreakdown,
  scaleRecipeCostBreakdown,
  type RecipeCostBreakdownCore,
  type ScaledRecipeCostCore,
} from "@/app/lib/recipe-costing-calculator";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { recipeIngredientUpdateWasteFactor } from "@/app/lib/manifest-client.generated";

export type RecipeCostBreakdown = RecipeCostBreakdownCore;
export type IngredientCostBreakdown = RecipeCostBreakdownCore["ingredients"][number];
export type ScaledRecipeCost = ScaledRecipeCostCore;

async function getTenantId() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  return getTenantIdForOrg(orgId);
}

export const getRecipeCostSummary = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> =>
  calculateRecipeCostBreakdown(recipeVersionId);

export const recalculateRecipeCosts = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> =>
  calculateRecipeCostBreakdown(recipeVersionId, { persist: true });

export const scaleRecipeCost = async (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number
): Promise<ScaledRecipeCost> =>
  scaleRecipeCostBreakdown(recipeVersionId, targetPortions, currentYield);

export const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId: string,
  wasteFactor: number
): Promise<void> => {
  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }
  await recipeIngredientUpdateWasteFactor({
    id: recipeIngredientId,
    newWasteFactor: wasteFactor,
  });
};

export const updateEventBudgetsForRecipe = async (
  recipeVersionId: string
): Promise<void> => {
  await getTenantId();
  const user = await requireCurrentUser();
  const [prepTasks, recipeVersions, events] = await Promise.all([
    listPrepTasks(),
    listRecipeVersions(),
    listEvents(),
  ]);
  const version = recipeVersions.data.find((entry) => entry.id === recipeVersionId);
  if (!version) return;
  const impactedEventIds = new Set(
    prepTasks.data
      .filter((task) => task.recipeVersionId === recipeVersionId && task.eventId && !task.deletedAt)
      .map((task) => task.eventId as string)
  );
  for (const event of events.data) {
    if (!impactedEventIds.has(event.id)) continue;
    await runManifestCommand({
      entity: "Event",
      command: "updateBudget",
      body: {
        id: event.id,
        newBudget: (event.budget ?? 0) + (version.totalCost ?? 0),
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }
};
