/**
 * @module NewIngredientPage
 * @intent Page wrapper for creating a new ingredient
 * @responsibility Authenticate, load unit options, render the new-ingredient form
 * @domain Kitchen
 * @tags ingredients, create, kitchen
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../../components/header";
import { NewIngredientForm } from "../../components/new-ingredient-form-client";

interface UnitOption {
  id: number;
  code: string;
  name: string;
}

const NewIngredientPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const units: UnitOption[] = await database.units.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  return (
    <>
      <Header page="New Ingredient" pages={["Kitchen Ops", "Ingredients"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes?tab=ingredients">
            Back to ingredients
          </Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <NewIngredientForm units={units} />
      </div>
    </>
  );
};

export default NewIngredientPage;
