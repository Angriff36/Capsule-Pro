import { listPricingTiers } from "@/app/lib/manifest-client.generated";
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
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { PricingTiersClient } from "./pricing-tiers-client";

export default async function PricingTiersPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const pricingTiers = (await listPricingTiers()).data.filter(
    (tier) => tier.tenantId === tenantId && !tier.deletedAt
  );
  const total = pricingTiers.length;
  const activeTiers = pricingTiers.filter((tier) => tier.isActive !== false);
  const active = activeTiers.length;
  const inactive = total - active;
  const avgUnitCost =
    activeTiers.length > 0
      ? activeTiers.reduce((sum, tier) => sum + Number(tier.unitCost ?? 0), 0) /
        activeTiers.length
      : 0;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Inventory / Pricing Tiers</MonoLabel>
            <DisplayHeading>Pricing Tiers</DisplayHeading>
            <CommandBandLede>
              Manage volume-based pricing tiers for catalog entries. Configure
              quantity breaks, unit costs, discounts, and effective date ranges.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <a href="/inventory">Back to Inventory</a>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Tiers</MetricLabel>
              <MetricValue>{total}</MetricValue>
              <p className="text-sm text-white/70">
                {active} active, {inactive} inactive
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active</MetricLabel>
              <MetricValue>{active}</MetricValue>
              <p className="text-sm text-white/70">
                {total > 0 ? `${((active / total) * 100).toFixed(1)}%` : "0%"}{" "}
                of all tiers
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Avg Unit Cost</MetricLabel>
              <MetricValue>
                $
                {avgUnitCost.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </MetricValue>
              <p className="text-sm text-white/70">Across active tiers</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Inactive</MetricLabel>
              <MetricValue>{inactive}</MetricValue>
              <p className="text-sm text-white/70">Temporarily disabled</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} tier${total === 1 ? "" : "s"}`}
            description="Create and manage volume pricing tiers with quantity breaks and effective dates."
            eyebrow="Pricing"
            title="All Tiers"
          />
          <PricingTiersClient
            initialMetrics={{
              total,
              active,
              inactive,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
