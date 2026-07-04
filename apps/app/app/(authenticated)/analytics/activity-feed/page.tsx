/**
 * Activity Feed Page
 *
 * Unified activity feed showing all system events, entity changes,
 * AI plan approvals, and collaborator actions.
 */

import { auth } from "@repo/auth/server";
import {
  OperationalColumn,
  PageBody,
  PageCanvas,
  PageLead,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ActivityFeedClient } from "../components/activity-feed-client";

export const metadata = {
  title: "Activity Feed",
  description: "Track all system events and changes in your organization",
};

export default async function ActivityFeedPage() {
  const { orgId, userId } = await auth();

  if (!(userId && orgId)) {
    redirect("/login");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    redirect("/onboarding");
  }

  return (
    <PageCanvas>
      <PageLead
        description="Monitor system events, entity changes, AI plan approvals, and collaborator actions across your organization."
        eyebrow="Analytics / Activity"
        title="Activity feed"
      />

      <PageBody>
        <OperationalColumn>
          <section className="space-y-6">
            <SectionHeader title="Recent activity" />
            <ActivityFeedClient
              enableRealtime={false}
              tenantId={tenantId}
              userId={userId}
            />
          </section>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
