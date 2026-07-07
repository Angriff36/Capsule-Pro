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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom activity-feed endpoints (/api/activity-feed/list, /api/activity-feed/stats)
// — these are not entity CRUD routes and have no generated client equivalents.
import { apiFetch } from "@/app/lib/api";

/** Unwrap manifestSuccessResponse payloads ({ success, ...fields }). */
function unwrapManifestPayload(
  body: Record<string, unknown>,
  key: string
): unknown {
  if (body[key] !== undefined) {
    return body[key];
  }
  const nested = body.data;
  if (nested && typeof nested === "object" && key in nested) {
    return (nested as Record<string, unknown>)[key];
  }
  return;
}

interface ActivityFeedClientProps {
  enableRealtime?: boolean;
  pollInterval?: number;
  tenantId: string;
  userId: string;
}

/**
 * Detail routes for Manifest entity types that appear in the feed
 * (reaction_logs `entity` / ActivityFeed `entityType`). Only entities with a
 * real detail page are listed — unmapped types simply don't navigate.
 */
const ENTITY_DETAIL_ROUTES: Record<string, (id: string) => string> = {
  Recipe: (id) => `/kitchen/recipes/${id}`,
  Dish: (id) => `/kitchen/recipes/dishes/${id}`,
  Menu: (id) => `/kitchen/recipes/menus/${id}`,
  Ingredient: (id) => `/kitchen/ingredients/${id}`,
  PrepList: (id) => `/kitchen/prep-lists/${id}`,
  Event: (id) => `/events/${id}`,
  EventContract: (id) => `/events/contracts/${id}`,
  EventBudget: (id) => `/events/budgets/${id}`,
  BattleBoard: (id) => `/events/battle-boards/${id}`,
  Client: (id) => `/crm/clients/${id}`,
  Venue: (id) => `/crm/venues/${id}`,
  Proposal: (id) => `/crm/proposals/${id}`,
  Lead: (id) => `/marketing/leads/${id}`,
  Invoice: (id) => `/accounting/invoices/${id}`,
  Payment: (id) => `/accounting/payments/${id}`,
  InventoryItem: (id) => `/inventory/items/${id}`,
  Supplier: (id) => `/inventory/suppliers/${id}`,
  Vendor: (id) => `/procurement/vendors/${id}`,
  PurchaseOrder: (id) => `/procurement/purchase-orders/${id}`,
  Requisition: (id) => `/procurement/requisitions/${id}`,
};

function getEntityDetailHref(
  entityType: string,
  entityId: string
): string | null {
  const build = ENTITY_DETAIL_ROUTES[entityType];
  return build ? build(entityId) : null;
}

export function ActivityFeedClient({
  tenantId: _tenantId,
  userId: _userId,
  pollInterval = 30_000,
  enableRealtime = false,
}: ActivityFeedClientProps) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [stats, setStats] = useState<ActivityStatsProps | null>(null);
  const [statsError, setStatsError] = useState(false);
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

        const response = await apiFetch(`/api/activity-feed/list?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch activities");
        }

        const body = (await response.json()) as Record<string, unknown>;
        const activitiesPayload =
          (unwrapManifestPayload(body, "activities") as
            | ActivityFeedItem[]
            | undefined) ?? [];
        const hasMorePayload =
          (unwrapManifestPayload(body, "hasMore") as boolean | undefined) ??
          false;

        if (currentOffset === 0) {
          setActivities(activitiesPayload);
        } else {
          setActivities((prev) => [...prev, ...activitiesPayload]);
        }

        setHasMore(hasMorePayload);
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
    setStatsError(false);
    try {
      const response = await apiFetch("/api/activity-feed/stats");
      if (!response.ok) {
        throw new Error(`Stats request failed (${response.status})`);
      }
      const body = (await response.json()) as Record<string, unknown>;
      const raw =
        (unwrapManifestPayload(body, "stats") as
          | (Partial<ActivityStatsProps> & { totalActivities?: number })
          | undefined) ??
        (body.stats as
          | (Partial<ActivityStatsProps> & { totalActivities?: number })
          | undefined);
      if (raw) {
        // API returns `totalActivities` (locked by route tests); the shared
        // ActivityStats component expects `totalCount`. Map at this seam so a
        // field-name mismatch can't crash the render with `undefined.toLocaleString()`.
        setStats({
          totalCount: raw.totalActivities ?? 0,
          todayCount: raw.todayCount ?? 0,
          weekCount: raw.weekCount ?? 0,
          byType: raw.byType ?? {},
          byEntity: raw.byEntity ?? {},
        });
      }
    } catch {
      // Surface the failure — a missing stats strip should not look intentional.
      setStatsError(true);
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

  const navigateToEntity = (entityType: string, entityId: string) => {
    const href = getEntityDetailHref(entityType, entityId);
    if (href) {
      router.push(href);
    } else {
      toast.info(`No detail page available for ${entityType} yet.`);
    }
  };

  const handleActivityClick = (activity: ActivityFeedItem) => {
    if (activity.entityType && activity.entityId) {
      navigateToEntity(activity.entityType, activity.entityId);
    }
  };

  const handleEntityClick = (entityType: string, entityId: string) => {
    navigateToEntity(entityType, entityId);
  };

  // Initial fetch
  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [fetchActivities, fetchStats]);

  // Polling for real-time updates
  useEffect(() => {
    if (!enableRealtime) {
      return;
    }

    const interval = setInterval(() => {
      fetchActivities(0, filters);
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enableRealtime, pollInterval, fetchActivities, filters]);

  return (
    <div className="space-y-4">
      {stats ? <ActivityStats {...stats} variant="panel" /> : null}
      {statsError && !stats ? (
        <p className="text-muted-foreground text-xs">
          Couldn't load activity stats.{" "}
          <button
            className="underline underline-offset-2"
            onClick={fetchStats}
            type="button"
          >
            Retry
          </button>
        </p>
      ) : null}

      <ActivityFeed
        activities={activities}
        hasMore={hasMore}
        isLoading={isLoading}
        onActivityClick={handleActivityClick}
        onEntityClick={handleEntityClick}
        onFilterChange={handleFilterChange}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        showHeader={false}
        variant="panel"
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
        const response = await apiFetch(
          `/api/activity-feed/list?limit=${limit}`
        );
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
          <div className="text-center text-muted-foreground text-sm">
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
          <div className="text-center text-muted-foreground text-sm">
            No recent activity
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent Activity</h3>
          <Button asChild className="h-7 text-xs" size="sm" variant="ghost">
            <Link href="/analytics/activity-feed">View All</Link>
          </Button>
        </div>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div className="flex gap-2 text-xs" key={activity.id}>
              <div
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border ${
                  activity.activityType === "ai_approval"
                    ? "border-purple-500/20 bg-purple-500/10 text-purple-500"
                    : activity.activityType === "entity_change"
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                      : "border-green-500/20 bg-green-500/10 text-green-500"
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
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{activity.title}</p>
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
