import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
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
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Progress } from "@repo/design-system/components/ui/progress";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { serializeDecimal } from "@/app/lib/decimal";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Event Budget Details",
  description: "View event budget details, metrics, and line items",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  venue: "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
  catering: "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
  beverages:
    "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
  labor: "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
  equipment:
    "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
  other: "bg-muted/50 text-foreground dark:bg-muted/50 dark:text-foreground",
};

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface BudgetDetailPageProps {
  params: Promise<{ budgetId: string }>;
}

export default async function BudgetDetailPage({
  params,
}: BudgetDetailPageProps) {
  const { budgetId } = await params;
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch budget with line items
  const budget = await database.eventBudget.findFirst({
    where: { tenantId, id: budgetId, deletedAt: null },
    include: {
      lineItems: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
      event: {
        select: { id: true, title: true, eventDate: true },
      },
    },
  });

  if (!budget) {
    notFound();
  }

  // Serialize Decimal fields to numbers
  const totalBudget = serializeDecimal(budget.totalBudgetAmount) ?? 0;
  const totalActual = serializeDecimal(budget.totalActualAmount) ?? 0;
  const varianceAmt = serializeDecimal(budget.varianceAmount) ?? 0;
  const variancePct = serializeDecimal(budget.variancePercentage) ?? 0;
  const utilizationPct =
    totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  const lineItems = budget.lineItems.map((li) => ({
    id: li.id,
    category: li.category,
    name: li.name,
    description: li.description,
    budgetedAmount: serializeDecimal(li.budgetedAmount) ?? 0,
    actualAmount: serializeDecimal(li.actualAmount) ?? 0,
    varianceAmount: serializeDecimal(li.varianceAmount) ?? 0,
    notes: li.notes,
    sortOrder: li.sortOrder,
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">
              <Link
                className="underline-offset-4 hover:underline"
                href="/events/budgets"
              >
                Event Budgets
              </Link>{" "}
              / {budget.id.slice(0, 8)}
            </MonoLabel>
            <DisplayHeading>
              {budget.event?.title ?? "Event Budget"}
            </DisplayHeading>
            <CommandBandLede>
              Budget for {budget.event?.title || "event"}
              {budget.event?.eventDate
                ? ` (${new Date(budget.event.eventDate).toLocaleDateString()})`
                : ""}
              . Status: <span className="capitalize">{budget.status}</span>.
              Version {budget.version}.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/events/budgets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Budgets
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Status</MetricLabel>
              <MetricValue className="capitalize">{budget.status}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total Budget</MetricLabel>
              <MetricValue>{fmtCurrency(totalBudget)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Actual Spend</MetricLabel>
              <MetricValue>{fmtCurrency(totalActual)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Variance</MetricLabel>
              <MetricValue
                className={
                  varianceAmt < 0
                    ? "text-red-400"
                    : varianceAmt > 0
                      ? "text-green-400"
                      : ""
                }
              >
                {fmtCurrency(Math.abs(varianceAmt))}
                {varianceAmt < 0 ? " over" : varianceAmt > 0 ? " under" : ""}
              </MetricValue>
              <p className="text-sm text-white/70">{variancePct.toFixed(1)}%</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        {/* Utilization */}
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="text-base">Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{utilizationPct.toFixed(1)}%</span>
            </div>
            <Progress className="h-3" value={Math.min(utilizationPct, 100)} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fmtCurrency(totalActual)} spent</span>
              <span>of {fmtCurrency(totalBudget)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Budget Info */}
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="text-base">Budget Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Event ID:</span>{" "}
                {budget.eventId.slice(0, 8)}...
              </div>
              <div>
                <span className="text-muted-foreground">Version:</span>{" "}
                {budget.version}
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                {new Date(budget.createdAt).toLocaleDateString()}
              </div>
              <div>
                <span className="text-muted-foreground">Updated:</span>{" "}
                {new Date(budget.updatedAt).toLocaleDateString()}
              </div>
            </div>
            {budget.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <span className="text-sm font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {budget.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="text-base">
              Line Items ({lineItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No line items yet
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge
                          className={
                            CATEGORY_COLORS[item.category] ??
                            CATEGORY_COLORS.other
                          }
                          variant="outline"
                        >
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtCurrency(item.budgetedAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtCurrency(item.actualAmount)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm ${
                          item.varianceAmount < 0
                            ? "text-red-600"
                            : item.varianceAmount > 0
                              ? "text-green-600"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.varianceAmount === 0
                          ? "\u2014"
                          : fmtCurrency(Math.abs(item.varianceAmount))}
                        {item.varianceAmount < 0
                          ? " over"
                          : item.varianceAmount > 0
                            ? " under"
                            : ""}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </OperationalColumn>
    </PageCanvas>
  );
}
