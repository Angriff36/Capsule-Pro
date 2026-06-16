import { listRecipes } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { Header } from "../../../../components/header";
import { NewDishForm } from "../../components/new-dish-form-client";

interface RecipeOption {
  id: string;
  name: string;
}

const NewDishPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const recipes: RecipeOption[] = (await listRecipes()).data;

  return (
    <>
      <Header page="New Dish" pages={["Kitchen Ops", "Dishes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes?tab=dishes">Back to dishes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <NewDishForm recipes={recipes} />
      </div>
    </>
  );
};

export default NewDishPage;
