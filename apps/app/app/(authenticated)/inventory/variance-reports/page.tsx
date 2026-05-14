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
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { VarianceReportsClient } from "./variance-reports-client";

export default async function VarianceReportsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const [total, pending, reviewed, approved] = await Promise.all([
    database.varianceReport.count({
      where: { tenantId, deletedAt: null },
    }),
    database.varianceReport.count({
      where: { tenantId, deletedAt: null, status: "pending" },
    }),
    database.varianceReport.count({
      where: { tenantId, deletedAt: null, status: "reviewed" },
    }),
    database.varianceReport.count({
      where: { tenantId, deletedAt: null, status: "approved" },
    }),
  ]);

  const avgAccuracy = await database.varianceReport.aggregate({
    where: { tenantId, deletedAt: null },
    _avg: { accuracyScore: true },
  });

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Inventory / Variance Reports</MonoLabel>
            <DisplayHeading>Variance Reports</DisplayHeading>
            <CommandBandLede>
              Review and approve inventory variance reports generated from cycle
              counts. Track discrepancies between expected and counted
              quantities.
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
              <MetricLabel>Total Reports</MetricLabel>
              <MetricValue>{total}</MetricValue>
              <p className="text-sm text-white/70">
                {pending} pending, {reviewed} reviewed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Pending Review</MetricLabel>
              <MetricValue>{pending}</MetricValue>
              <p className="text-sm text-white/70">Awaiting review</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Approved</MetricLabel>
              <MetricValue>{approved}</MetricValue>
              <p className="text-sm text-white/70">
                {total > 0 ? `${((approved / total) * 100).toFixed(1)}%` : "0%"}{" "}
                approval rate
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Avg Accuracy</MetricLabel>
              <MetricValue>
                {Number(avgAccuracy._avg.accuracyScore ?? 0).toFixed(1)}%
              </MetricValue>
              <p className="text-sm text-white/70">Across all reports</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} report${total !== 1 ? "s" : ""}`}
            description="Review variance reports from cycle counts. Approve adjustments for inventory discrepancies."
            eyebrow="Variance"
            title="All Reports"
          />
          <VarianceReportsClient
            initialMetrics={{ total, pending, reviewed, approved }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
