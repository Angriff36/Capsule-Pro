import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/header";
import { NewRecipeForm } from "../components/new-recipe-form-client";

interface UnitRow {
  id: number;
  code: string;
  name: string;
}

const NewRecipePage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  // Fetch units and prioritize yield-appropriate units (servings, each, portions, etc.)
  // Temperature units like celsius should not be defaults for recipe yield
  const allUnits = await database.$queryRaw<UnitRow[]>(
    Prisma.sql`
      SELECT id, code, name
      FROM core.units
      ORDER BY code ASC
    `
  );

  // Yield-appropriate units in priority order
  const yieldUnitPriority = ["servings", "each", "portions", "pieces", "items", "dozen", "batch", "pan", "sheet"];

  // Sort units: yield-appropriate first (in priority order), then rest alphabetically
  const units = allUnits.sort((a, b) => {
    const aPriority = yieldUnitPriority.indexOf(a.code.toLowerCase());
    const bPriority = yieldUnitPriority.indexOf(b.code.toLowerCase());

    // If both are in priority list, sort by priority
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    // If only a is in priority list, a comes first
    if (aPriority !== -1) {
      return -1;
    }
    // If only b is in priority list, b comes first
    if (bPriority !== -1) {
      return 1;
    }
    // Neither in priority list, sort alphabetically
    return a.code.localeCompare(b.code);
  });

  return (
    <>
      <Header page="New Recipe" pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes">Back to recipes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <NewRecipeForm units={units} />
      </div>
    </>
  );
};

export default NewRecipePage;
