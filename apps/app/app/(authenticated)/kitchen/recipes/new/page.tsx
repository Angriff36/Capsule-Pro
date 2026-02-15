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

  const units = await database.$queryRaw<UnitRow[]>(
    Prisma.sql`
      SELECT id, code, name
      FROM core.units
      ORDER BY code ASC
    `
  );

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
