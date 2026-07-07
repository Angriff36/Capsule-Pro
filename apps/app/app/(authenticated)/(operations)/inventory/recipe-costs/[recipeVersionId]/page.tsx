import { RecipeCostDetailClient } from "./recipe-cost-detail-client";

interface RecipeCostPageProps {
  params: Promise<{ recipeVersionId: string }>;
}

export default async function RecipeCostPage({ params }: RecipeCostPageProps) {
  const { recipeVersionId } = await params;

  return <RecipeCostDetailClient recipeVersionId={recipeVersionId} />;
}
