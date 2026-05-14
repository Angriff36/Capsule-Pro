"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Bell,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Webhook,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface AlertsConfig {
  id: string;
  channel: string;
  destination: string;
}

interface InitialMetrics {
  total: number;
  channelCount: number;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; variant: string }
> = {
  email: {
    label: "Email",
    icon: <Mail className="mr-1 size-3" />,
    variant: "info",
  },
  sms: {
    label: "SMS",
    icon: <MessageSquare className="mr-1 size-3" />,
    variant: "success",
  },
  webhook: {
    label: "Webhook",
    icon: <Webhook className="mr-1 size-3" />,
    variant: "neutral",
  },
  slack: {
    label: "Slack",
    icon: <MessageSquare className="mr-1 size-3" />,
    variant: "warning",
  },
};

const DEFAULT_CHANNEL_ICON = {
  label: "Other",
  icon: <Bell className="mr-1 size-3" />,
  variant: "neutral",
};

interface FormState {
  channel: string;
  destination: string;
}

const EMPTY_FORM: FormState = { channel: "", destination: "" };

interface AlertsConfigClientProps {
  initialMetrics: InitialMetrics;
}

export function AlertsConfigClient({
  initialMetrics,
}: AlertsConfigClientProps) {
  const [configs, setConfigs] = useState<AlertsConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialMetrics.total);
  const [totalPages, setTotalPages] = useState(1);
  const [channelFilter, setChannelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertsConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlertsConfig | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await apiFetch(`/api/alertsconfig/list?${params}`);
      if (!res.ok) throw new Error("Failed to load alert configurations");
      const data = await res.json();
      setConfigs(data.data ?? []);
      setTotalCount(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load alert configurations"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, channelFilter, searchQuery]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleCreate = async () => {
    try {
      const res = await apiFetch("/api/alertsconfig/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: form.channel,
          destination: form.destination,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Create failed");
      }
      toast.success("Alert configuration created");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await loadConfigs();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create alert configuration"
      );
    }
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setActioning(editTarget.id);
    try {
      const res = await apiFetch("/api/alertsconfig/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          channel: form.channel,
          destination: form.destination,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }
      toast.success("Alert configuration updated");
      setEditTarget(null);
      setForm(EMPTY_FORM);
      await loadConfigs();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update alert configuration"
      );
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActioning(deleteTarget.id);
    try {
      const res = await apiFetch("/api/alertsconfig/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deleteTarget.id,
          reason: "Removed via settings UI",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Remove failed");
      }
      toast.success("Alert configuration removed");
      setDeleteTarget(null);
      await loadConfigs();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to remove alert configuration"
      );
    } finally {
      setActioning(null);
    }
  };

  const openEdit = (config: AlertsConfig) => {
    setEditTarget(config);
    setForm({ channel: config.channel, destination: config.destination });
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-10"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search channels or destinations..."
              value={searchInput}
            />
          </div>
          <Select
            onValueChange={(v) => {
              setChannelFilter(v);
              setPage(1);
            }}
            value={channelFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadConfigs} size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 size-4" />
            New Config
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && configs.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
          No alert configurations found. Create one to start receiving
          notifications.
        </div>
      )}

      {!isLoading && configs.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid grid-cols-[120px_1fr_120px_120px] gap-3 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Channel</span>
            <span>Destination</span>
            <span>ID</span>
            <span className="text-right">Actions</span>
          </div>
          {configs.map((config) => {
            const channelCfg =
              CHANNEL_CONFIG[config.channel] ?? DEFAULT_CHANNEL_ICON;
            return (
              <div
                className="grid grid-cols-[120px_1fr_120px_120px] gap-3 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
                key={config.id}
              >
                <StatusPill>
                  {channelCfg.icon}
                  {channelCfg.label}
                </StatusPill>
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm">
                    {config.destination}
                  </p>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {config.id.slice(0, 8)}...
                </span>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    disabled={actioning === config.id}
                    onClick={() => openEdit(config)}
                    size="sm"
                    variant="ghost"
                  >
                    <Pencil className="mr-1 size-3" />
                    Edit
                  </Button>
                  <Button
                    disabled={actioning === config.id}
                    onClick={() => setDeleteTarget(config)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="mr-1 size-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, totalCount)} of{" "}
            {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Alert Configuration</DialogTitle>
            <DialogDescription>
              Configure a new alert notification channel and destination.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <Select
                onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}
                value={form.channel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
                placeholder={
                  form.channel === "email"
                    ? "alerts@example.com"
                    : form.channel === "sms"
                      ? "+1234567890"
                      : form.channel === "webhook"
                        ? "https://example.com/webhook"
                        : "Channel destination"
                }
                value={form.destination}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!(form.channel && form.destination)}
              onClick={handleCreate}
            >
              Create Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setForm(EMPTY_FORM);
          }
        }}
        open={!!editTarget}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Alert Configuration</DialogTitle>
            <DialogDescription>
              Update the channel or destination for this alert configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <Select
                onValueChange={(v) => setForm((f) => ({ ...f, channel: v }))}
                value={form.channel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Destination</label>
              <Input
                onChange={(e) =>
                  setForm((f) => ({ ...f, destination: e.target.value }))
                }
                value={form.destination}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setEditTarget(null);
                setForm(EMPTY_FORM);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={
                actioning === editTarget?.id ||
                !form.channel ||
                !form.destination
              }
              onClick={handleEdit}
            >
              Update Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Alert Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the {deleteTarget?.channel} alert
              to {deleteTarget?.destination}? This will stop notifications to
              this destination.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Configuration</AlertDialogCancel>
            <AlertDialogAction
              disabled={actioning === deleteTarget?.id}
              onClick={handleDelete}
            >
              Remove Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
