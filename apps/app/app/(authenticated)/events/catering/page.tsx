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
import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { CateringClient } from "./catering-client";

export default async function CateringOrdersPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const [total, draft, confirmed, inProgress, completed, cancelled] =
    await Promise.all([
      database.cateringOrder.count({
        where: { tenantId, deletedAt: null },
      }),
      database.cateringOrder.count({
        where: { tenantId, deletedAt: null, order_status: "draft" },
      }),
      database.cateringOrder.count({
        where: { tenantId, deletedAt: null, order_status: "confirmed" },
      }),
      database.cateringOrder.count({
        where: {
          tenantId,
          deletedAt: null,
          order_status: "in_progress",
        },
      }),
      database.cateringOrder.count({
        where: { tenantId, deletedAt: null, order_status: "completed" },
      }),
      database.cateringOrder.count({
        where: { tenantId, deletedAt: null, order_status: "cancelled" },
      }),
    ]);

  const totalRevenue = await database.cateringOrder.aggregate({
    where: { tenantId, deletedAt: null, order_status: { not: "cancelled" } },
    _sum: { totalAmount: true },
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Events / Catering</MonoLabel>
            <DisplayHeading>Catering Orders</DisplayHeading>
            <CommandBandLede>
              Manage catering orders from draft through delivery. Track
              financials, venue details, guest counts, and staff assignments.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/events">Back to Events</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Orders</MetricLabel>
              <MetricValue>{total}</MetricValue>
              <p className="text-sm text-white/70">
                {draft} draft, {confirmed} confirmed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>In Progress</MetricLabel>
              <MetricValue>{inProgress}</MetricValue>
              <p className="text-sm text-white/70">Currently in prep</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Revenue</MetricLabel>
              <MetricValue>
                $
                {Number(totalRevenue._sum.totalAmount ?? 0).toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 }
                )}
              </MetricValue>
              <p className="text-sm text-white/70">
                {completed} completed orders
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Cancelled</MetricLabel>
              <MetricValue>{cancelled}</MetricValue>
              <p className="text-sm text-white/70">
                {total > 0
                  ? `${((cancelled / total) * 100).toFixed(1)}%`
                  : "0%"}{" "}
                cancellation rate
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} order${total === 1 ? "" : "s"}`}
            description="Create and manage catering orders with full lifecycle tracking."
            eyebrow="Catering"
            title="All Orders"
          />
          <CateringClient
            initialMetrics={{
              total,
              draft,
              confirmed,
              inProgress,
              completed,
              cancelled,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
