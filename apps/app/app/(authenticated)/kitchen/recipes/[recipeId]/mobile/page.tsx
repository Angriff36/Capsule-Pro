import { auth } from "@repo/auth/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { MobileRecipeClient } from "./mobile-recipe-client";

export const metadata = {
  title: "Recipe Viewer",
  description: "Mobile-optimized recipe viewer for kitchen staff",
};

const MobileRecipePage = async ({
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

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          className="rounded-full p-2 hover:bg-muted"
          href={`/kitchen/recipes/${recipeId}`}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Recipe Viewer</h1>
      </header>

      <MobileRecipeClient recipeId={recipeId} tenantId={tenantId} />
    </>
  );
};

export default MobileRecipePage;
