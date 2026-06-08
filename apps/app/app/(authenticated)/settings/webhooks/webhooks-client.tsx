"use client";

import {
  CommandBand,
  CommandBandActions,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Plus,
  RotateCw,
  Trash2,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom webhook management endpoints: CRUD, delivery-logs, DLQ retry/resolve (no generated client equivalent)
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  apiKey: string | null;
  status: string;
  eventTypeFilters: string[];
  entityFilters: string[];
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;
  customHeaders: Record<string, string> | null;
  consecutiveFailures: number;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  status: string;
  attemptNumber: number;
  httpResponseStatus: number | null;
  errorMessage: string | null;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

interface DlqEntry {
  id: string;
  webhookId: string;
  deliveryLogId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  failureReason: string | null;
  lastAttemptAt: string | null;
  attemptCount: number;
  movedToDlqAt: string;
  resolvedAt: string | null;
  reviewedBy: string | null;
  webhook?: { name: string; url: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVENT_TYPES = ["created", "updated", "deleted"] as const;
const ENTITY_TYPES = [
  "event",
  "task",
  "kitchen_task",
  "prep_task",
  "employee",
  "client",
  "proposal",
  "contract",
  "shipment",
  "inventory_item",
  "purchase_order",
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-700",
  disabled: "bg-red-100 text-red-800",
  success: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-amber-100 text-amber-800",
  retrying: "bg-blue-100 text-blue-800",
  dead_letter: "bg-red-100 text-red-800",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function entityLabel(e: string): string {
  return e.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <Badge className={`text-xs capitalize ${cls}`} variant="secondary">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  variant = "default",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={onConfirm}
            variant={variant === "destructive" ? "destructive" : "default"}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Webhook form dialog
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  url: string;
  secret: string;
  apiKey: string;
  eventTypeFilters: string[];
  entityFilters: string[];
  retryCount: number;
  timeoutMs: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  url: "",
  secret: "",
  apiKey: "",
  eventTypeFilters: [],
  entityFilters: [],
  retryCount: 3,
  timeoutMs: 30_000,
};

function WebhookFormDialog({
  open,
  onOpenChange,
  webhook,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  webhook: WebhookConfig | null;
  onSave: (data: FormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (webhook) {
      setForm({
        name: webhook.name,
        url: webhook.url,
        secret: "",
        apiKey: "",
        eventTypeFilters: [...webhook.eventTypeFilters],
        entityFilters: [...webhook.entityFilters],
        retryCount: webhook.retryCount,
        timeoutMs: webhook.timeoutMs,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [webhook, open]);

  const toggleFilter = (
    field: "eventTypeFilters" | "entityFilters",
    value: string
  ) => {
    setForm((prev) => {
      const arr = prev[field];
      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const valid = form.name.trim().length > 0 && form.url.trim().length > 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{webhook ? "Edit Webhook" : "New Webhook"}</DialogTitle>
          <DialogDescription>
            {webhook
              ? "Update endpoint configuration."
              : "Configure a new outbound webhook endpoint."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wh-name">Name</Label>
            <Input
              id="wh-name"
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Slack Notification"
              value={form.name}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input
              className="font-mono text-sm"
              id="wh-url"
              onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com/webhooks"
              value={form.url}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-secret">HMAC Secret</Label>
              <Input
                id="wh-secret"
                onChange={(e) =>
                  setForm((p) => ({ ...p, secret: e.target.value }))
                }
                placeholder={webhook ? "(unchanged)" : "Optional"}
                type="password"
                value={form.secret}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-apikey">API Key</Label>
              <Input
                id="wh-apikey"
                onChange={(e) =>
                  setForm((p) => ({ ...p, apiKey: e.target.value }))
                }
                placeholder={webhook ? "(unchanged)" : "Optional"}
                type="password"
                value={form.apiKey}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Event Type Filters</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <Button
                  className="capitalize"
                  key={et}
                  onClick={() => toggleFilter("eventTypeFilters", et)}
                  size="sm"
                  type="button"
                  variant={
                    form.eventTypeFilters.includes(et) ? "default" : "outline"
                  }
                >
                  {et}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to receive all event types.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Entity Filters</Label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_TYPES.map((et) => (
                <Button
                  className="capitalize"
                  key={et}
                  onClick={() => toggleFilter("entityFilters", et)}
                  size="sm"
                  type="button"
                  variant={
                    form.entityFilters.includes(et) ? "default" : "outline"
                  }
                >
                  {entityLabel(et)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to receive all entity types.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wh-retry">Max Retries</Label>
              <Input
                id="wh-retry"
                max={10}
                min={0}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    retryCount: Number(e.target.value),
                  }))
                }
                type="number"
                value={form.retryCount}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-timeout">Timeout (ms)</Label>
              <Input
                id="wh-timeout"
                min={1000}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    timeoutMs: Number(e.target.value),
                  }))
                }
                step={1000}
                type="number"
                value={form.timeoutMs}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!valid || loading} onClick={() => onSave(form)}>
            {loading ? "Saving…" : webhook ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WebhooksClient() {
  const [tab, setTab] = useState("webhooks");

  // Data
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);
  const [logsPagination, setLogsPagination] = useState({
    total: 0,
    hasMore: false,
  });
  const [dlqPagination, setDlqPagination] = useState({
    total: 0,
    hasMore: false,
  });

  // UI
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  // Confirm dialogs
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    label: string;
    action: () => void;
    variant: "default" | "destructive";
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch helpers
  // ---------------------------------------------------------------------------

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await apiFetch("/api/integrations/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks ?? []);
      }
    } catch {
      toast.error("Failed to load webhooks");
    }
  }, []);

  const fetchLogs = useCallback(
    async (append = false) => {
      try {
        const offset = append ? logs.length : 0;
        const res = await apiFetch(
          `/api/integrations/webhooks/delivery-logs?limit=50&offset=${offset}`
        );
        if (res.ok) {
          const data = await res.json();
          setLogs((prev) =>
            append ? [...prev, ...(data.logs ?? [])] : (data.logs ?? [])
          );
          setLogsPagination(data.pagination ?? { total: 0, hasMore: false });
        }
      } catch {
        toast.error("Failed to load delivery logs");
      }
    },
    [logs.length]
  );

  const fetchDlq = useCallback(
    async (append = false) => {
      try {
        const offset = append ? dlqEntries.length : 0;
        const res = await apiFetch(
          `/api/integrations/webhooks/dlq?limit=50&unresolved=true&offset=${offset}`
        );
        if (res.ok) {
          const data = await res.json();
          setDlqEntries((prev) =>
            append ? [...prev, ...(data.entries ?? [])] : (data.entries ?? [])
          );
          setDlqPagination(data.pagination ?? { total: 0, hasMore: false });
        }
      } catch {
        toast.error("Failed to load dead letter queue");
      }
    },
    [dlqEntries.length]
  );

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchWebhooks(), fetchLogs(), fetchDlq()]).finally(() =>
      setLoading(false)
    );
  }, [fetchWebhooks, fetchLogs, fetchDlq]);

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const handleSave = async (data: FormState) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: data.name,
        url: data.url,
        eventTypeFilters: data.eventTypeFilters,
        entityFilters: data.entityFilters,
        retryCount: data.retryCount,
        timeoutMs: data.timeoutMs,
      };
      if (data.secret) body.secret = data.secret;
      if (data.apiKey) body.apiKey = data.apiKey;

      const res = editingWebhook
        ? await apiFetch(`/api/integrations/webhooks/${editingWebhook.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiFetch("/api/integrations/webhooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        toast.success(editingWebhook ? "Webhook updated" : "Webhook created");
        setFormOpen(false);
        setEditingWebhook(null);
        await fetchWebhooks();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Save failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (wh: WebhookConfig) => {
    const next = wh.status === "active" ? "inactive" : "active";
    setConfirm({
      title: `${next === "active" ? "Activate" : "Pause"} webhook`,
      description: `${next === "active" ? "Resume" : "Pause"} "${wh.name}"?`,
      label: next === "active" ? "Activate" : "Pause",
      variant: "default",
      action: async () => {
        setConfirm(null);
        try {
          const res = await apiFetch(`/api/integrations/webhooks/${wh.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          });
          if (res.ok) {
            toast.success(`Webhook ${next}`);
            await fetchWebhooks();
          }
        } catch {
          toast.error("Failed to update status");
        }
      },
    });
  };

  const handleDelete = (wh: WebhookConfig) => {
    setConfirm({
      title: "Delete webhook",
      description: `Permanently delete "${wh.name}"? This cannot be undone.`,
      label: "Delete",
      variant: "destructive",
      action: async () => {
        setConfirm(null);
        try {
          const res = await apiFetch(`/api/integrations/webhooks/${wh.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            toast.success("Webhook deleted");
            await fetchWebhooks();
          }
        } catch {
          toast.error("Failed to delete");
        }
      },
    });
  };

  const handleRetryDlq = (entry: DlqEntry) => {
    setConfirm({
      title: "Retry delivery",
      description: `Retry the failed delivery for ${entityLabel(entry.entityType)}?`,
      label: "Retry",
      variant: "default",
      action: async () => {
        setConfirm(null);
        try {
          const res = await apiFetch(
            `/api/integrations/webhooks/dlq/${entry.id}/retry`,
            { method: "POST" }
          );
          if (res.ok) {
            toast.success("Delivery queued for retry");
            await fetchDlq();
          }
        } catch {
          toast.error("Retry failed");
        }
      },
    });
  };

  const handleResolveDlq = (entry: DlqEntry) => {
    setConfirm({
      title: "Resolve entry",
      description: `Mark this ${entityLabel(entry.entityType)} delivery as resolved?`,
      label: "Resolve",
      variant: "default",
      action: async () => {
        setConfirm(null);
        try {
          const res = await apiFetch(
            `/api/integrations/webhooks/dlq/${entry.id}/resolve`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resolution: "Manually resolved" }),
            }
          );
          if (res.ok) {
            toast.success("Entry resolved");
            await fetchDlq();
          }
        } catch {
          toast.error("Resolve failed");
        }
      },
    });
  };

  const handleRetryFailed = async () => {
    try {
      const res = await apiFetch("/api/integrations/webhooks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRetries: 50 }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Retried ${data.retried ?? 0} deliveries`);
        await fetchLogs();
      }
    } catch {
      toast.error("Bulk retry failed");
    }
  };

  // ---------------------------------------------------------------------------
  // Computed metrics
  // ---------------------------------------------------------------------------

  const totalWebhooks = webhooks.length;
  const activeCount = webhooks.filter((w) => w.status === "active").length;
  const failedCount = logs.filter((l) => l.status === "failed").length;
  const dlqCount = dlqEntries.filter((e) => !e.resolvedAt).length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <PageCanvas>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          Loading webhooks…
        </div>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      {/* Hero */}
      <CommandBand tone="deep-green">
        <CommandBandHeader>
          <MonoLabel>Settings / Integrations</MonoLabel>
          <DisplayHeading size="md">Webhooks</DisplayHeading>
          <CommandBandLede>
            Configure outbound webhooks to push real-time events to your
            external services.
          </CommandBandLede>
        </CommandBandHeader>
        <CommandBandBody>
          <CommandBandActions>
            <Button
              onClick={() => {
                setEditingWebhook(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Webhook
            </Button>
            <Button asChild variant="outline">
              <Link href="/settings">Back to Settings</Link>
            </Button>
          </CommandBandActions>
        </CommandBandBody>
      </CommandBand>

      {/* Metrics */}
      <MetricBand cols={4}>
        <MetricCell>
          <MetricLabel>Total Webhooks</MetricLabel>
          <MetricValue>{totalWebhooks}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>Active</MetricLabel>
          <MetricValue>{activeCount}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>Failed Deliveries</MetricLabel>
          <MetricValue>{failedCount}</MetricValue>
        </MetricCell>
        <MetricCell>
          <MetricLabel>Dead Letter Queue</MetricLabel>
          <MetricValue>{dlqCount}</MetricValue>
        </MetricCell>
      </MetricBand>

      {/* Tabs */}
      <OperationalColumn>
        <Tabs onValueChange={setTab} value={tab}>
          <TabsList>
            <TabsTrigger value="webhooks">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="delivery-logs">
              <Webhook className="mr-1.5 h-3.5 w-3.5" />
              Delivery Logs
            </TabsTrigger>
            <TabsTrigger value="dlq">
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Dead Letter Queue
            </TabsTrigger>
          </TabsList>

          {/* ---- Webhooks tab ---- */}
          <TabsContent className="mt-6" value="webhooks">
            {webhooks.length === 0 ? (
              <div className="rounded-[22px] border border-dashed px-6 py-16 text-center">
                <Webhook className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <h3 className="mt-4 text-lg font-semibold">
                  No webhooks configured
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a webhook to receive real-time event notifications.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => {
                    setEditingWebhook(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Webhook
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Failures</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-medium">{wh.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {wh.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {wh.eventTypeFilters.length === 0 ? (
                            <Badge className="text-xs" variant="secondary">
                              All
                            </Badge>
                          ) : (
                            wh.eventTypeFilters.map((et) => (
                              <Badge
                                className="text-xs capitalize"
                                key={et}
                                variant="secondary"
                              >
                                {et}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wh.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {wh.consecutiveFailures > 0 ? (
                          <span className="text-red-600 font-medium">
                            {wh.consecutiveFailures}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmt(wh.lastTriggeredAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => {
                              setEditingWebhook(wh);
                              setFormOpen(true);
                            }}
                            size="icon-sm"
                            title="Edit"
                            variant="ghost"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleToggle(wh)}
                            size="icon-sm"
                            title={
                              wh.status === "active" ? "Pause" : "Activate"
                            }
                            variant="ghost"
                          >
                            {wh.status === "active" ? (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            onClick={() => handleDelete(wh)}
                            size="icon-sm"
                            title="Delete"
                            variant="ghost"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* ---- Delivery Logs tab ---- */}
          <TabsContent className="mt-6" value="delivery-logs">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                count={logsPagination.total}
                title="Delivery Logs"
              />
              <Button onClick={handleRetryFailed} size="sm" variant="outline">
                <RotateCw className="mr-1.5 h-3.5 w-3.5" />
                Retry Failed
              </Button>
            </div>
            {logs.length === 0 ? (
              <div className="rounded-[22px] border border-dashed px-6 py-16 text-center text-muted-foreground">
                No delivery logs yet.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Attempt</TableHead>
                      <TableHead>HTTP Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge
                            className="text-xs capitalize"
                            variant="secondary"
                          >
                            {log.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entityLabel(log.entityType)}{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            {truncate(log.entityId, 8)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {log.attemptNumber}
                        </TableCell>
                        <TableCell>
                          {log.httpResponseStatus ? (
                            <span
                              className={
                                log.httpResponseStatus >= 200 &&
                                log.httpResponseStatus < 300
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }
                            >
                              {log.httpResponseStatus}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground max-w-[200px] truncate"
                          title={log.errorMessage ?? ""}
                        >
                          {log.errorMessage
                            ? truncate(log.errorMessage, 40)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmt(log.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {logsPagination.hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => fetchLogs(true)}
                      size="sm"
                      variant="outline"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ---- Dead Letter Queue tab ---- */}
          <TabsContent className="mt-6" value="dlq">
            <SectionHeader
              count={dlqPagination.total}
              description="Permanently failed deliveries awaiting manual review."
              title="Dead Letter Queue"
            />
            {dlqEntries.length === 0 ? (
              <div className="rounded-[22px] border border-dashed px-6 py-16 text-center text-muted-foreground">
                <CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4">
                  No unresolved entries in the dead letter queue.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Webhook</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                      <TableHead>Failure Reason</TableHead>
                      <TableHead>Moved to DLQ</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dlqEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Badge
                            className="text-xs capitalize"
                            variant="secondary"
                          >
                            {entry.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entityLabel(entry.entityType)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.webhook?.name ?? truncate(entry.webhookId, 8)}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.attemptCount}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground max-w-[200px] truncate"
                          title={entry.failureReason ?? ""}
                        >
                          {entry.failureReason
                            ? truncate(entry.failureReason, 40)
                            : "Unknown"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {fmt(entry.movedToDlqAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => handleRetryDlq(entry)}
                              size="icon-sm"
                              title="Retry"
                              variant="ghost"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleResolveDlq(entry)}
                              size="icon-sm"
                              title="Resolve"
                              variant="ghost"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {dlqPagination.hasMore && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => fetchDlq(true)}
                      size="sm"
                      variant="outline"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </OperationalColumn>

      {/* Form dialog */}
      <WebhookFormDialog
        loading={saving}
        onOpenChange={setFormOpen}
        onSave={handleSave}
        open={formOpen}
        webhook={editingWebhook}
      />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          confirmLabel={confirm.label}
          description={confirm.description}
          onConfirm={confirm.action}
          onOpenChange={() => setConfirm(null)}
          open
          title={confirm.title}
          variant={confirm.variant}
        />
      )}
    </PageCanvas>
  );
}
