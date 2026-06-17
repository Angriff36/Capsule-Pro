import { listPrepLists, listPrepTasks, listRecipes, listWasteEntries } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { serverListEntity } from "@/app/lib/convex/server-reads";

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
  <PageCanvas>
    <CommandBand>
      <CommandBandHeader>
        <MonoLabel tone="dark">ANALYTICS</MonoLabel>
        <DisplayHeading size="md">Kitchen analytics</DisplayHeading>
        <CommandBandLede>
          Unable to load kitchen analytics right now.
        </CommandBandLede>
      </CommandBandHeader>
    </CommandBand>
    <div className="p-6 text-muted-foreground text-sm">
      The kitchen analytics page could not read tenant data. Try again after the
      database connection recovers.
    </div>
  </PageCanvas>
);

const KitchenAnalyticsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  try {
    await getTenantIdForOrg(orgId);
  } catch {
    return <UnavailableState />;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [prepTasks, prepLists, wasteEntries, recipes, locationDocs] =
    await Promise.all([
      (await listPrepTasks()).data,
      (await listPrepLists()).data,
      (await listWasteEntries()).data,
      (await listRecipes()).data,
      serverListEntity("Location"),
    ]);

  const recipeCount = recipes.length;
  const openPrepTaskCount = prepTasks.filter(
    (task) => !["completed", "done"].includes(String(task.status).toLowerCase())
  ).length;
  const completedPrepTaskCount = prepTasks.filter((task) =>
    ["completed", "done"].includes(String(task.status).toLowerCase())
  ).length;
  const prepListTotal = prepLists.length;
  const finalizedPrepListCount = prepLists.filter((prepList) =>
    ["finalized", "completed"].includes(String(prepList.status).toLowerCase())
  ).length;
  const wasteCost30d = wasteEntries
    .filter((entry) => entry.loggedAt >= thirtyDaysAgo)
    .reduce((sum, entry) => sum + Number(entry.totalCost ?? 0), 0);
  const upcomingPrepTasks = [...prepTasks]
    .sort((a, b) => a.dueByDate.getTime() - b.dueByDate.getTime())
    .slice(0, 20);
  const recentPrepLists = [...prepLists]
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
    .slice(0, 10);
  const recentWasteEntries = [...wasteEntries]
    .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
    .slice(0, 10);
  const recentRecipes = [...recipes]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 10);

  const locationIds = Array.from(
    new Set(
      upcomingPrepTasks
        .map((task) => task.locationId)
        .filter((locationId): locationId is string => Boolean(locationId))
    )
  );

  const locations = locationIds.length
    ? locationDocs
        .filter((location) => locationIds.includes(String(location._id)))
        .map((location) => ({
          id: String(location._id),
          name: String(location.name ?? "Unknown"),
        }))
    : [];

  const locationMap = new Map(
    locations.map((location) => [location.id, location.name])
  );
  const prepListSyncRate =
    prepListTotal > 0 ? (finalizedPrepListCount / prepListTotal) * 100 : 0;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">ANALYTICS</MonoLabel>
          <DisplayHeading size="md">Kitchen analytics</DisplayHeading>
          <CommandBandLede>
            A tenant-scoped kitchen operations snapshot with live prep, waste,
            and recipe activity.
          </CommandBandLede>
        </CommandBandHeader>
      </CommandBand>

      <MetricBand>
        <MetricCell>
          <MetricValue>{numberFormatter.format(recipeCount)}</MetricValue>
          <MetricLabel>Live recipes</MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{numberFormatter.format(openPrepTaskCount)}</MetricValue>
          <MetricLabel>Open prep tasks</MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>
            {prepListTotal > 0 ? formatPercent(prepListSyncRate) : "0%"}
          </MetricValue>
          <MetricLabel>Prep lists finalized</MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{currencyFormatter.format(wasteCost30d)}</MetricValue>
          <MetricLabel>Waste logged (30d)</MetricLabel>
        </MetricCell>
      </MetricBand>

      <OperationalColumn>
        <SectionHeader title="Upcoming prep tasks" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={4}
                  >
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
                          Due {dateFormatter.format(task.dueByDate)} • Priority{" "}
                          {task.priority}
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
                      {formatTaskQuantity(
                        task.quantityCompleted,
                        task.quantityTotal
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <SectionHeader title="Recent waste log" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No waste entries logged yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentWasteEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">
                        {entry.inventoryItem.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Qty {numberFormatter.format(Number(entry.quantity))}
                      </div>
                    </TableCell>
                    <TableCell>{entry.reason.name}</TableCell>
                    <TableCell>
                      {dateFormatter.format(entry.loggedAt)}
                    </TableCell>
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
        </div>

        <SectionHeader title="Prep list sync" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={3}
                  >
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
                    <TableCell className="text-right">
                      {prepList.totalItems}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <SectionHeader title="Recently updated recipes" />
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={3}
                  >
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
        </div>

        <SectionHeader title="30-day completion snapshot" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            <div className="text-muted-foreground text-sm">Completed tasks</div>
            <div className="mt-2 font-semibold text-lg">
              {numberFormatter.format(completedPrepTaskCount)}
            </div>
          </div>
          <div className="rounded-[22px] border border-hairline bg-canvas p-6">
            <div className="text-muted-foreground text-sm">Still open</div>
            <div className="mt-2 font-semibold text-lg">
              {numberFormatter.format(openPrepTaskCount)}
            </div>
          </div>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default KitchenAnalyticsPage;
