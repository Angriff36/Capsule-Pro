// @ts-nocheck
// Orphaned code - Campaign model does not exist in Prisma schema
// TODO: Either implement marketing models or remove this feature
"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Megaphone, Mail, MessageSquare, Share2, Search } from "lucide-react";
import Link from "next/link";
import type { Campaign } from "@repo/database";

interface CampaignsClientProps {
  campaigns: Array<Campaign & {
    campaignChannels: Array<{
      channel: {
        id: string;
        name: string;
        channelType: string;
        isActive: boolean;
      };
    }>;
    campaignContactLists: Array<{
      contactList: {
        id: string;
        name: string;
      };
    }>;
    campaignMetrics: Array<{
      id: string;
      metricType: string;
      metricValue: number;
      recordedAt: Date;
    }>;
  }>;
}

export function CampaignsClient({ campaigns }: CampaignsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      searchQuery === "" ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (campaign.description?.toLowerCase() ?? "").includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;

    return matchesSearch && matchesStatus;
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

  const calculateTotalMetrics = (campaign: CampaignsClientProps["campaigns"][0]) => {
    const metrics = campaign.campaignMetrics.reduce(
      (acc, metric) => {
        if (metric.metricType === "impressions") {
          acc.impressions += metric.metricValue;
        } else if (metric.metricType === "clicks") {
          acc.clicks += metric.metricValue;
        } else if (metric.metricType === "conversions") {
          acc.conversions += metric.metricValue;
        }
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0 }
    );
    return metrics;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("draft")}
          >
            Draft
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("completed")}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Megaphone className="h-16 w-16 text-muted-foreground/50" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>
              {campaigns.length === 0 ? "No campaigns yet" : "No matching campaigns"}
            </EmptyTitle>
            <EmptyDescription>
              {campaigns.length === 0
                ? "Create your first marketing campaign to get started"
                : "Try adjusting your search or filter criteria"}
            </EmptyDescription>
          </EmptyHeader>
          {campaigns.length === 0 && (
            <EmptyContent>
              <Button asChild>
                <Link href="/marketing/campaigns/new">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Create Campaign
                </Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const metrics = calculateTotalMetrics(campaign);
            return (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {campaign.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Channels */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {campaign.campaignChannels.slice(0, 4).map((cc) => {
                      const Icon = getChannelIcon(cc.channel.channelType);
                      return (
                        <div
                          key={cc.channelId}
                          className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted"
                          title={cc.channel.name}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                      );
                    })}
                    {campaign.campaignChannels.length > 4 && (
                      <span className="text-xs">+{campaign.campaignChannels.length - 4}</span>
                    )}
                  </div>

                  {/* Metrics */}
                  {(metrics.impressions > 0 || metrics.clicks > 0 || metrics.conversions > 0) && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-semibold">
                          {metrics.impressions.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Impressions</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {metrics.clicks.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Clicks</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {metrics.conversions.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversions</div>
                      </div>
                    </div>
                  )}

                  {/* Budget */}
                  {campaign.budget && campaign.budget > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">${campaign.budget.toString()}</span> budget
                    </div>
                  )}

                  {/* Tags */}
                  {campaign.tags && campaign.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {campaign.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {campaign.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{campaign.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link href={`/marketing/campaigns/${campaign.id}`}>View Campaign</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
