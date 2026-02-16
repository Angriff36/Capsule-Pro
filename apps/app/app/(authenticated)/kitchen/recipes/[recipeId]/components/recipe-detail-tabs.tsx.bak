"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { ChefHat, Clock, Users } from "lucide-react";

type RecipeDetailRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  is_active: boolean;
  yield_quantity: number | null;
  yield_unit: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  rest_time_minutes: number | null;
  instructions: string | null;
  notes: string | null;
  image_url: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  quantity: number;
  unit_code: string;
  notes: string | null;
  order_index: number;
};

type RecipeDetailTabsProps = {
  recipe: RecipeDetailRow;
  ingredients: IngredientRow[];
};

const formatMinutes = (minutes?: number | null) =>
  minutes && minutes > 0 ? `${minutes}m` : "-";

export function RecipeDetailTabs({
  recipe,
  ingredients,
}: RecipeDetailTabsProps) {
  return (
    <Tabs className="w-full" defaultValue="overview">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        <TabsTrigger value="steps">Steps</TabsTrigger>
        <TabsTrigger value="costing">Costing</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent className="space-y-4" value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Recipe Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={recipe.is_active ? "default" : "secondary"}>
                {recipe.is_active ? "Active" : "Inactive"}
              </Badge>
              {recipe.category && (
                <Badge variant="outline">{recipe.category}</Badge>
              )}
            </div>

            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}

            {/* Time and Yield Info */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Prep Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.prep_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <ChefHat className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Cook Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.cook_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Rest Time
                    </div>
                    <div className="font-semibold">
                      {formatMinutes(recipe.rest_time_minutes)}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Yield</div>
                    <div className="font-semibold">
                      {recipe.yield_quantity ?? "-"} {recipe.yield_unit ?? ""}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            {recipe.notes && (
              <div>
                <h3 className="mb-2 font-semibold">Notes</h3>
                <p className="text-muted-foreground">{recipe.notes}</p>
              </div>
            )}

            {/* Tags */}
            {recipe.tags && recipe.tags.length > 0 && (
              <div>
                <h3 className="mb-2 font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="ingredients">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            {ingredients.length === 0 ? (
              <p className="text-muted-foreground">No ingredients added yet.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {ingredients.map((ingredient) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={ingredient.id}
                  >
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="text-muted-foreground">
                      {ingredient.quantity} {ingredient.unit_code}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="steps">
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{recipe.instructions}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No instructions added yet.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="costing">
        <Card>
          <CardHeader>
            <CardTitle>Costing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Cost breakdown will be displayed here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent className="space-y-4" value="history">
        <Card>
          <CardHeader>
            <CardTitle>Version History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Version history will be displayed here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
