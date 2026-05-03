import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const statusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
    case "finalized":
      return "default" as const;
    case "in_progress":
    case "in progress":
      return "secondary" as const;
    case "pending":
    case "draft":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const formatPercent = (value: number) => `${Math.round(value)}%`;

const formatTaskQuantity = (completed: unknown, total: unknown) => {
  const completedValue = Number(completed ?? 0);
  const totalValue = Number(total ?? 0);

  return `${numberFormatter.format(completedValue)} / ${numberFormatter.format(totalValue)}`;
};

const UnavailableState = () => (
  <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
    <div className="space-y-0.5">
      <h1 className="text-2xl font-semibold tracking-tight">Kitchen analytics</h1>
      <p className="text-muted-foreground">
        Unable to load kitchen analytics right now.
      </p>
    </div>
    <Separator />
    <Card>
      <CardContent className="p-6 text-muted-foreground text-sm">
        The kitchen analytics page could not read tenant data. Try again after
        the database connection recovers.
      </CardContent>
    </Card>
  </div>
);

const KitchenAnalyticsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  let tenantId: string;

  try {
    tenantId = await getTenantIdForOrg(orgId);
  } catch {
    return <UnavailableState />;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    recipeCount,
    openPrepTaskCount,
    completedPrepTaskCount,
    prepListTotal,
    finalizedPrepListCount,
    wasteCostAggregate,
    upcomingPrepTasks,
    recentPrepLists,
    recentWasteEntries,
    recentRecipes,
  ] = await Promise.all([
    database.recipe.count({
      where: { tenantId, deletedAt: null },
    }),
    database.prepTask.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["pending", "in_progress"] },
      },
    }),
    database.prepTask.count({
      where: {
        tenantId,
        deletedAt: null,
        status: "completed",
        updatedAt: { gte: thirtyDaysAgo },
      },
    }),
    database.prepList.count({
      where: {
        tenantId,
        deletedAt: null,
        generatedAt: { gte: thirtyDaysAgo },
      },
    }),
    database.prepList.count({
      where: {
        tenantId,
        deletedAt: null,
        finalizedAt: { gte: thirtyDaysAgo },
      },
    }),
    database.wasteEntry.aggregate({
      where: {
        tenantId,
        deletedAt: null,
        loggedAt: { gte: thirtyDaysAgo },
      },
      _sum: { totalCost: true },
    }),
    database.prepTask.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: [{ dueByDate: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        priority: true,
        dueByDate: true,
        quantityCompleted: true,
        quantityTotal: true,
        locationId: true,
      },
    }),
    database.prepList.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { generatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        status: true,
        totalItems: true,
        generatedAt: true,
        finalizedAt: true,
      },
    }),
    database.wasteEntry.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { loggedAt: "desc" },
      take: 6,
      select: {
        id: true,
        loggedAt: true,
        quantity: true,
        totalCost: true,
        inventoryItem: {
          select: {
            name: true,
          },
        },
        reason: {
          select: {
            name: true,
          },
        },
      },
    }),
    database.recipe.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        category: true,
        isActive: true,
        updatedAt: true,
      },
    }),
  ]);

  const locationIds = Array.from(
    new Set(
      upcomingPrepTasks
        .map((task) => task.locationId)
        .filter((locationId): locationId is string => Boolean(locationId))
    )
  );

  const locations = locationIds.length
    ? await database.location.findMany({
        where: {
          tenantId,
          id: { in: locationIds },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const locationMap = new Map(locations.map((location) => [location.id, location.name]));
  const prepListSyncRate =
    prepListTotal > 0 ? (finalizedPrepListCount / prepListTotal) * 100 : 0;
  const wasteCost30d = Number(wasteCostAggregate._sum.totalCost ?? 0);

  const heroMetrics = [
    {
      label: "Live recipes",
      value: numberFormatter.format(recipeCount),
      note: "Active recipe catalog entries",
    },
    {
      label: "Open prep tasks",
      value: numberFormatter.format(openPrepTaskCount),
      note: "Pending or in-progress tasks",
    },
    {
      label: "Prep lists finalized",
      value: prepListTotal > 0 ? formatPercent(prepListSyncRate) : "0%",
      note: `${finalizedPrepListCount} of ${prepListTotal} in the last 30 days`,
    },
    {
      label: "Waste logged",
      value: currencyFormatter.format(wasteCost30d),
      note: "Total waste cost in the last 30 days",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen analytics</h1>
        <p className="text-muted-foreground">
          A tenant-scoped kitchen operations snapshot with live prep, waste, and
          recipe activity.
        </p>
      </div>
      <Separator />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {heroMetrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-3">
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              {metric.note}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming prep tasks</CardTitle>
            <CardDescription>
              Next kitchen work items ordered by due date and priority.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPrepTasks.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground" colSpan={4}>
                      No prep tasks found for this tenant.
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingPrepTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{task.name}</div>
                          <div className="text-muted-foreground text-xs">
                            Due {dateFormatter.format(task.dueByDate)} • Priority {task.priority}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(task.status)}>
                          {task.status.replaceAll("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {locationMap.get(task.locationId) ?? "Unknown location"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatTaskQuantity(task.quantityCompleted, task.quantityTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent waste log</CardTitle>
            <CardDescription>
              Latest waste entries pulled directly from the kitchen ledger.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentWasteEntries.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground" colSpan={4}>
                      No waste entries logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentWasteEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.inventoryItem.name}</div>
                        <div className="text-muted-foreground text-xs">
                          Qty {numberFormatter.format(Number(entry.quantity))}
                        </div>
                      </TableCell>
                      <TableCell>{entry.reason.name}</TableCell>
                      <TableCell>{dateFormatter.format(entry.loggedAt)}</TableCell>
                      <TableCell className="text-right">
                        {entry.totalCost === null
                          ? "—"
                          : currencyFormatter.format(Number(entry.totalCost))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prep list sync</CardTitle>
            <CardDescription>
              Recently generated prep lists and whether they reached a finalized state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPrepLists.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground" colSpan={3}>
                      No prep lists generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentPrepLists.map((prepList) => (
                    <TableRow key={prepList.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{prepList.name}</div>
                          <div className="text-muted-foreground text-xs">
                            Generated {dateFormatter.format(prepList.generatedAt)}
                            {prepList.finalizedAt
                              ? ` • Finalized ${dateFormatter.format(prepList.finalizedAt)}`
                              : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(prepList.status)}>
                          {prepList.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{prepList.totalItems}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently updated recipes</CardTitle>
            <CardDescription>
              Quick visibility into the live recipe catalog behind kitchen operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRecipes.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center text-muted-foreground" colSpan={3}>
                      No recipes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRecipes.map((recipe) => (
                    <TableRow key={recipe.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{recipe.name}</div>
                          <div className="text-muted-foreground text-xs">
                            Updated {dateFormatter.format(recipe.updatedAt)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{recipe.category ?? "Uncategorized"}</TableCell>
                      <TableCell>
                        <Badge variant={recipe.isActive ? "default" : "outline"}>
                          {recipe.isActive ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>30-day completion snapshot</CardTitle>
          <CardDescription>
            Completed prep work in the last 30 days compared with currently open work.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-sm">Completed tasks</div>
            <div className="mt-2 font-semibold text-3xl">
              {numberFormatter.format(completedPrepTaskCount)}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-muted-foreground text-sm">Still open</div>
            <div className="mt-2 font-semibold text-3xl">
              {numberFormatter.format(openPrepTaskCount)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KitchenAnalyticsPage;
