import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Separator } from "@repo/design-system/components/ui/separator";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import { Megaphone, Plus, Mail, MessageSquare, Share2, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { CampaignsClient } from "./campaigns-client";

const CampaignsPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "paused":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "email":
        return Mail;
      case "sms":
        return MessageSquare;
      default:
        return Share2;
    }
  };

  return (
    <>
      <Header page="Campaigns" pages={[{ href: "/marketing", label: "Marketing" }]}>
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
