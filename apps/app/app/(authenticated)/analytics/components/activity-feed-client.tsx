/**
 * Activity Feed Client Component
 *
 * Client-side component for fetching and displaying the activity feed
 * with real-time updates and filtering capabilities.
 */

"use client";

import {
  ActivityFeed,
  type ActivityFeedItem,
  type ActivityFeedResponse,
  type ActivityFilters,
  ActivityStats,
  type ActivityStatsProps,
} from "@repo/design-system/components/blocks/activity-feed";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface ActivityFeedClientProps {
  tenantId: string;
  userId: string;
  pollInterval?: number;
  enableRealtime?: boolean;
}

export function ActivityFeedClient({
  tenantId,
  userId,
  pollInterval = 30_000,
  enableRealtime = false,
}: ActivityFeedClientProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [stats, setStats] = useState<ActivityStatsProps | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const limit = 50;

  const fetchActivities = useCallback(
    async (currentOffset = 0, currentFilters: ActivityFilters = {}) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
          ...Object.fromEntries(
            Object.entries(currentFilters).filter(([, v]) => v !== undefined)
          ),
        });

        const response = await fetch(`/api/activity-feed/list?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const data: ActivityFeedResponse = await response.json();

        if (currentOffset === 0) {
          setActivities(data.activities);
        } else {
          setActivities((prev) => [...prev, ...data.activities]);
        }

        setHasMore(data.hasMore);
        setOffset(currentOffset);
      } catch (error) {
        console.error("Error fetching activities:", error);
        toast.error("Failed to load activities");
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/activity-feed/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  const handleLoadMore = () => {
    fetchActivities(offset + limit, filters);
  };

  const handleRefresh = () => {
    fetchActivities(0, filters);
    fetchStats();
  };

  const handleFilterChange = (newFilters: ActivityFilters) => {
    setFilters(newFilters);
    fetchActivities(0, newFilters);
  };

  const handleActivityClick = (activity: ActivityFeedItem) => {
    console.log("Activity clicked:", activity);
    // Navigate to entity details if applicable
    if (activity.entityType && activity.entityId) {
      // Could navigate to entity detail page
      toast.info(`Viewing ${activity.entityType}: ${activity.title}`);
    }
  };

  const handleUserClick = (userId: string) => {
    console.log("User clicked:", userId);
    // Could navigate to user profile
    toast.info("Viewing user profile");
  };

  const handleEntityClick = (entityType: string, entityId: string) => {
    console.log("Entity clicked:", entityType, entityId);
    toast.info(`Viewing ${entityType}`);
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [fetchActivities, fetchStats]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    const interval = setInterval(() => {
      fetchActivities(0, filters);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enableRealtime, pollInterval, fetchActivities, filters]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && <ActivityStats {...stats} />}

      {/* Activity Feed */}
      <ActivityFeed
        activities={activities}
        hasMore={hasMore}
        isLoading={isLoading}
        onActivityClick={handleActivityClick}
        onEntityClick={handleEntityClick}
        onFilterChange={handleFilterChange}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onUserClick={handleUserClick}
      />
    </div>
  );
}

/**
 * Compact Activity Timeline Widget
 * Displays a brief timeline of recent activities
 */
export function ActivityTimelineWidget({
  tenantId,
  limit = 5,
}: {
  tenantId: string;
  limit?: number;
}) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/activity-feed/list?limit=${limit}`);
        if (response.ok) {
          const data: ActivityFeedResponse = await response.json();
          setActivities(data.activities);
        }
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivities();
  }, [tenantId, limit]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-muted-foreground text-sm text-center">
            Loading activities...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-muted-foreground text-sm text-center">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
          <Button className="h-7 text-xs" size="sm" variant="ghost">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div className="flex gap-2 text-xs" key={activity.id}>
              <div
                className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border ${
                  activity.activityType === "ai_approval"
                    ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                    : activity.activityType === "entity_change"
                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      : "bg-green-500/10 text-green-500 border-green-500/20"
                }`}
              >
                <span className="text-xs">
                  {activity.activityType === "ai_approval"
                    ? "AI"
                    : activity.activityType === "entity_change"
                      ? "E"
                      : "C"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-1">{activity.title}</p>
                <p className="text-muted-foreground">
                  {new Date(activity.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
