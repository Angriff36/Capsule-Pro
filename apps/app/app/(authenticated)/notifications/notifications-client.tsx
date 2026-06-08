"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import {
  MonoLabel,
  StatusPill,
} from "@repo/design-system/components/blocks/page-shell";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  FilteredEmptyState,
  NoNotificationsState,
} from "@repo/design-system/components/blocks/illustrated-empty-states";
import { Bell, BellOff, CheckCircle, Eye, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { notificationMarkDismissed, notificationMarkRead, notificationRemove, listNotifications } from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  tenantId: string;
  id: string;
  recipient_employee_id: string;
  notification_type: string;
  title: string;
  body: string | null;
  action_url: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  correlation_id: string | null;
}

type StatusFilter = "all" | "unread" | "read" | "dismissed";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEPARATOR_RE = /[-_]/;

function formatMono(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function typeLabel(t: string): string {
  return t
    .split(SEPARATOR_RE)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={loading}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant="destructive">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: readonly StatusFilter[] = [
  "all",
  "unread",
  "read",
  "dismissed",
] as const;

interface NotificationsClientProperties {
  initialNotifications: Notification[];
}

export function NotificationsClient({
  initialNotifications,
}: NotificationsClientProperties) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const _loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listNotifications();
      setNotifications(result.data as unknown as Notification[]);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    setActioningId(id);
    try {
      await notificationMarkRead({ id });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setActioningId(null);
    }
  }, []);

  const handleDismiss = useCallback(async (id: string) => {
    setActioningId(id);
    try {
      await notificationMarkDismissed({ id });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification dismissed");
    } catch {
      toast.error("Failed to dismiss");
    } finally {
      setActioningId(null);
    }
  }, []);

  const handleRemove = useCallback(async () => {
    if (!removeId) {
      return;
    }
    setActioningId(removeId);
    try {
      await notificationRemove({ id: removeId });
      setNotifications((prev) => prev.filter((n) => n.id !== removeId));
      setRemoveId(null);
      toast.success("Notification removed");
    } catch {
      toast.error("Failed to remove");
    } finally {
      setActioningId(null);
    }
  }, [removeId]);

  const handleMarkAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) {
      toast.info("No unread notifications");
      return;
    }
    setMarkingAllRead(true);
    try {
      const results = await Promise.allSettled(
        unread.map((n) =>
          notificationMarkRead({ id: n.id })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.error(
          `Marked ${unread.length - failed} of ${unread.length} as read`
        );
      } else {
        toast.success(`Marked ${unread.length} as read`);
      }
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: now }))
      );
    } catch {
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  }, [notifications]);

  // Derived counts
  const total = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;
  const dismissedCount = 0; // dismissed are removed from list

  // Filtered list
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((n) => {
      if (statusFilter === "unread" && n.isRead) {
        return false;
      }
      if (statusFilter === "read" && !n.isRead) {
        return false;
      }
      // "dismissed" filter shows nothing since dismissed are removed
      if (statusFilter === "dismissed") {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [n.title, n.body ?? "", n.notification_type]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [notifications, statusFilter, search]);

  // ResearchTable rows
  const rows = useMemo(
    () =>
      filtered.map((n) => ({
        id: n.id,
        title: (
          <div className="space-y-1">
            <div className="ds-body-large text-ink">{n.title}</div>
            {n.body && (
              <div className="ds-caption text-ink/50 line-clamp-2 max-w-md">
                {n.body}
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {typeLabel(n.notification_type)}
              </span>
            </div>
          </div>
        ),
        href: n.action_url ?? undefined,
        pills: (
          <>
            {n.isRead ? (
              <StatusPill className="border-slate-400 text-slate-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                Read
              </StatusPill>
            ) : (
              <StatusPill className="border-blue-500 text-blue-600">
                <Bell className="mr-1 h-3 w-3" />
                Unread
              </StatusPill>
            )}
          </>
        ),
        meta: (
          <div className="space-y-2 text-right">
            <div className="font-mono text-xs">{formatMono(n.createdAt)}</div>
            <div className="text-[11px] text-ink/50">
              {formatDate(n.createdAt)}
            </div>
            <div className="flex items-center justify-end gap-1">
              {!n.isRead && (
                <Button
                  aria-label="Mark read"
                  className="h-7 w-7"
                  disabled={actioningId === n.id}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMarkRead(n.id);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  {actioningId === n.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                aria-label="Dismiss"
                className="h-7 w-7"
                disabled={actioningId === n.id}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDismiss(n.id);
                }}
                size="icon"
                variant="ghost"
              >
                <BellOff className="h-3.5 w-3.5" />
              </Button>
              <Button
                aria-label="Remove"
                className="h-7 w-7 text-destructive"
                disabled={actioningId === n.id}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRemoveId(n.id);
                }}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ),
      })),
    [filtered, actioningId, handleMarkRead, handleDismiss]
  );

  return (
    <section className="space-y-6">
      {/* Search + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="sm:max-w-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notifications..."
          value={search}
        />
        <div className="flex items-center gap-2">
          <Button
            disabled={markingAllRead || unreadCount === 0}
            onClick={handleMarkAllRead}
            size="sm"
            variant="outline"
          >
            {markingAllRead && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            <CheckCircle className="mr-2 h-4 w-4" />
            Mark All Read ({unreadCount})
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/notifications">
              <Bell className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <BlogFilterChip
            key={s}
            onSelect={() => setStatusFilter(s)}
            selected={statusFilter === s}
          >
            {s === "all"
              ? `All (${total})`
              : s === "unread"
                ? `Unread (${unreadCount})`
                : s === "read"
                  ? `Read (${readCount})`
                  : `Dismissed (${dismissedCount})`}
          </BlogFilterChip>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        statusFilter !== "all" ? (
          <FilteredEmptyState
            itemName="notifications"
            onClearFilters={() => setStatusFilter("all")}
          />
        ) : (
          <NoNotificationsState />
        )
      ) : (
        <ResearchTable
          caption={
            <MonoLabel tone="dark">
              {filtered.length} notification{filtered.length !== 1 ? "s" : ""}
            </MonoLabel>
          }
          linkComponent={({ href, className, children }) => (
            <Link className={className} href={href}>
              {children}
            </Link>
          )}
          rows={rows}
        />
      )}

      {/* Remove Confirm Dialog */}
      <ConfirmDialog
        confirmLabel="Remove"
        description="This will permanently remove this notification. This action cannot be undone."
        loading={actioningId === removeId}
        onConfirm={handleRemove}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveId(null);
          }
        }}
        open={removeId !== null}
        title="Remove Notification"
      />
    </section>
  );
}
