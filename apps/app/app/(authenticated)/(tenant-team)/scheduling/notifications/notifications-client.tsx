"use client";

import {
  OperationalRow,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
  AlertTriangleIcon,
  BellIcon,
  BellOffIcon,
  CalendarCheckIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  FilterIcon,
  Loader2Icon,
  UserCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type SchedulingNotificationType =
  | "shift_assigned"
  | "shift_changed"
  | "shift_reminder"
  | "time_off_status"
  | "certification_expiration"
  | "schedule_published";

interface Notification {
  action_url: string | null;
  body: string | null;
  correlation_id: string | null;
  createdAt: string;
  id: string;
  isRead: boolean;
  notification_type: SchedulingNotificationType;
  readAt: string | null;
  recipient_employee_id: string;
  tenantId: string;
  title: string;
}

interface Pagination {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

type TabFilter = "all" | SchedulingNotificationType;

const TABS: { value: TabFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "shift_assigned", label: "Shift assigned" },
  { value: "shift_changed", label: "Shift changed" },
  { value: "shift_reminder", label: "Reminders" },
  { value: "time_off_status", label: "Time off" },
  { value: "certification_expiration", label: "Certifications" },
  { value: "schedule_published", label: "Published" },
];

function getNotificationIcon(type: SchedulingNotificationType) {
  switch (type) {
    case "shift_assigned":
      return UserCheckIcon;
    case "shift_changed":
      return CalendarIcon;
    case "shift_reminder":
      return ClockIcon;
    case "time_off_status":
      return CalendarCheckIcon;
    case "certification_expiration":
      return AlertTriangleIcon;
    case "schedule_published":
      return CheckCircle2Icon;
    default:
      return BellIcon;
  }
}

function getNotificationIconColor(type: SchedulingNotificationType) {
  switch (type) {
    case "shift_assigned":
      return "text-blue-600";
    case "shift_changed":
      return "text-amber-600";
    case "shift_reminder":
      return "text-purple-600";
    case "time_off_status":
      return "text-green-600";
    case "certification_expiration":
      return "text-red-600";
    case "schedule_published":
      return "text-emerald-600";
    default:
      return "text-muted-foreground";
  }
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
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

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const fetchNotifications = useCallback(async (page = 1, type?: TabFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (type && type !== "all") {
        params.set("type", type);
      }

      // NOTE: Keeping apiFetch for /api/staff/notifications — staffing-specific endpoint, generated listNotifications targets /api/collaboration/notifications.
      const res = await apiFetch(`/api/staff/notifications?${params}`);
      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setPagination(
        data.pagination ?? { page: 1, limit: 25, total: 0, totalPages: 0 }
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1, activeTab);
  }, [activeTab, fetchNotifications]);

  const handleMarkRead = async (notificationId: string) => {
    setMarkingRead(notificationId);
    try {
      // NOTE: Keeping apiFetch for /notification/mark-read — custom endpoint, generated notificationMarkRead uses Manifest dispatcher.
      const res = await apiFetch("/notification/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
      }
    } catch {
      // Silently fail — the UI still reflects the optimistic state
    } finally {
      setMarkingRead(null);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderContent = () => {
    if (loading) {
      return (
        <OperationalRow density="comfortable">
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2Icon aria-hidden className="size-5 animate-spin" />
            <span className="text-sm">Loading notifications...</span>
          </div>
        </OperationalRow>
      );
    }

    if (notifications.length === 0) {
      const emptyDescription =
        activeTab === "all"
          ? "Scheduling notifications will appear here when shifts are assigned, changed, or published."
          : `No ${TABS.find((t) => t.value === activeTab)?.label.toLowerCase() ?? ""} notifications found.`;

      return (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellOffIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No notifications</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      );
    }

    return (
      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.notification_type);
          const iconColor = getNotificationIconColor(
            notification.notification_type
          );

          return (
            <Card
              className={
                notification.isRead
                  ? "opacity-70"
                  : "border-l-4 border-l-blue-500"
              }
              key={notification.id}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <Icon
                      aria-hidden
                      className={`mt-0.5 size-5 shrink-0 ${iconColor}`}
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm leading-snug">
                        {notification.title}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <Badge className="text-[10px]" variant="default">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!notification.isRead && (
                      <Button
                        aria-label="Mark as read"
                        disabled={markingRead === notification.id}
                        onClick={() => handleMarkRead(notification.id)}
                        size="sm"
                        variant="ghost"
                      >
                        {markingRead === notification.id ? (
                          <Loader2Icon
                            aria-hidden
                            className="size-3.5 animate-spin"
                          />
                        ) : (
                          <BellIcon aria-hidden className="size-3.5" />
                        )}
                        <span className="ml-1">Read</span>
                      </Button>
                    )}
                    {notification.action_url && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={notification.action_url}>
                          <ExternalLinkIcon aria-hidden className="size-3.5" />
                          <span className="ml-1">View</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {notification.body && (
                <CardContent className="pt-0">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {notification.body}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-4">
            <Button
              disabled={pagination.page <= 1}
              onClick={() => fetchNotifications(pagination.page - 1, activeTab)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchNotifications(pagination.page + 1, activeTab)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <SectionHeader
        count={
          unreadCount > 0
            ? `${unreadCount} unread`
            : `${pagination.total} total`
        }
        description="Filter by type to narrow results."
        eyebrow="Inbox"
        title={
          <span className="inline-flex items-center gap-2">
            <FilterIcon aria-hidden className="size-5 text-muted-foreground" />
            Scheduling notifications
          </span>
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            size="sm"
            variant={activeTab === tab.value ? "default" : "outline"}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {renderContent()}
    </section>
  );
}
