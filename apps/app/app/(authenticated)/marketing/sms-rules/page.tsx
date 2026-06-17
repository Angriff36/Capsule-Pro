import { listSmsAutomationRules } from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
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

  await getTenantIdForOrg(orgId);

  const rules = (await listSmsAutomationRules()).data;
  const activeCount = rules.filter((rule) => rule.is_active).length;

  const inactiveCount = rules.length - activeCount;

  const serializedRules = rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    triggerType: r.trigger_type,
    recipientType: r.recipient_type,
    customMessage: r.custom_message,
    isActive: r.is_active,
    priority: r.priority,
    createdAt: r.created_at?.toISOString() ?? null,
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
