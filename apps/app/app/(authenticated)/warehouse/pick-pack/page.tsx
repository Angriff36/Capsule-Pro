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
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { PickPackClient } from "./pick-pack-client";

export default async function PickPackPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  // Fetch metrics server-side
  const [usageTransactions, transfersToday, packedItems] =
    await Promise.all([
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: { in: ["usage", "transfer"] },
        },
      }),
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: "transfer",
          transaction_date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          },
        },
      }),
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: "usage",
          transaction_date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          },
        },
      }),
    ]);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Warehouse</MonoLabel>
            <DisplayHeading>Pick & Pack</DisplayHeading>
            <CommandBandLede>
              Fulfill orders using FIFO and FEFO picking strategies. Track pick
              queues, manage packing stations, and verify shipment readiness.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            {/* Future: batch pick / print pick list buttons */}
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Open picks</MetricLabel>
              <MetricValue>{usageTransactions}</MetricValue>
              <p className="text-sm text-white/70">
                Items awaiting pick assignment
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Picks today</MetricLabel>
              <MetricValue>{transfersToday}</MetricValue>
              <p className="text-sm text-white/70">
                Transfer picks completed today
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pack complete</MetricLabel>
              <MetricValue>{packedItems}</MetricValue>
              <p className="text-sm text-white/70">
                Usage orders processed today
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Avg pick time</MetricLabel>
              <MetricValue>--</MetricValue>
              <p className="text-sm text-white/70">
                Average pick-to-pack time
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-6">
          <SectionHeader
            count={`${usageTransactions} order${usageTransactions === 1 ? "" : "s"}`}
            description="Pick queue with FIFO/FEFO priority and packing station status."
            eyebrow="Fulfillment"
            title="Pick & Pack"
          />

          <PickPackClient
            initialMetrics={{
              openPicks: usageTransactions,
              picksToday: transfersToday,
              packComplete: packedItems,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
