import { listVarianceReports } from "@/app/lib/manifest-client.generated";
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
import { VarianceReportsClient } from "./variance-reports-client";

export default async function VarianceReportsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    redirect("/");
  }

  const varianceReports = (await listVarianceReports()).data.filter(
    (report) => report.tenantId === tenantId && !report.deletedAt
  );
  const total = varianceReports.length;
  const pending = varianceReports.filter((report) => report.status === "pending").length;
  const reviewed = varianceReports.filter((report) => report.status === "reviewed").length;
  const approved = varianceReports.filter((report) => report.status === "approved").length;
  const avgAccuracy =
    varianceReports.length > 0
      ? varianceReports.reduce(
          (sum, report) => sum + Number(report.accuracyScore ?? 0),
          0
        ) / varianceReports.length
      : 0;

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
                {avgAccuracy.toFixed(1)}%
              </MetricValue>
              <p className="text-sm text-white/70">Across all reports</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} report${total === 1 ? "" : "s"}`}
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
