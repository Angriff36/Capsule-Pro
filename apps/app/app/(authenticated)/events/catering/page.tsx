import { listCateringOrders } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
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
import { CateringClient } from "./catering-client";

export default async function CateringOrdersPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const orders = (await listCateringOrders()).data;
  const total = orders.length;
  const draft = orders.filter((order) => order.orderStatus === "draft").length;
  const confirmed = orders.filter((order) => order.orderStatus === "confirmed").length;
  const inProgress = orders.filter((order) => order.orderStatus === "in_progress").length;
  const completed = orders.filter((order) => order.orderStatus === "completed").length;
  const cancelled = orders.filter((order) => order.orderStatus === "cancelled").length;
  const totalRevenue = orders
    .filter((order) => order.orderStatus !== "cancelled")
    .reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);

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
                {Number(totalRevenue).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
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
