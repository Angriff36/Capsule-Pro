import { auth } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Prisma, database } from "@repo/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../../components/header";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { cleanupImportedItems } from "./server-actions";

type CleanupCandidate = {
  id: string;
  name: string;
  category: string | null;
  tags: string[] | null;
  dish_count: number;
  ingredient_count: number;
  step_count: number;
};

type Classification = {
  action: "inventory" | "ingredient" | "skip";
  category: string;
};

const SUPPLY_KEYWORDS = [
  "chafing",
  "chafer",
  "sterno",
  "serveware",
  "servingware",
  "plate",
  "utensil",
  "fork",
  "spoon",
  "knife",
  "napkin",
  "plasticware",
  "disposable",
  "tray",
  "pan",
  "lid",
  "container",
  "place setting",
  "cutlery",
  "tongs",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "iced tea",
  "tea",
  "lemonade",
  "coffee",
  "juice",
  "soda",
  "beverage",
  "drink",
];

const INGREDIENT_KEYWORDS = [
  "cheese",
  "lettuce",
  "tortilla",
  "rice",
  "beans",
  "salsa",
  "cream",
  "butter",
  "onion",
  "pickles",
  "tomato",
  "cilantro",
  "lime",
  "garlic",
  "pepper",
  "salt",
];

const normalize = (value: string) =>
  value.replace(/\uFEFF/g, "").trim().replace(/\s+/g, " ").toLowerCase();

const classifyCandidate = (name: string): Classification => {
  const normalized = normalize(name);

  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "inventory", category: "serveware" };
  }

  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword),
  );
  if (isBeverage) {
    const isPackaged =
      normalized.includes("bottle") || normalized.includes("bottled");
    return {
      action: isPackaged ? "inventory" : "skip",
      category: "beverage",
    };
  }

  if (INGREDIENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "ingredient", category: "ingredient" };
  }

  return { action: "skip", category: "menu" };
};

const CleanupImportsPage = async () => {
  const { orgId } = await auth();
  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const candidates = await database.$queryRaw<CleanupCandidate[]>(
    Prisma.sql`
      SELECT
        r.id,
        r.name,
        r.category,
        r.tags,
        COALESCE(ingredients.count, 0) AS ingredient_count,
        COALESCE(steps.count, 0) AS step_count,
        COALESCE(dishes.count, 0) AS dish_count
      FROM tenant_kitchen.recipes r
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM tenant_kitchen.recipe_versions rv
        JOIN tenant_kitchen.recipe_ingredients ri
          ON ri.tenant_id = rv.tenant_id
          AND ri.recipe_version_id = rv.id
          AND ri.deleted_at IS NULL
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipe_id = r.id
          AND rv.deleted_at IS NULL
      ) ingredients ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM tenant_kitchen.recipe_versions rv
        JOIN tenant_kitchen.recipe_steps rs
          ON rs.tenant_id = rv.tenant_id
          AND rs.recipe_version_id = rv.id
          AND rs.deleted_at IS NULL
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipe_id = r.id
          AND rv.deleted_at IS NULL
      ) steps ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM tenant_kitchen.dishes d
        WHERE d.tenant_id = r.tenant_id
          AND d.recipe_id = r.id
          AND d.deleted_at IS NULL
      ) dishes ON true
      WHERE r.tenant_id = ${tenantId}
        AND r.deleted_at IS NULL
    `,
  );

  const rows = candidates
    .filter((candidate) => candidate.ingredient_count === 0)
    .filter((candidate) => candidate.step_count === 0)
    .map((candidate) => ({
      ...candidate,
      classification: classifyCandidate(candidate.name),
    }))
    .filter((candidate) => candidate.classification.action !== "skip");

  return (
    <>
      <Header page="Cleanup Imports" pages={["Kitchen Ops", "Recipes"]}>
        <Button asChild variant="ghost">
          <Link href="/kitchen/recipes">Back to recipes</Link>
        </Button>
      </Header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Imported item cleanup</CardTitle>
            <p className="text-muted-foreground text-sm">
              These items have no ingredients or steps. Cleanup will move supplies
              to warehouse inventory and convert ingredient-like entries to
              kitchen ingredients.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No cleanup candidates found.
              </p>
            ) : (
              <form action={cleanupImportedItems} className="space-y-4">
                <div className="grid gap-3">
                  {rows.map((row) => (
                    <label
                      className="flex flex-col gap-1 rounded-md border px-4 py-3 text-sm"
                      key={row.id}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="font-medium">{row.name}</div>
                        <span className="text-muted-foreground text-xs">
                          {row.classification.action === "inventory"
                            ? "Move to inventory"
                            : "Convert to ingredient"}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Linked dishes: {row.dish_count}
                      </div>
                      <input
                        defaultChecked
                        name="recipeIds"
                        type="checkbox"
                        value={row.id}
                      />
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit">Run cleanup</Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/kitchen/recipes">Cancel</Link>
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default CleanupImportsPage;
