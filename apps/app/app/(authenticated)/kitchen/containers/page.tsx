import { listContainers } from "@/app/lib/manifest-client.generated";
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
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ContainersClient } from "./containers-client";

export default async function ContainersPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const containers = (await listContainers()).data.filter(
    (container) => container.tenantId === tenantId && !container.deletedAt
  );
  const total = containers.length;
  const active = containers.filter((container) => container.isActive !== false).length;
  const inactive = total - active;
  const reusable = containers.filter((container) => container.isReusable === true).length;
  const disposable = total - reusable;
  const byTypeMap = new Map<string, number>();
  for (const container of containers) {
    const containerType = container.containerType || "unknown";
    byTypeMap.set(containerType, (byTypeMap.get(containerType) ?? 0) + 1);
  }
  const byType = Array.from(byTypeMap.entries()).map(([containerType, count]) => ({
    containerType,
    count,
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Kitchen / Containers</MonoLabel>
            <DisplayHeading>Containers</DisplayHeading>
            <CommandBandLede>
              Manage kitchen containers — pans, trays, bowls, and more. Track
              capacity, reusability, and status across your operation.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/kitchen">Back to Kitchen</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>{total}</MetricValue>
              <p className="text-sm text-white/70">
                {active} active, {inactive} inactive
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Reusable</MetricLabel>
              <MetricValue>{reusable}</MetricValue>
              <p className="text-sm text-white/70">
                {total > 0 ? `${((reusable / total) * 100).toFixed(0)}%` : "0%"}{" "}
                reusable
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Disposable</MetricLabel>
              <MetricValue>{disposable}</MetricValue>
              <p className="text-sm text-white/70">Single-use containers</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Types</MetricLabel>
              <MetricValue>{byType.length}</MetricValue>
              <p className="text-sm text-white/70">
                {byType
                  .map((t) => `${t.containerType} (${t.count})`)
                  .join(", ")}
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} container${total === 1 ? "" : "s"}`}
            description="Create and manage kitchen containers with type, capacity, and reusability tracking."
            eyebrow="Containers"
            title="All Containers"
          />
          <ContainersClient
            initialMetrics={{
              total,
              active,
              inactive,
              reusable,
              disposable,
              byType: byType.map((t) => ({
                containerType: t.containerType,
                count: t.count,
              })),
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
