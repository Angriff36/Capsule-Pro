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
import { SmsRulesClient } from "./sms-rules-client";

export const metadata: Metadata = {
  title: "SMS Rules — Marketing",
  description: "Configure SMS automation rules for operational notifications.",
};

export default async function SmsRulesPage() {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [rules, activeCount] = await Promise.all([
    database.smsAutomationRule.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        triggerType: true,
        recipientType: true,
        customMessage: true,
        isActive: true,
        priority: true,
        createdAt: true,
      },
    }),
    database.smsAutomationRule.count({
      where: { tenantId, deletedAt: null, isActive: true },
    }),
  ]);

  const inactiveCount = rules.length - activeCount;

  const serializedRules = rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    triggerType: r.triggerType,
    recipientType: r.recipientType ?? "employee",
    customMessage: r.customMessage,
    isActive: r.isActive ?? true,
    priority: r.priority ?? 100,
    createdAt: r.createdAt?.toISOString() ?? null,
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Marketing</MonoLabel>
            <DisplayHeading>SMS Rules</DisplayHeading>
            <CommandBandLede>
              Configure which operational events trigger SMS notifications to
              employees and role-based recipients.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>{rules.length}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active</MetricLabel>
              <MetricValue>{activeCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Inactive</MetricLabel>
              <MetricValue>{inactiveCount}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          count={`${rules.length}`}
          eyebrow="Automation"
          title="SMS automation rules"
        />
        <SmsRulesClient rules={serializedRules} />
      </OperationalColumn>
    </PageCanvas>
  );
}
