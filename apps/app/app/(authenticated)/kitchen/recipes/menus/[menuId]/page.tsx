import { auth } from "@repo/auth/server";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { AlertCircle, ArrowLeft, DollarSign, Edit, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../../components/header";
import { getMenuById } from "../actions";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { orgId } = await auth();

  if (!orgId) {
    return notFound();
  }

  const { menuId } = await params;
  const menu = await getMenuById(menuId);

  if (!menu) {
    return notFound();
  }

  // Group dishes by course
  const dishesByCourse = menu.dishes.reduce(
    (acc, dish) => {
      const course = dish.course || "Other";
      if (!acc[course]) {
        acc[course] = [];
      }
      acc[course].push(dish);
      return acc;
    },
    {} as Record<string, typeof menu.dishes>
  );

  // Aggregate dietary summary
  const allDietaryTags = new Set<string>();
  const allAllergens = new Set<string>();

  menu.dishes.forEach((dish) => {
    dish.dietaryTags.forEach((tag) => allDietaryTags.add(tag));
    dish.allergens.forEach((allergen) => allAllergens.add(allergen));
  });

  const courseOrder = [
    "appetizer",
    "main",
    "dessert",
    "beverage",
    "side",
    "other",
  ];
  const sortedCourses = Object.keys(dishesByCourse).sort((a, b) => {
    const aIndex = courseOrder.indexOf(a.toLowerCase());
    const bIndex = courseOrder.indexOf(b.toLowerCase());
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header page={menu.name} pages={["Kitchen Ops", "Recipes", "Menus"]} />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-6xl">
          {/* Back navigation */}
          <div className="mb-6">
            <Link
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              href="/kitchen/recipes?tab=menus"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menus
            </Link>
          </div>

          {/* Header with Edit button */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{menu.name}</h1>
              {menu.description && (
                <p className="mt-2 text-muted-foreground">{menu.description}</p>
              )}
            </div>
            <Link href={`/kitchen/recipes/menus/${menuId}/edit`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit Menu
              </Button>
            </Link>
          </div>

          {/* Menu metadata */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {menu.category && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{menu.category}</p>
                </CardContent>
              </Card>
            )}

            {(menu.basePrice || menu.pricePerPerson) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {menu.basePrice && (
                      <p className="text-sm">
                        Base: ${menu.basePrice.toFixed(2)}
                      </p>
                    )}
                    {menu.pricePerPerson && (
                      <p className="text-sm">
                        Per Person: ${menu.pricePerPerson.toFixed(2)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {(menu.minGuests || menu.maxGuests) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Guest Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    {menu.minGuests || "No min"}
                    {" - "}
                    {menu.maxGuests || "No max"}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={menu.isActive ? "default" : "secondary"}>
                  {menu.isActive ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Dietary Summary */}
          {(allDietaryTags.size > 0 || allAllergens.size > 0) && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Dietary Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allDietaryTags.size > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Dietary Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(allDietaryTags).map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {allAllergens.size > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <AlertCircle className="mr-2 h-4 w-4 text-destructive" />
                        Allergens
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(allAllergens).map((allergen) => (
                          <Badge key={allergen} variant="destructive">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dishes grouped by course */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Menu Dishes ({menu.dishes.length})
            </h2>

            {sortedCourses.map((course) => (
              <Card key={course}>
                <CardHeader>
                  <CardTitle className="text-xl capitalize">{course}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dishesByCourse[course].map((dish) => (
                      <div
                        className="flex items-start justify-between rounded-lg border p-4"
                        key={dish.dishId}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{dish.dishName}</h3>
                            {dish.isOptional && (
                              <Badge className="text-xs" variant="outline">
                                Optional
                              </Badge>
                            )}
                          </div>

                          {/* Dish dietary tags and allergens */}
                          {(dish.dietaryTags.length > 0 ||
                            dish.allergens.length > 0) && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {dish.dietaryTags.map((tag) => (
                                <Badge
                                  className="text-xs"
                                  key={tag}
                                  variant="outline"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {dish.allergens.map((allergen) => (
                                <Badge
                                  className="text-xs"
                                  key={allergen}
                                  variant="destructive"
                                >
                                  {allergen}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {dishesByCourse[course].length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No dishes in this course.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {menu.dishes.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No dishes have been added to this menu yet.
                  </p>
                  <Link
                    className="mt-4 inline-block"
                    href={`/kitchen/recipes/menus/${menuId}/edit`}
                  >
                    <Button>Add Dishes</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
