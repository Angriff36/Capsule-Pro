/**
 * Activity Feed Page
 *
 * Unified activity feed showing all system events, entity changes,
 * AI plan approvals, and collaborator actions.
 */

import { auth } from "@repo/auth/server";
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-bold text-3xl tracking-tight">Activity Feed</h1>
        <p className="text-muted-foreground mt-2">
          Monitor all system events, entity changes, AI plan approvals, and
          collaborator actions across your organization.
        </p>
      </div>

      {/* Activity Feed */}
      <ActivityFeedClient
        enableRealtime={false}
        tenantId={tenantId}
        userId={userId}
      />
    </div>
  );
}
