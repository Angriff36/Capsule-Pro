import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  ArrowLeft,
  CheckCircle,
  ChefHat,
  Clock,
  DollarSign,
  TrendingUp,
  UtensilsIcon,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
import { Header } from "../../../components/header";

interface DishDetailRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  service_style: string | null;
  presentation_image_url: string | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  price_per_person: number | null;
  cost_per_person: number | null;
  portion_size_description: string | null;
  min_prep_lead_days: number;
  max_prep_lead_days: number | null;
  is_active: boolean;
  recipe_id: string;
  recipe_name: string | null;
  event_count: number;
  prep_task_count: number;
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const formatPercent = (value: number | null) =>
  value === null ? "-" : `${Math.round(value)}%`;

export default async function DishDetailPage({
  params,
}: {
  params: Promise<{ dishId: string }>;
}) {
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const tenantId = await getTenantIdForOrg(orgId);
  const { dishId } = await params;

  const dishes = await database.$queryRaw<DishDetailRow[]>(
    Prisma.sql`
      SELECT
        d.id,
        d.name,
        d.description,
        d.category,
        d.service_style,
        d.presentation_image_url,
        d.dietary_tags,
        d.allergens,
        d.price_per_person,
        d.cost_per_person,
        d.portion_size_description,
        d.min_prep_lead_days,
        d.max_prep_lead_days,
        d.is_active,
        d.recipe_id,
        r.name AS recipe_name,
        COALESCE(events.count, 0) AS event_count,
        COALESCE(prep.count, 0) AS prep_task_count
      FROM tenant_kitchen.dishes d
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = d.tenant_id AND r.id = d.recipe_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM tenant_events.event_dishes ed
        WHERE ed.tenant_id = d.tenant_id AND ed.dish_id = d.id AND ed.deleted_at IS NULL
      ) events ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS count
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = d.tenant_id AND pt.dish_id = d.id AND pt.deleted_at IS NULL
      ) prep ON true
      WHERE d.tenant_id = ${tenantId}
        AND d.id = ${dishId}::uuid
        AND d.deleted_at IS NULL
    `
  );

  if (dishes.length === 0) return notFound();
  const dish = dishes[0];

  const margin =
    dish.price_per_person && dish.cost_per_person
      ? ((dish.price_per_person - dish.cost_per_person) / dish.price_per_person) * 100
      : null;

  const marginColor =
    margin !== null
      ? margin >= 60
        ? "text-emerald-600"
        : margin >= 40
          ? "text-amber-600"
          : "text-red-500"
      : "text-muted-foreground";

  return (
    <>
      <Header page={dish.name} pages={["Kitchen Ops", "Recipes & Menus", "Dishes"]} />
      <Separator />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Back link */}
        <Link
          href="/kitchen/recipes?tab=dishes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dishes
        </Link>

        {/* Hero */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Image */}
          <div className="w-full md:w-80 shrink-0">
            {dish.presentation_image_url ? (
              <img
                alt={dish.name}
                className="h-48 w-full rounded-lg object-cover"
                src={dish.presentation_image_url}
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-lg bg-gradient-to-br from-secondary/20 to-primary/10">
                <UtensilsIcon className="h-12 w-12 text-primary/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{dish.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {dish.is_active ? (
                    <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-0">
                      <CheckCircle className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Paused</Badge>
                  )}
                  {dish.category && (
                    <Badge className="bg-primary/10 text-primary border-0">{dish.category}</Badge>
                  )}
                  {dish.service_style && (
                    <Badge variant="outline">{dish.service_style}</Badge>
                  )}
                </div>
              </div>
            </div>

            {dish.description && (
              <p className="text-muted-foreground">{dish.description}</p>
            )}

            {/* Dietary & Allergens */}
            <div className="flex flex-wrap gap-2">
              {(dish.dietary_tags ?? []).map((tag) => (
                <Badge key={tag} className="bg-secondary/20 text-secondary-foreground border-0 text-xs">
                  {tag}
                </Badge>
              ))}
              {(dish.allergens ?? []).map((allergen) => (
                <Badge key={allergen} variant="destructive" className="text-xs">
                  ⚠ {allergen}
                </Badge>
              ))}
            </div>

            {/* Recipe link */}
            {dish.recipe_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">Recipe: </span>
                <Link
                  href={`/kitchen/recipes/${dish.recipe_id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {dish.recipe_name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-accent" />
                Food Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dish.cost_per_person ? currencyFormatter.format(dish.cost_per_person) : "-"}
              </div>
              <p className="text-xs text-muted-foreground">per person</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Menu Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dish.price_per_person ? currencyFormatter.format(dish.price_per_person) : "-"}
              </div>
              <p className="text-xs text-muted-foreground">per person</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${marginColor}`}>
                {formatPercent(margin)}
              </div>
              <p className="text-xs text-muted-foreground">profit margin</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-secondary" />
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dish.event_count}</div>
              <p className="text-xs text-muted-foreground">
                events · {dish.prep_task_count} prep tasks
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prep Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min prep lead time</span>
                <span className="font-medium">{dish.min_prep_lead_days} day{dish.min_prep_lead_days !== 1 ? "s" : ""}</span>
              </div>
              {dish.max_prep_lead_days && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max prep lead time</span>
                  <span className="font-medium">{dish.max_prep_lead_days} days</span>
                </div>
              )}
              {dish.portion_size_description && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Portion size</span>
                  <span className="font-medium">{dish.portion_size_description}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
