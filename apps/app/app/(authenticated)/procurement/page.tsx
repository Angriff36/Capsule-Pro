import { listProcurementBudgets, listPurchaseOrders, listPurchaseRequisitions, listVendorContracts } from "@/app/lib/manifest-client.generated";
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
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusLabel = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const revalidate = 60;

const ProcurementPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [
    requisitionCount,
    approvalsCount,
    draftPoCount,
    vendorCount,
    activeBudgetCount,
    recentRequisitions,
    recentOrders,
    recentContracts,
    recentBudgets,
  ] = await Promise.all([
    database.purchaseRequisition.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    }),
    database.purchaseRequisition.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ["pending_manager", "pending_finance"] },
      },
    }),
    database.purchaseOrder.count({
      where: {
        tenantId,
        deletedAt: null,
        status: "draft",
      },
    }),
    database.inventorySupplier.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    }),
    database.procurementBudget.count({
      where: {
        tenantId,
        deletedAt: null,
        status: "active",
      },
    }),
    (await listPurchaseRequisitions()).data,
    (await listPurchaseOrders()).data,
    (await listVendorContracts()).data,
    (await listProcurementBudgets()).data,
  ]);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Procurement</MonoLabel>
            <DisplayHeading>Requisitions, orders, and spend</DisplayHeading>
            <CommandBandLede>
              A simple procurement command center for reviewing requests,
              purchase orders, vendor contracts, and budget health.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="default" variant="on-dark">
                <Link href="/procurement/requisitions/new">
                  New requisition
                </Link>
              </Button>
              <Button asChild size="default" variant="secondary">
                <Link href="/procurement/purchase-orders/new">
                  New purchase order
                </Link>
              </Button>
            </div>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Requisitions</MetricLabel>
              <MetricValue>{String(requisitionCount)}</MetricValue>
              <div className="text-white/55 text-xs">All active requests</div>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Awaiting approval</MetricLabel>
              <MetricValue>{String(approvalsCount)}</MetricValue>
              <div className="text-white/55 text-xs">
                Manager or finance queue
              </div>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Draft POs</MetricLabel>
              <MetricValue>{String(draftPoCount)}</MetricValue>
              <div className="text-white/55 text-xs">
                Purchase orders not finalized
              </div>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Suppliers / Budgets</MetricLabel>
              <MetricValue>{`${vendorCount} / ${activeBudgetCount}`}</MetricValue>
              <div className="text-white/55 text-xs">
                Active vendors and budgets
              </div>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${recentRequisitions.length} recent`}
            description="Newest purchase requests from across departments."
            eyebrow="Requisitions"
            title="Recent requisitions"
          />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            {recentRequisitions.length === 0 ? (
              <div className="p-8 text-muted-foreground text-sm">
                No requisitions yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">
                      Estimated total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentRequisitions.map((requisition) => (
                    <TableRow key={requisition.id}>
                      <TableCell className="font-medium text-ink">
                        <Link
                          className="hover:underline"
                          href={`/procurement/requisitions/${requisition.id}`}
                        >
                          {requisition.requisitionNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {requisition.department || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabel(requisition.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateFormatter.format(requisition.requestDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFormatter.format(
                          Number(requisition.estimatedTotal)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeader
            count={`${recentOrders.length} recent`}
            description="Latest purchase orders generated by the team."
            eyebrow="Purchase orders"
            title="Recent orders"
          />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-muted-foreground text-sm">
                No purchase orders yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-ink">
                        <Link
                          className="hover:underline"
                          href={`/procurement/purchase-orders/${order.id}`}
                        >
                          {order.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {statusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dateFormatter.format(order.orderDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {currencyFormatter.format(Number(order.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-6">
            <SectionHeader
              count={`${recentContracts.length} tracked`}
              description="Contracts ordered by nearest end date."
              eyebrow="Vendor contracts"
              title="Upcoming contract milestones"
            />
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              {recentContracts.length === 0 ? (
                <div className="p-8 text-muted-foreground text-sm">
                  No vendor contracts yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>End date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-medium text-ink">
                          <Link
                            className="hover:underline"
                            href={`/procurement/vendor-contracts/${contract.id}`}
                          >
                            {contract.contractNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.vendorName || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {statusLabel(contract.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {contract.endDate
                            ? dateFormatter.format(contract.endDate)
                            : "No end date"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <SectionHeader
              count={`${recentBudgets.length} recent`}
              description="Latest budget records with current spend."
              eyebrow="Budgets"
              title="Budget snapshot"
            />
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              {recentBudgets.length === 0 ? (
                <div className="p-8 text-muted-foreground text-sm">
                  No procurement budgets yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Budget</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        Spent / budget
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBudgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium text-ink">
                          <Link
                            className="hover:underline"
                            href="/procurement/budget"
                          >
                            {budget.name}
                          </Link>
                        </TableCell>
                        <TableCell>{budget.fiscalYear}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {statusLabel(budget.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currencyFormatter.format(Number(budget.spentAmount))}
                          <span className="text-muted-foreground">
                            {" / "}
                            {currencyFormatter.format(
                              Number(budget.budgetAmount)
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </section>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
};

export default ProcurementPage;
