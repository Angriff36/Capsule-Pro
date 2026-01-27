import { RecipeCostDetailClient } from "./recipe-cost-detail-client";

type RecipeCostPageProps = {
  params: Promise<{ recipeVersionId: string }>;
};

export default async function RecipeCostPage({ params }: RecipeCostPageProps) {
  const { recipeVersionId } = await params;

  return <RecipeCostDetailClient recipeVersionId={recipeVersionId} />;
}
