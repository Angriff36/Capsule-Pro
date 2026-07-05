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
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { PutawayClient } from "./putaway-client";

export default async function PutawayPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  // Fetch metrics server-side for the initial render
  const [pendingTransactions, completedToday, activeLocations] =
    await Promise.all([
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: "purchase",
        },
      }),
      database.inventoryTransaction.count({
        where: {
          tenantId,
          transactionType: "purchase",
          transactionDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          },
        },
      }),
      database.storageLocation.count({
        where: {
          tenantId: tenantId,
          isActive: true,
          deletedAt: null,
        },
      }),
    ]);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Warehouse</MonoLabel>
            <DisplayHeading>Putaway</DisplayHeading>
            <CommandBandLede>
              Direct received goods to optimal storage locations. Prioritize
              placement by zone, temperature requirements, and product velocity.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            {/* Future: Add new putaway task button */}
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Pending tasks</MetricLabel>
              <MetricValue>{pendingTransactions}</MetricValue>
              <p className="text-sm text-white/70">
                Items awaiting putaway assignment
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Completed today</MetricLabel>
              <MetricValue>{completedToday}</MetricValue>
              <p className="text-sm text-white/70">
                Putaway tasks finished today
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Avg time</MetricLabel>
              <MetricValue>--</MetricValue>
              <p className="text-sm text-white/70">Average putaway duration</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Locations used</MetricLabel>
              <MetricValue>{activeLocations}</MetricValue>
              <p className="text-sm text-white/70">Active storage locations</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${pendingTransactions} task${pendingTransactions === 1 ? "" : "s"}`}
            description="Received items queued for putaway with suggested destination locations."
            eyebrow="Putaway"
            title="Putaway tasks"
          />

          <PutawayClient
            initialMetrics={{
              pendingTasks: pendingTransactions,
              completedToday,
              locationsUsed: activeLocations,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
