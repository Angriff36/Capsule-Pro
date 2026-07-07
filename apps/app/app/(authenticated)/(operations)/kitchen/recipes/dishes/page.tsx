import { redirect } from "next/navigation";

/**
 * /kitchen/recipes/dishes has no standalone list — dishes are listed on the
 * recipes hub. Without this page the URL falls through to [recipeId] with
 * recipeId="dishes" and crashes on a uuid cast.
 */
export default function DishesIndexPage() {
  redirect("/kitchen/recipes");
}
