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
} from "@repo/design-system/components/blocks/page-shell";
import { notFound } from "next/navigation";
import { requireAdminUser } from "@/app/lib/auth-guards";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { TeamClient, type TeamMemberRow } from "./team-client";

const SettingsTeamPage = async () => {
  const _adminUser = await requireAdminUser();
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

  const activeCount = members.filter((m) => m.isActive).length;
  const roleCounts = members.reduce(
    (acc, m) => {
      acc[m.role] = (acc[m.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const uniqueRoles = Object.keys(roleCounts).length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Settings / Team</MonoLabel>
            <DisplayHeading>Team</DisplayHeading>
            <CommandBandLede>
              Manage who has access to this workspace and their roles.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Total members</MetricLabel>
              <MetricValue>{members.length}</MetricValue>
              <p className="text-sm text-white/70">All workspace users</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Active</MetricLabel>
              <MetricValue>{activeCount}</MetricValue>
              <p className="text-sm text-white/70">Currently active</p>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Roles</MetricLabel>
              <MetricValue>{uniqueRoles}</MetricValue>
              <p className="text-sm text-white/70">Distinct role types</p>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <TeamClient members={members} />
      </OperationalColumn>
    </PageCanvas>
  );
};

export default SettingsTeamPage;
