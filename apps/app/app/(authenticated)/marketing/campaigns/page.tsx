// @ts-nocheck
// Orphaned code - Campaign model does not exist in Prisma schema
// TODO: Either implement marketing models or remove this feature
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Megaphone, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { CampaignsClient } from "./campaigns-client";

function hasCampaignModel() {
  return Boolean(database.campaign?.findMany);
}

const CampaignsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!hasCampaignModel()) {
    return (
      <>
        <Header
          page="Campaigns"
          pages={[{ href: "/marketing", label: "Marketing" }]}
        />

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <div className="space-y-0.5">
            <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground">
              Manage your multi-channel marketing campaigns
            </p>
          </div>

          <Separator />

          <Empty>
            <EmptyMedia>
              <Megaphone className="h-16 w-16 text-muted-foreground/50" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>Campaigns are not available yet</EmptyTitle>
              <EmptyDescription>
                This workspace does not have the campaign data model enabled, so
                this page cannot load campaign records yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </>
    );
  }

  const campaigns = await database.campaign.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    include: {
      campaignChannels: {
        include: {
          channel: true,
        },
      },
      campaignContactLists: {
        include: {
          contactList: true,
        },
      },
      campaignMetrics: {
        orderBy: { recordedAt: "desc" },
        take: 10,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Header
        page="Campaigns"
        pages={[{ href: "/marketing", label: "Marketing" }]}
      >
        <Button asChild>
          <Link href="/marketing/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </Header>

      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your multi-channel marketing campaigns
          </p>
        </div>

        <Separator />

        <CampaignsClient campaigns={campaigns} />
      </div>
    </>
  );
};

export default CampaignsPage;
