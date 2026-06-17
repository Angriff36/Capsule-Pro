import { listCollectionCases } from "@/app/lib/manifest-client.generated";
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
import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { CollectionsClient } from "./collections-client";

export default async function CollectionsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const collectionCases = (await listCollectionCases()).data;
  const totalCases = collectionCases.length;
  const activeCases = collectionCases.filter(
    (entry) => String(entry.status) === "ACTIVE"
  ).length;
  const legalCases = collectionCases.filter(
    (entry) => String(entry.status) === "LEGAL"
  ).length;
  const disputedCases = collectionCases.filter(
    (entry) => String(entry.status) === "DISPUTED"
  ).length;
  const outstandingTotal = collectionCases
    .filter((entry) => ["ACTIVE", "LEGAL"].includes(String(entry.status)))
    .reduce((sum, entry) => sum + Number(entry.outstandingAmount ?? 0), 0);
  const collectedTotal = collectionCases.reduce(
    (sum, entry) => sum + Number(entry.collectedAmount ?? 0),
    0
  );
  const overdueCases = collectionCases.filter(
    (entry) =>
      String(entry.status) !== "RESOLVED" &&
      Number(entry.outstandingAmount ?? 0) > 0
  ).length;
  const urgentCount = collectionCases.filter(
    (entry) =>
      ["ACTIVE", "LEGAL"].includes(String(entry.status)) &&
      String(entry.priority) === "URGENT"
  ).length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Accounting</MonoLabel>
            <DisplayHeading>Collections</DisplayHeading>
            <CommandBandLede>
              Track overdue invoices, manage dunning escalations, and resolve
              outstanding receivables. Monitor high-risk cases and legal
              escalations from one place.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="border-white/25 bg-transparent text-white hover:bg-white/10"
              size="sm"
              variant="outline"
            >
              <Link href="/accounting/invoices">Open invoices</Link>
            </Button>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/accounting/payments">Review payments</Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total cases</MetricLabel>
              <MetricValue>{totalCases}</MetricValue>
              <p className="text-sm text-white/70">
                {activeCases} active, {legalCases} in legal
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Outstanding</MetricLabel>
              <MetricValue>{formatCurrency(outstandingTotal)}</MetricValue>
              <p className="text-sm text-white/70">
                Across active and legal cases
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Collected</MetricLabel>
              <MetricValue>{formatCurrency(collectedTotal)}</MetricValue>
              <p className="text-sm text-white/70">
                Recovered through collections
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>At risk</MetricLabel>
              <MetricValue>{overdueCases}</MetricValue>
              <p className="text-sm text-white/70">
                {disputedCases} disputed, {urgentCount} urgent
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${totalCases} total`}
            description="Collection cases with client, outstanding balance, dunning stage, and available actions."
            eyebrow="Collections"
            title="Active collection cases"
          />

          <CollectionsClient
            initialMetrics={{
              totalCases,
              activeCases,
              legalCases,
              outstandingTotal,
              collectedTotal,
              overdueCases,
              disputedCases,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
