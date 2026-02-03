import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { Header } from "../../../../components/header";
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
    `
  );

  return (
    <>
      <Header page="New Dish" pages={["Kitchen Ops", "Dishes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes?tab=dishes">Back to dishes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <form
          action={createDish}
          className="space-y-8"
          encType="multipart/form-data"
        >
          {/* Basic Information Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Basic Information
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Dish name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Herb Crusted Rack of Lamb"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipeId">Linked recipe</Label>
                    <Select name="recipeId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map((recipe) => (
                          <SelectItem key={recipe.id} value={recipe.id}>
                            {recipe.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      placeholder="Main course"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceStyle">Service style</Label>
                    <Input
                      id="serviceStyle"
                      name="serviceStyle"
                      placeholder="Plated, family style"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dietaryTags">Dietary tags</Label>
                    <Input
                      id="dietaryTags"
                      name="dietaryTags"
                      placeholder="GF, dairy free"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergens">Allergens</Label>
                    <Input
                      id="allergens"
                      name="allergens"
                      placeholder="nuts, dairy"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Pricing & Costs Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Pricing & Costs
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pricePerPerson">Menu price per person</Label>
                    <Input
                      id="pricePerPerson"
                      name="pricePerPerson"
                      placeholder="38"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costPerPerson">Food cost per person</Label>
                    <Input
                      id="costPerPerson"
                      name="costPerPerson"
                      placeholder="12.5"
                      type="number"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Timing & Portions Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Timing & Portions
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="minPrepLeadDays">Min prep lead (days)</Label>
                    <Input
                      id="minPrepLeadDays"
                      min="0"
                      name="minPrepLeadDays"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxPrepLeadDays">Max prep lead (days)</Label>
                    <Input
                      id="maxPrepLeadDays"
                      min="0"
                      name="maxPrepLeadDays"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portionSizeDescription">Portion size</Label>
                    <Input
                      id="portionSizeDescription"
                      name="portionSizeDescription"
                      placeholder="6 oz per guest"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Media & Actions Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Media & Actions
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="imageFile">Presentation image</Label>
                  <Input
                    accept="image/*"
                    id="imageFile"
                    name="imageFile"
                    type="file"
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="description">Service notes</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Pair with roasted vegetables or seasonal garnish."
                    rows={5}
                  />
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button type="submit">Create dish</Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/kitchen/recipes?tab=dishes">Cancel</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </form>
      </div>
    </>
  );
};

export default NewDishPage;
