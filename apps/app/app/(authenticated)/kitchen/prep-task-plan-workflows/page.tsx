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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { WorkflowsClient } from "./workflows-client";

export default async function PrepTaskPlanWorkflowsPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const baseWhere = { tenantId, deletedAt: null };

  const [
    total,
    created,
    generating,
    reviewing,
    approving,
    approved,
    completed,
    failed,
    cancelled,
    avgGenerated,
  ] = await Promise.all([
    database.prepTaskPlanWorkflow.count({ where: baseWhere }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "created" },
    }),
    database.prepTaskPlanWorkflow.count({
      where: {
        ...baseWhere,
        status: { in: ["generating", "generation_completed"] },
      },
    }),
    database.prepTaskPlanWorkflow.count({
      where: {
        ...baseWhere,
        status: { in: ["reviewing", "review_completed"] },
      },
    }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "approving" },
    }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "approved" },
    }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "completed" },
    }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "failed" },
    }),
    database.prepTaskPlanWorkflow.count({
      where: { ...baseWhere, status: "cancelled" },
    }),
    database.prepTaskPlanWorkflow.aggregate({
      where: baseWhere,
      _avg: { generatedCount: true },
    }),
  ]);

  const activeCount = created + generating + reviewing + approving;
  const avgTasks = Math.round(avgGenerated._avg.generatedCount ?? 0);

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Kitchen / Prep Task Plans</MonoLabel>
            <DisplayHeading>Workflow Instances</DisplayHeading>
            <CommandBandLede>
              Track prep task plan workflows from generation through approval to
              instantiation. Monitor lifecycle state, review generated tasks,
              and manage the approval pipeline.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              asChild
              className="bg-white text-deep-green hover:bg-white/90"
              size="sm"
            >
              <Link href="/kitchen">
                <ArrowLeft className="mr-2 size-4" />
                Back to Kitchen
              </Link>
            </Button>
          </CommandBandActions>
        </CommandBandHeader>

        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Total Workflows</MetricLabel>
              <MetricValue>{total}</MetricValue>
              <p className="text-sm text-white/70">
                {activeCount} active, {approved} approved
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>In Progress</MetricLabel>
              <MetricValue>{generating + reviewing + approving}</MetricValue>
              <p className="text-sm text-white/70">
                {generating} generating, {reviewing} reviewing
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Avg Tasks Generated</MetricLabel>
              <MetricValue>{avgTasks}</MetricValue>
              <p className="text-sm text-white/70">
                {completed} workflows completed
              </p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Terminal States</MetricLabel>
              <MetricValue>{failed + cancelled}</MetricValue>
              <p className="text-sm text-white/70">
                {failed} failed, {cancelled} cancelled
              </p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <section className="space-y-4">
          <SectionHeader
            count={`${total} workflow${total !== 1 ? "s" : ""}`}
            description="Manage prep task plan workflows with full lifecycle tracking."
            eyebrow="Prep Task Plans"
            title="All Workflows"
          />
          <WorkflowsClient
            initialMetrics={{
              total,
              created,
              generating,
              reviewing,
              approving,
              approved,
              completed,
              failed,
              cancelled,
              avgTasks,
            }}
          />
        </section>
      </OperationalColumn>
    </PageCanvas>
  );
}
