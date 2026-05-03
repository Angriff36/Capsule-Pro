/**
 * @module SettingsTeamPage
 * @intent Server component that fetches team members and renders the interactive client component
 * @responsibility Data fetching for the team management page, delegating UI to TeamClient
 * @domain Settings
 * @tags team, settings, server-component
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { TeamClient, type TeamMemberRow } from "./team-client";

const SettingsTeamPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const dbMembers = await database.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const members: TeamMemberRow[] = dbMembers.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-0.5">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage who has access to this workspace and their roles.
        </p>
      </div>

      <Separator />

      <TeamClient members={members} />
    </div>
  );
};

export default SettingsTeamPage;
