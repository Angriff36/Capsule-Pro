import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Megaphone, Plus, Mail, MessageSquare, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../lib/tenant";
import { Header } from "../components/header";

const MarketingPage = async () => {
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
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const channels = await database.channel.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const automationRules = await database.automationRule.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const activeCampaigns = campaigns.filter((c) => c.status === "active");
  const draftCampaigns = campaigns.filter((c) => c.status === "draft");

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
      <Header page="Marketing" pages={[]}>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/marketing/channels">Channels</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/marketing/automation">Automation</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/marketing/analytics">Analytics</Link>
          </Button>
          <Button asChild>
            <Link href="/marketing/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Link>
          </Button>
        </div>
      </Header>

      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">
            Manage multi-channel campaigns, automation rules, and track performance
          </p>
        </div>

        <Separator />

        {/* Overview Stats */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Megaphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaigns.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeCampaigns.length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{channels.filter((c) => c.isActive).length}</div>
              <p className="text-xs text-muted-foreground">
                {channels.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Rules</CardTitle>
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {automationRules.filter((r) => r.isActive).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {automationRules.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Campaigns</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{draftCampaigns.length}</div>
              <p className="text-xs text-muted-foreground">
                Ready to launch
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Campaigns Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Campaigns</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/marketing/campaigns">View all</Link>
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Empty>
              <EmptyMedia>
                <Megaphone className="h-16 w-16 text-muted-foreground/50" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No campaigns yet</EmptyTitle>
                <EmptyDescription>
                  Create your first marketing campaign to get started
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href="/marketing/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.slice(0, 6).map((campaign) => (
                <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {campaign.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {campaign.campaignChannels.slice(0, 3).map((cc) => {
                          const Icon = getChannelIcon(cc.channel.channelType);
                          return (
                            <div
                              key={cc.channelId}
                              className="flex items-center gap-1"
                              title={cc.channel.name}
                            >
                              <Icon className="h-3 w-3" />
                            </div>
                          );
                        })}
                        {campaign.campaignChannels.length > 3 && (
                          <span className="text-xs">
                            +{campaign.campaignChannels.length - 3}
                          </span>
                        )}
                      </div>
                      {campaign.budget && campaign.budget > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">${campaign.budget.toString()}</span>{" "}
                          budget
                        </div>
                      )}
                      <Button asChild className="w-full" size="sm" variant="outline">
                        <Link href={`/marketing/campaigns/${campaign.id}`}>
                          View Campaign
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Channels Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Channels</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/marketing/channels">Manage</Link>
            </Button>
          </div>

          {channels.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">No channels configured yet</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/marketing/channels/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Channel
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {channels.slice(0, 4).map((channel) => {
                const Icon = getChannelIcon(channel.channelType);
                return (
                  <Card key={channel.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant={channel.isActive ? "default" : "secondary"}>
                          {channel.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <p className="text-sm text-muted-foreground capitalize">
                          {channel.channelType}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default MarketingPage;
