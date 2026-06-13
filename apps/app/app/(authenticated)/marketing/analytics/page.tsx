import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  CommandBand,
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
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { AnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
  title: "Marketing Analytics",
  description: "Review email, SMS, and lead pipeline performance.",
};

export default async function MarketingAnalyticsPage() {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [emailLogStats, leadStats, workflowCount, smsRuleCount] =
    await Promise.all([
      database.emailLog.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { status: true },
      }),
      database.lead.groupBy({
        by: ["status"],
        where: { tenantId, deletedAt: null },
        _count: { status: true },
      }),
      database.emailWorkflow.count({
        where: { tenantId, deletedAt: null, isActive: true },
      }),
      database.sms_automation_rules.count({
        where: { tenant_id: tenantId, deleted_at: null, is_active: true },
      }),
    ]);

  const emailCounts: Record<string, number> = {};
  for (const row of emailLogStats) {
    emailCounts[row.status] = row._count.status;
  }
  const totalSent = Object.values(emailCounts).reduce((a, b) => a + b, 0) || 0;
  const opened = emailCounts.opened || 0;
  const openRate = totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0;

  const leadCounts: Record<string, number> = {};
  for (const row of leadStats) {
    leadCounts[row.status] = row._count.status;
  }
  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
  const convertedLeads = leadCounts.converted || 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const initialMetrics = {
    totalSent,
    openRate,
    totalLeads,
    conversionRate,
    activeWorkflows: workflowCount,
    activeSmsRules: smsRuleCount,
  };

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Marketing</MonoLabel>
            <DisplayHeading>Marketing Analytics</DisplayHeading>
            <CommandBandLede>
              Review email delivery, SMS performance, and lead pipeline metrics.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Emails sent</MetricLabel>
              <MetricValue>{totalSent || "\u2014"}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Open rate</MetricLabel>
              <MetricValue>
                {totalSent > 0 ? `${openRate}%` : "\u2014"}
              </MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Leads</MetricLabel>
              <MetricValue>{totalLeads}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Conversion</MetricLabel>
              <MetricValue>
                {totalLeads > 0 ? `${conversionRate}%` : "\u2014"}
              </MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active workflows</MetricLabel>
              <MetricValue>{workflowCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>SMS rules</MetricLabel>
              <MetricValue>{smsRuleCount}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader eyebrow="Performance" title="Marketing performance" />
        <AnalyticsClient initialMetrics={initialMetrics} />
      </OperationalColumn>
    </PageCanvas>
  );
}
