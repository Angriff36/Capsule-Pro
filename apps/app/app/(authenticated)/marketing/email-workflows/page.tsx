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
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { EmailWorkflowsClient } from "./email-workflows-client";

export const metadata: Metadata = {
  title: "Email Workflows — Marketing",
  description: "Activate and monitor automated email workflows.",
};

export default async function EmailWorkflowsPage() {
  const { orgId, userId } = await auth();
  if (!(userId && orgId)) {
    redirect("/sign-in");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const [workflows, activeCount] = await Promise.all([
    database.emailWorkflow.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        emailTemplate: {
          select: { id: true, name: true, deleted_at: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    database.emailWorkflow.count({
      where: { tenantId, deletedAt: null, isActive: true },
    }),
  ]);

  const inactiveCount = workflows.length - activeCount;

  const serializedWorkflows = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    triggerType: w.triggerType,
    isActive: w.isActive,
    lastTriggeredAt: w.lastTriggeredAt?.toISOString() ?? null,
    emailTemplate: w.emailTemplate
      ? {
          id: w.emailTemplate.id,
          name: w.emailTemplate.name,
          deleted_at: w.emailTemplate.deleted_at?.toISOString() ?? null,
        }
      : null,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Marketing</MonoLabel>
            <DisplayHeading>Email Workflows</DisplayHeading>
            <CommandBandLede>
              Activate and monitor automated email workflows triggered by
              events, tasks, and contracts.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button asChild size="sm">
              <a href="/settings/email-templates">Manage templates</a>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>{workflows.length}</MetricValue>
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
          count={`${workflows.length}`}
          eyebrow="Workflows"
          title="All email workflows"
        />
        <EmailWorkflowsClient workflows={serializedWorkflows} />
      </OperationalColumn>
    </PageCanvas>
  );
}
