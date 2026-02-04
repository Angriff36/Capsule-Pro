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
import { Header } from "../../../components/header";
import { createRecipe } from "../actions";

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
        <form
          action={createRecipe}
          className="space-y-8"
          encType="multipart/form-data"
        >
          {/* Recipe Information Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Recipe Information
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Recipe name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Herb Crusted Rack of Lamb"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      placeholder="Main course"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Short summary for the kitchen team."
                    rows={4}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="yieldQuantity">Yield quantity</Label>
                    <Input
                      id="yieldQuantity"
                      min="1"
                      name="yieldQuantity"
                      placeholder="4"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldUnit">Yield unit</Label>
                    <Select
                      defaultValue={units[0]?.code ?? "ea"}
                      name="yieldUnit"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.code}>
                            {unit.code} - {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldDescription">Yield notes</Label>
                    <Input
                      id="yieldDescription"
                      name="yieldDescription"
                      placeholder="Serves 4"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="prepTimeMinutes">Prep time (min)</Label>
                    <Input
                      id="prepTimeMinutes"
                      min="0"
                      name="prepTimeMinutes"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cookTimeMinutes">Cook time (min)</Label>
                    <Input
                      id="cookTimeMinutes"
                      min="0"
                      name="cookTimeMinutes"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restTimeMinutes">Rest time (min)</Label>
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
                    <Label htmlFor="difficultyLevel">Difficulty (1-5)</Label>
                    <Input
                      id="difficultyLevel"
                      max="5"
                      min="1"
                      name="difficultyLevel"
                      type="number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input id="tags" name="tags" placeholder="GF, seasonal" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Ingredients & Steps Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Ingredients & Steps
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="ingredients">
                    Ingredients (one per line)
                  </Label>
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
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="steps">Steps (one per line)</Label>
                  <Textarea
                    id="steps"
                    name="steps"
                    placeholder="Trim the racks and season generously."
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Media & Notes Section */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              Media & Notes
            </h2>
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="imageFile">Hero image</Label>
                  <Input
                    accept="image/*"
                    id="imageFile"
                    name="imageFile"
                    type="file"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Kitchen notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Share plating or storage notes for staff."
                    rows={5}
                  />
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button type="submit">Create recipe</Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/kitchen/recipes">Cancel</Link>
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

export default NewRecipePage;
