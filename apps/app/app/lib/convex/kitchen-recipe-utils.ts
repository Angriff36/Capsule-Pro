import { convexDocId, type ConvexDoc } from "./server-reads";

export function latestVersionByRecipe(
  versions: ConvexDoc[],
  recipeIds: Set<string>
): Map<string, ConvexDoc> {
  const byRecipe = new Map<string, ConvexDoc>();

  for (const version of versions) {
    const recipeId = String(version.recipeId);
    if (!recipeIds.has(recipeId)) {
      continue;
    }

    const existing = byRecipe.get(recipeId);
    const versionNumber = Number(version.versionNumber ?? 0);
    const existingNumber = existing
      ? Number(existing.versionNumber ?? 0)
      : -1;

    if (!existing || versionNumber > existingNumber) {
      byRecipe.set(recipeId, version);
    }
  }

  return byRecipe;
}

export function eventScopedRows(rows: ConvexDoc[], eventId: string): ConvexDoc[] {
  return rows.filter((row) => String(row.eventId) === eventId);
}
