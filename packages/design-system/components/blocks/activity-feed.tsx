/**
 * Activity Feed Components
 *
 * Displays a unified timeline of system events, entity changes, AI plan approvals,
 * and collaborator actions with filtering and real-time updates.
 */

"use client";

import {
  Activity,
  Ban,
  Bot,
  Calendar,
  CheckCircle,
  CircleDot,
  Clock,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// =============================================================================
// TYPES
// =============================================================================

export interface ActivityFeedItem {
  action: string;
  activityType:
    | "entity_change"
    | "ai_approval"
    | "collaborator_action"
    | "system_event";
  correlationId: string | null;
  createdAt: string | Date;
  description: string | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  importance: "low" | "normal" | "high" | "urgent";
  metadata: Record<string, unknown> | null;
  parentId: string | null;
  performedBy: string | null;
  performerName: string | null;
  sourceId: string | null;
  sourceType: string | null;
  tenantId: string;
  title: string;
  visibility: string;
}

export interface ActivityFeedResponse {
  activities: ActivityFeedItem[];
  hasMore: boolean;
  totalCount: number;
}

export interface ActivityFeedProps {
  activities: ActivityFeedItem[];
  emptyState?: React.ReactNode;
  hasMore?: boolean;
  isLoading?: boolean;
  onActivityClick?: (activity: ActivityFeedItem) => void;
  onEntityClick?: (entityType: string, entityId: string) => void;
  onFilterChange?: (filters: ActivityFilters) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onSearchChange?: (query: string) => void;
  onUserClick?: (userId: string) => void;
}

export interface ActivityFilters {
  activityType?: string;
  endDate?: string;
  entityType?: string;
  importance?: string;
  performedBy?: string;
  startDate?: string;
}

// =============================================================================
// ACTIVITY TYPE ICONS AND STYLES
// =============================================================================

function getActivityTypeIcon(type: ActivityFeedItem["activityType"]) {
  switch (type) {
    case "entity_change":
      return <FileText className="h-4 w-4" />;
    case "ai_approval":
      return <Bot className="h-4 w-4" />;
    case "collaborator_action":
      return <Users className="h-4 w-4" />;
    case "system_event":
      return <Activity className="h-4 w-4" />;
    default:
      return <CircleDot className="h-4 w-4" />;
  }
}

function getActivityTypeColor(type: ActivityFeedItem["activityType"]): string {
  switch (type) {
    case "entity_change":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "ai_approval":
      return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "collaborator_action":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "system_event":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getImportanceColor(
  importance: ActivityFeedItem["importance"]
): string {
  switch (importance) {
    case "low":
      return "bg-gray-500/10 text-gray-500";
    case "normal":
      return "bg-blue-500/10 text-blue-500";
    case "high":
      return "bg-orange-500/10 text-orange-500";
    case "urgent":
      return "bg-red-500/10 text-red-500";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getActionIcon(action: string): React.ReactNode {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("create") || lowerAction.includes("created")) {
    return <CircleDot className="h-3 w-3 text-green-500" />;
  }
  if (lowerAction.includes("update") || lowerAction.includes("updated")) {
    return <RefreshCw className="h-3 w-3 text-blue-500" />;
  }
  if (lowerAction.includes("delete") || lowerAction.includes("deleted")) {
    return <X className="h-3 w-3 text-red-500" />;
  }
  if (lowerAction.includes("approve") || lowerAction.includes("approved")) {
    return <CheckCircle className="h-3 w-3 text-green-500" />;
  }
  if (lowerAction.includes("reject") || lowerAction.includes("rejected")) {
    return <Ban className="h-3 w-3 text-red-500" />;
  }
  return null;
}

// =============================================================================
// FORMATTERS
// =============================================================================

function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatFullTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// =============================================================================
// ACTIVITY ITEM COMPONENT
// =============================================================================

interface ActivityItemProps {
  activity: ActivityFeedItem;
  onClick?: (activity: ActivityFeedItem) => void;
  onEntityClick?: (entityType: string, entityId: string) => void;
  onUserClick?: (userId: string) => void;
  showGrouped?: boolean;
}

function ActivityItem({
  activity,
  onClick,
  onUserClick,
  onEntityClick,
  showGrouped = false,
}: ActivityItemProps) {
  const typeColor = getActivityTypeColor(activity.activityType);
  const importanceColor = getImportanceColor(activity.importance);
  const actionIcon = getActionIcon(activity.action);

  const handleClick = () => {
    onClick?.(activity);
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activity.performedBy) {
      onUserClick?.(activity.performedBy);
    }
  };

  const handleEntityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activity.entityType && activity.entityId) {
      onEntityClick?.(activity.entityType, activity.entityId);
    }
  };

  return (
    <div
      className={`group relative flex items-start gap-3 rounded-lg p-3 transition-colors ${
        onClick ? "cursor-pointer hover:bg-muted/50" : ""
      } ${showGrouped ? "ml-8" : ""}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          handleClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Icon */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${typeColor}`}
      >
        {getActivityTypeIcon(activity.activityType)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-sm">{activity.title}</p>
              {activity.importance !== "normal" && (
                <Badge
                  className={`text-xs ${importanceColor}`}
                  variant="outline"
                >
                  {activity.importance}
                </Badge>
              )}
            </div>
            {activity.description && (
              <p className="mt-0.5 line-clamp-2 text-muted-foreground text-sm">
                {activity.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <time
                  dateTime={activity.createdAt.toString()}
                  title={formatFullTimestamp(activity.createdAt)}
                >
                  {formatTimestamp(activity.createdAt)}
                </time>
              </span>
              {activity.performerName && (
                <button
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={handleUserClick}
                  type="button"
                >
                  <User className="h-3 w-3" />
                  <span>{activity.performerName}</span>
                </button>
              )}
              {activity.entityType && activity.entityId && (
                <button
                  className="flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={handleEntityClick}
                  type="button"
                >
                  <Eye className="h-3 w-3" />
                  <span>View {activity.entityType}</span>
                </button>
              )}
            </div>
          </div>

          {/* Action indicator */}
          {actionIcon && <div className="flex-shrink-0">{actionIcon}</div>}
        </div>

        {/* Metadata preview for certain types */}
        {activity.metadata && activity.activityType === "entity_change" && (
          <div className="mt-2 rounded bg-muted/30 p-2 text-muted-foreground text-xs">
            {Boolean(
              (activity.metadata as { oldValues?: unknown }).oldValues
            ) && <span>Changed properties</span>}
          </div>
        )}
      </div>

      {/* Grouped indicator */}
      {showGrouped && (
        <div className="absolute top-8 bottom-0 left-0 w-px bg-border" />
      )}
    </div>
  );
}

// =============================================================================
// ACTIVITY GROUP COMPONENT
// =============================================================================

interface ActivityGroupProps {
  activities: ActivityFeedItem[];
  groupDate: Date;
  onActivityClick?: (activity: ActivityFeedItem) => void;
  onEntityClick?: (entityType: string, entityId: string) => void;
  onUserClick?: (userId: string) => void;
}

function ActivityGroup({
  activities,
  groupDate,
  onActivityClick,
  onUserClick,
  onEntityClick,
}: ActivityGroupProps) {
  const getGroupTitle = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div>
      <div className="sticky top-0 z-10 bg-background/95 px-3 py-2 backdrop-blur">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {getGroupTitle(groupDate)}
        </span>
      </div>
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <ActivityItem
            activity={activity}
            key={activity.id}
            onClick={onActivityClick}
            onEntityClick={onEntityClick}
            onUserClick={onUserClick}
            showGrouped={index > 0}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// FILTER BAR COMPONENT
// =============================================================================

interface ActivityFilterBarProps {
  activityTypes?: Array<{ value: string; label: string }>;
  entityTypes?: string[];
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  resultCount?: number;
}

function ActivityFilterBar({
  filters,
  onFiltersChange,
  activityTypes = [
    { value: "all", label: "All Activity" },
    { value: "entity_change", label: "Entity Changes" },
    { value: "ai_approval", label: "AI Approvals" },
    { value: "collaborator_action", label: "Collaborator Actions" },
    { value: "system_event", label: "System Events" },
  ],
  resultCount,
}: ActivityFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleClearFilters = () => {
    setSearchQuery("");
    onFiltersChange({});
  };

  const hasActiveFilters =
    Object.keys(filters).length > 0 || searchQuery.length > 0;

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b p-4 sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-64 rounded-md border border-input bg-background pr-3 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            type="search"
            value={searchQuery}
          />
        </div>

        {/* Activity Type Filter */}
        <Select
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              activityType: value === "all" ? undefined : value,
            })
          }
          value={filters.activityType ?? "all"}
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            {activityTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Importance Filter */}
        <Select
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              importance: value === "all" ? undefined : value,
            })
          }
          value={filters.importance ?? "all"}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Importance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button onClick={handleClearFilters} size="sm" variant="ghost">
            <X className="mr-1 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Result Count */}
      {resultCount !== undefined && (
        <div className="text-muted-foreground text-sm">
          {resultCount.toLocaleString()} activities
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN ACTIVITY FEED COMPONENT
// =============================================================================

export function ActivityFeed({
  activities,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onRefresh,
  onFilterChange,
  onSearchChange,
  onActivityClick,
  onUserClick,
  onEntityClick,
  emptyState,
}: ActivityFeedProps) {
  const [filters, setFilters] = useState<ActivityFilters>({});

  const handleFilterChange = (newFilters: ActivityFilters) => {
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  // Group activities by date
  const groupedActivities = activities.reduce<
    Array<{ date: Date; activities: ActivityFeedItem[] }>
  >((groups, activity) => {
    const activityDate =
      typeof activity.createdAt === "string"
        ? new Date(activity.createdAt)
        : activity.createdAt;
    const dateKey = activityDate.toDateString();

    let group = groups.find((g) => g.date.toDateString() === dateKey);
    if (!group) {
      group = { date: activityDate, activities: [] };
      groups.push(group);
    }

    group.activities.push(activity);
    return groups;
  }, []);

  return (
    <Card className="w-full">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
        <div>
          <h2 className="font-semibold text-lg">Activity Feed</h2>
          <p className="text-muted-foreground text-sm">
            Track all system events and changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              disabled={isLoading}
              onClick={onRefresh}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Filter Bar */}
      <ActivityFilterBar
        filters={filters}
        onFiltersChange={handleFilterChange}
        resultCount={activities.length}
      />

      {/* Content */}
      <CardContent className="p-0">
        {activities.length === 0 ? (
          (emptyState ?? (
            <div className="flex flex-col items-center justify-center px-4 py-16">
              <div className="mb-4 rounded-full bg-muted/20 p-4">
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="mb-1 font-medium text-lg">No activities yet</h3>
              <p className="max-w-sm text-center text-muted-foreground text-sm">
                Activities will appear here as you and your team make changes to
                the system.
              </p>
            </div>
          ))
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {groupedActivities.map((group) => (
              <ActivityGroup
                activities={group.activities}
                groupDate={group.date}
                key={group.date.toDateString()}
                onActivityClick={onActivityClick}
                onEntityClick={onEntityClick}
                onUserClick={onUserClick}
              />
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="border-t p-4">
                <Button
                  className="w-full"
                  disabled={isLoading}
                  onClick={onLoadMore}
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Activities"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ACTIVITY STATS COMPONENT
// =============================================================================

export interface ActivityStatsProps {
  byEntity: Record<string, number>;
  byType: Record<string, number>;
  todayCount: number;
  totalCount: number;
  weekCount: number;
}

export function ActivityStats({
  totalCount,
  todayCount,
  weekCount,
  byType,
  byEntity,
}: ActivityStatsProps) {
  const _topEntities = Object.entries(byEntity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Total Activities */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-2xl">
                {totalCount.toLocaleString()}
              </p>
              <p className="text-muted-foreground text-xs">Total Activities</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-bold text-2xl">{todayCount}</p>
              <p className="text-muted-foreground text-xs">Today</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-bold text-2xl">{weekCount}</p>
              <p className="text-muted-foreground text-xs">This Week</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// ACTIVITY TIMELINE COMPONENT (Compact View)
// =============================================================================

export interface ActivityTimelineProps {
  activities: ActivityFeedItem[];
  limit?: number;
  onActivityClick?: (activity: ActivityFeedItem) => void;
}

export function ActivityTimeline({
  activities,
  onActivityClick,
  limit = 10,
}: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, limit);

  return (
    <div className="space-y-4">
      {displayedActivities.map((activity, index) => (
        <div className="relative" key={activity.id}>
          {/* Timeline line */}
          {index < displayedActivities.length - 1 && (
            <div className="absolute top-8 bottom-0 left-4 -ml-px w-px bg-border" />
          )}

          <div className="flex gap-3">
            {/* Icon */}
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${getActivityTypeColor(activity.activityType)}`}
            >
              {getActivityTypeIcon(activity.activityType)}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="font-medium text-sm">{activity.title}</p>
              {activity.description && (
                <p className="mt-0.5 text-muted-foreground text-sm">
                  {activity.description}
                </p>
              )}
              <p className="mt-1 text-muted-foreground text-xs">
                {formatTimestamp(activity.createdAt)}
                {activity.performerName && ` • ${activity.performerName}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// EMPTY STATE COMPONENT
// =============================================================================

export function ActivityFeedEmptyState({
  onRefresh,
  hasFilters = false,
}: {
  onRefresh?: () => void;
  hasFilters?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-4 rounded-full bg-muted/20 p-4">
        {hasFilters ? (
          <Filter className="h-8 w-8 text-muted-foreground/50" />
        ) : (
          <Activity className="h-8 w-8 text-muted-foreground/50" />
        )}
      </div>
      <h3 className="mb-1 font-medium text-lg">
        {hasFilters ? "No activities match your filters" : "No activities yet"}
      </h3>
      <p className="mb-4 max-w-sm text-center text-muted-foreground text-sm">
        {hasFilters
          ? "Try adjusting your filter criteria to see more results."
          : "Activities will appear here as you and your team make changes to the system."}
      </p>
      {onRefresh && (
        <Button onClick={onRefresh} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}
