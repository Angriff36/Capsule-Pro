import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Prisma, database } from "@repo/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../../components/header";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { createDish } from "../../actions";

type RecipeOption = {
  id: string;
  name: string;
};

const NewDishPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const recipes = await database.$queryRaw<RecipeOption[]>(
    Prisma.sql`
      SELECT id, name
      FROM tenant_kitchen.recipes
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY name ASC
    `,
  );

  return (
    <>
      <Header page="New Dish" pages={["Kitchen Ops", "Dishes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes?tab=dishes">Back to dishes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <form
          action={createDish}
          className="grid gap-6 lg:grid-cols-3"
          encType="multipart/form-data"
        >
          <Card className="lg:col-span-2">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="name">
                    Dish name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Herb Crusted Rack of Lamb"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="recipeId">
                    Linked recipe
                  </label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-foreground text-sm"
                    id="recipeId"
                    name="recipeId"
                    required
                  >
                    <option value="">Select recipe</option>
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="category">
                    Category
                  </label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="Main course"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="serviceStyle">
                    Service style
                  </label>
                  <Input
                    id="serviceStyle"
                    name="serviceStyle"
                    placeholder="Plated, family style"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="pricePerPerson"
                  >
                    Menu price per person
                  </label>
                  <Input
                    id="pricePerPerson"
                    name="pricePerPerson"
                    placeholder="38"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="costPerPerson"
                  >
                    Food cost per person
                  </label>
                  <Input
                    id="costPerPerson"
                    name="costPerPerson"
                    placeholder="12.5"
                    type="number"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="minPrepLeadDays"
                  >
                    Min prep lead (days)
                  </label>
                  <Input
                    id="minPrepLeadDays"
                    min="0"
                    name="minPrepLeadDays"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="maxPrepLeadDays"
                  >
                    Max prep lead (days)
                  </label>
                  <Input
                    id="maxPrepLeadDays"
                    min="0"
                    name="maxPrepLeadDays"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="font-medium text-sm"
                    htmlFor="portionSizeDescription"
                  >
                    Portion size
                  </label>
                  <Input
                    id="portionSizeDescription"
                    name="portionSizeDescription"
                    placeholder="6 oz per guest"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="dietaryTags">
                    Dietary tags
                  </label>
                  <Input
                    id="dietaryTags"
                    name="dietaryTags"
                    placeholder="GF, dairy free"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-medium text-sm" htmlFor="allergens">
                    Allergens
                  </label>
                  <Input
                    id="allergens"
                    name="allergens"
                    placeholder="nuts, dairy"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="font-medium text-sm" htmlFor="imageFile">
                  Presentation image
                </label>
                <Input
                  accept="image/*"
                  id="imageFile"
                  name="imageFile"
                  type="file"
                />
              </div>
              <div className="space-y-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="description"
                >
                  Service notes
                </label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Pair with roasted vegetables or seasonal garnish."
                  rows={5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit">Create dish</Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/kitchen/recipes?tab=dishes">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  );
};

export default NewDishPage;
