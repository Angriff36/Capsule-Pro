import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Prisma, database } from "@repo/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/header";
import { createRecipe } from "../actions";

type UnitRow = {
  id: number;
  code: string;
  name: string;
};

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
    `,
  );

  return (
    <>
      <Header page="New Recipe" pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes">Back to recipes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <form action={createRecipe} className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">
                    Recipe name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Herb Crusted Rack of Lamb"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="category">
                    Category
                  </label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="Main course"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Short summary for the kitchen team."
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="yieldQuantity">
                    Yield quantity
                  </label>
                  <Input
                    id="yieldQuantity"
                    min="1"
                    name="yieldQuantity"
                    placeholder="4"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="yieldUnit">
                    Yield unit
                  </label>
                  <select
                    className="border-input bg-background text-foreground h-9 w-full rounded-md border px-3 text-sm"
                    defaultValue={units[0]?.code ?? "ea"}
                    id="yieldUnit"
                    name="yieldUnit"
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.code}>
                        {unit.code} - {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="yieldDescription"
                  >
                    Yield notes
                  </label>
                  <Input
                    id="yieldDescription"
                    name="yieldDescription"
                    placeholder="Serves 4"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="prepTimeMinutes"
                  >
                    Prep time (min)
                  </label>
                  <Input
                    id="prepTimeMinutes"
                    min="0"
                    name="prepTimeMinutes"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="cookTimeMinutes"
                  >
                    Cook time (min)
                  </label>
                  <Input
                    id="cookTimeMinutes"
                    min="0"
                    name="cookTimeMinutes"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="restTimeMinutes"
                  >
                    Rest time (min)
                  </label>
                  <Input
                    id="restTimeMinutes"
                    min="0"
                    name="restTimeMinutes"
                    type="number"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium"
                    htmlFor="difficultyLevel"
                  >
                    Difficulty (1-5)
                  </label>
                  <Input
                    id="difficultyLevel"
                    max="5"
                    min="1"
                    name="difficultyLevel"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="tags">
                    Tags (comma separated)
                  </label>
                  <Input id="tags" name="tags" placeholder="GF, seasonal" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="ingredients">
                  Ingredients (one per line)
                </label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  placeholder="2 lb rack of lamb"
                  rows={6}
                />
                <p className="text-muted-foreground text-xs">
                  Tip: start with quantity and unit, then ingredient name.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="steps">
                  Steps (one per line)
                </label>
                <Textarea
                  id="steps"
                  name="steps"
                  placeholder="Trim the racks and season generously."
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="imageUrl">
                  Hero image URL
                </label>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="notes">
                  Kitchen notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Share plating or storage notes for staff."
                  rows={5}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button type="submit">Create recipe</Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/kitchen/recipes">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </>
  );
};

export default NewRecipePage;
