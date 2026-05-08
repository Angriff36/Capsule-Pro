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
import { MessageSquare } from "lucide-react";
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
    database.sms_automation_rules.findMany({
      where: { tenant_id: tenantId, deleted_at: null },
      orderBy: [{ priority: "asc" }, { created_at: "desc" }],
    }),
    database.sms_automation_rules.count({
      where: { tenant_id: tenantId, deleted_at: null, is_active: true },
    }),
  ]);

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
              Configure which operational events trigger SMS notifications to employees and role-based recipients.
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
        <SectionHeader eyebrow="Automation" title="SMS automation rules" count={`${rules.length}`} />
        <SmsRulesClient rules={serializedRules} />
      </OperationalColumn>
    </PageCanvas>
  );
}
