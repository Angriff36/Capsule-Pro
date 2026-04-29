"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  EyeIcon,
  GlobeIcon,
  Loader2Icon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  RotateCwIcon,
  Trash2Icon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Webhook {
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

type Tab = "webhooks" | "delivery-logs" | "dlq";

const VALID_EVENT_TYPES = ["created", "updated", "deleted"] as const;
const VALID_ENTITY_TYPES = [
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Never";
  }
  return new Date(dateStr).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string; label: string }> = {
    active: { bg: "bg-green-500/10", dot: "bg-green-400", label: "Active" },
    inactive: {
      bg: "bg-slate-500/10",
      dot: "bg-slate-400",
      label: "Inactive",
    },
    disabled: { bg: "bg-red-500/10", dot: "bg-red-400", label: "Disabled" },
    success: { bg: "bg-green-500/10", dot: "bg-green-400", label: "Success" },
    failed: { bg: "bg-red-500/10", dot: "bg-red-400", label: "Failed" },
    pending: {
      bg: "bg-yellow-500/10",
      dot: "bg-yellow-400",
      label: "Pending",
    },
    retrying: { bg: "bg-blue-500/10", dot: "bg-blue-400", label: "Retrying" },
  };
  const c = config[status] ?? {
    bg: "bg-slate-500/10",
    dot: "bg-slate-400",
    label: status,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) {
    return url;
  }
  return `${url.slice(0, maxLen - 3)}...`;
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-md">
        <div className="dev-console-panel-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            className="dev-console-button dev-console-button-ghost"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`dev-console-button ${
              confirmVariant === "danger"
                ? "!bg-red-600 hover:!bg-red-500"
                : "dev-console-button-primary"
            }`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit Webhook Dialog
// ---------------------------------------------------------------------------

function WebhookFormDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Webhook | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = editing !== null;
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(3);
  const [timeoutMs, setTimeoutMs] = useState(30_000);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && editing) {
      setName(editing.name);
      setUrl(editing.url);
      setSecret("");
      setApiKey("");
      setSelectedEvents([...(editing.eventTypeFilters as string[])]);
      setSelectedEntities([...(editing.entityFilters as string[])]);
      setRetryCount(editing.retryCount);
      setTimeoutMs(editing.timeoutMs);
    } else if (open) {
      setName("");
      setUrl("");
      setSecret("");
      setApiKey("");
      setSelectedEvents([]);
      setSelectedEntities([]);
      setRetryCount(3);
      setTimeoutMs(30_000);
    }
  }, [open, editing]);

  const toggleItem = (
    item: string,
    list: string[],
    setter: (v: string[]) => void
  ) => {
    setter(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!(name.trim() && url.trim())) {
      toast.error("Name and URL are required");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        url: url.trim(),
        eventTypeFilters: selectedEvents,
        entityFilters: selectedEntities,
        retryCount,
        timeoutMs,
      };
      if (secret.trim()) {
        body.secret = secret.trim();
      }
      if (apiKey.trim()) {
        body.apiKey = apiKey.trim();
      }

      const res = await apiFetch(
        isEdit
          ? `/api/integrations/webhooks/${editing.id}`
          : "/api/integrations/webhooks",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save webhook");
      }

      toast.success(
        isEdit
          ? `Webhook "${name.trim()}" updated`
          : `Webhook "${name.trim()}" created`
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save webhook"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="dev-console-panel-header">
          <div>
            <h2>{isEdit ? "Edit Webhook" : "Create Webhook"}</h2>
            <p>
              {isEdit
                ? "Update webhook configuration"
                : "Configure a new outbound webhook endpoint"}
            </p>
          </div>
          <button
            className="dev-console-button dev-console-button-ghost"
            onClick={onClose}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs text-slate-400"
                htmlFor="wh-name"
              >
                Name
              </label>
              <input
                className="dev-console-input w-full"
                id="wh-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Slack Notification"
                type="text"
                value={name}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs text-slate-400"
                htmlFor="wh-url"
              >
                Endpoint URL
              </label>
              <input
                className="dev-console-input w-full font-mono text-sm"
                id="wh-url"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks"
                type="url"
                value={url}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="mb-1.5 block text-xs text-slate-400"
                  htmlFor="wh-secret"
                >
                  HMAC Secret
                </label>
                <input
                  className="dev-console-input w-full font-mono text-sm"
                  id="wh-secret"
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder={isEdit ? "(unchanged)" : "Optional"}
                  type="password"
                  value={secret}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs text-slate-400"
                  htmlFor="wh-apikey"
                >
                  API Key
                </label>
                <input
                  className="dev-console-input w-full font-mono text-sm"
                  id="wh-apikey"
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={isEdit ? "(unchanged)" : "Optional"}
                  type="password"
                  value={apiKey}
                />
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-xs text-slate-400">
                Event Type Filters
              </span>
              <div className="flex flex-wrap gap-2">
                {VALID_EVENT_TYPES.map((et) => (
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedEvents.includes(et)
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                    key={et}
                    onClick={() =>
                      toggleItem(et, selectedEvents, setSelectedEvents)
                    }
                    type="button"
                  >
                    {selectedEvents.includes(et) && (
                      <CheckIcon className="h-3 w-3" />
                    )}
                    {et}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Leave empty to receive all event types
              </p>
            </div>

            <div>
              <span className="mb-1.5 block text-xs text-slate-400">
                Entity Filters
              </span>
              <div className="flex flex-wrap gap-2">
                {VALID_ENTITY_TYPES.map((et) => (
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedEntities.includes(et)
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                    key={et}
                    onClick={() =>
                      toggleItem(et, selectedEntities, setSelectedEntities)
                    }
                    type="button"
                  >
                    {selectedEntities.includes(et) && (
                      <CheckIcon className="h-3 w-3" />
                    )}
                    {et.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Leave empty to receive all entity types
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="mb-1.5 block text-xs text-slate-400"
                  htmlFor="wh-retry"
                >
                  Max Retries
                </label>
                <input
                  className="dev-console-input w-full"
                  id="wh-retry"
                  max={10}
                  min={0}
                  onChange={(e) => setRetryCount(Number(e.target.value) || 3)}
                  type="number"
                  value={retryCount}
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-xs text-slate-400"
                  htmlFor="wh-timeout"
                >
                  Timeout (ms)
                </label>
                <input
                  className="dev-console-input w-full"
                  id="wh-timeout"
                  min={1000}
                  onChange={(e) =>
                    setTimeoutMs(Number(e.target.value) || 30_000)
                  }
                  step={1000}
                  type="number"
                  value={timeoutMs}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="dev-console-button dev-console-button-ghost"
              disabled={loading}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="dev-console-button dev-console-button-primary"
              disabled={loading || !name.trim() || !url.trim()}
              type="submit"
            >
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              {isEdit ? "Save Changes" : "Create Webhook"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Dialog
// ---------------------------------------------------------------------------

function WebhookDetailDialog({
  open,
  webhook,
  onClose,
}: {
  open: boolean;
  webhook: Webhook | null;
  onClose: () => void;
}) {
  if (!(open && webhook)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="dev-console-panel-header">
          <div>
            <h2>{webhook.name}</h2>
            <p>Webhook Configuration</p>
          </div>
          <button
            className="dev-console-button dev-console-button-ghost"
            onClick={onClose}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-[140px_1fr] gap-y-3">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={webhook.status} />

            <span className="text-slate-500">URL</span>
            <span className="break-all font-mono text-xs text-slate-300">
              {webhook.url}
            </span>

            <span className="text-slate-500">Secret</span>
            <span className="text-slate-400">
              {webhook.secret ? "***" : "Not set"}
            </span>

            <span className="text-slate-500">API Key</span>
            <span className="text-slate-400">
              {webhook.apiKey ? "***" : "Not set"}
            </span>

            <span className="text-slate-500">Event Filters</span>
            <div className="flex flex-wrap gap-1.5">
              {(webhook.eventTypeFilters as string[]).length === 0 ? (
                <span className="text-slate-500">All events</span>
              ) : (
                (webhook.eventTypeFilters as string[]).map((f) => (
                  <span
                    className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                    key={f}
                  >
                    {f}
                  </span>
                ))
              )}
            </div>

            <span className="text-slate-500">Entity Filters</span>
            <div className="flex flex-wrap gap-1.5">
              {(webhook.entityFilters as string[]).length === 0 ? (
                <span className="text-slate-500">All entities</span>
              ) : (
                (webhook.entityFilters as string[]).map((f) => (
                  <span
                    className="inline-flex rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400"
                    key={f}
                  >
                    {f.replace(/_/g, " ")}
                  </span>
                ))
              )}
            </div>

            <span className="text-slate-500">Retry Count</span>
            <span className="text-slate-300">{webhook.retryCount}</span>

            <span className="text-slate-500">Timeout</span>
            <span className="text-slate-300">
              {(webhook.timeoutMs / 1000).toFixed(0)}s
            </span>

            <span className="text-slate-500">Failures</span>
            <span
              className={
                webhook.consecutiveFailures > 0
                  ? "text-red-400"
                  : "text-slate-300"
              }
            >
              {webhook.consecutiveFailures}
            </span>

            <span className="text-slate-500">Last Triggered</span>
            <span className="text-slate-300">
              {formatDate(webhook.lastTriggeredAt)}
            </span>

            <span className="text-slate-500">Last Success</span>
            <span className="text-slate-300">
              {formatDate(webhook.lastSuccessAt)}
            </span>

            <span className="text-slate-500">Last Failure</span>
            <span className="text-slate-300">
              {formatDate(webhook.lastFailureAt)}
            </span>

            <span className="text-slate-500">Created</span>
            <span className="text-slate-300">
              {formatDate(webhook.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            className="dev-console-button dev-console-button-ghost"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export const WebhooksClient = () => {
  const [tab, setTab] = useState<Tab>("webhooks");

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [whLoading, setWhLoading] = useState(true);
  const [whError, setWhError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Delivery logs state
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPagination, setLogsPagination] = useState({
    total: 0,
    hasMore: false,
  });

  // DLQ state
  const [dlqEntries, setDlqEntries] = useState<DlqEntry[]>([]);
  const [dlqLoading, setDlqLoading] = useState(false);
  const [dlqPagination, setDlqPagination] = useState({
    total: 0,
    hasMore: false,
  });

  // Dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [detailWebhook, setDetailWebhook] = useState<Webhook | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "delete" | "toggle" | "retry-dlq" | "resolve-dlq";
    id: string;
    label: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch webhooks
  // -------------------------------------------------------------------------

  const fetchWebhooks = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setRefreshing(true);
    } else {
      setWhLoading(true);
    }
    setWhError(null);

    try {
      const res = await apiFetch("/api/integrations/webhooks");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch webhooks");
      }
      const data = await res.json();
      setWebhooks(data.webhooks ?? []);
    } catch (err) {
      setWhError(err instanceof Error ? err.message : "Unknown error");
      setWebhooks([]);
    } finally {
      setWhLoading(false);
      setRefreshing(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch delivery logs
  // -------------------------------------------------------------------------

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await apiFetch(
        "/api/integrations/webhooks/delivery-logs?limit=50"
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch logs");
      }
      const data = await res.json();
      setLogs(data.logs ?? []);
      setLogsPagination(data.pagination ?? { total: 0, hasMore: false });
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch DLQ entries
  // -------------------------------------------------------------------------

  const fetchDlq = useCallback(async () => {
    setDlqLoading(true);
    try {
      const res = await apiFetch(
        "/api/integrations/webhooks/dlq?limit=50&unresolved=true"
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch DLQ");
      }
      const data = await res.json();
      setDlqEntries(data.entries ?? []);
      setDlqPagination(data.pagination ?? { total: 0, hasMore: false });
    } catch {
      setDlqEntries([]);
    } finally {
      setDlqLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchWebhooks().catch(() => {
      // Initial fetch error handled internally
    });
  }, [fetchWebhooks]);

  useEffect(() => {
    if (tab === "delivery-logs") {
      fetchLogs().catch(() => {
        // Logs fetch error handled internally
      });
    } else if (tab === "dlq") {
      fetchDlq().catch(() => {
        // DLQ fetch error handled internally
      });
    }
  }, [tab, fetchLogs, fetchDlq]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleToggleStatus = async () => {
    if (!confirmAction) {
      return;
    }
    setActionLoading(true);
    try {
      const wh = webhooks.find((w) => w.id === confirmAction.id);
      if (!wh) {
        return;
      }
      const newStatus = wh.status === "active" ? "inactive" : "active";
      const res = await apiFetch(`/api/integrations/webhooks/${wh.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update webhook");
      }
      toast.success(
        `Webhook ${newStatus === "active" ? "activated" : "paused"}`
      );
      setConfirmAction(null);
      await fetchWebhooks(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update webhook"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `/api/integrations/webhooks/${confirmAction.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete webhook");
      }
      toast.success("Webhook deleted");
      setConfirmAction(null);
      await fetchWebhooks(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete webhook"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryDlq = async () => {
    if (!confirmAction) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `/api/integrations/webhooks/dlq/${confirmAction.id}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to retry");
      }
      toast.success("DLQ entry queued for retry");
      setConfirmAction(null);
      await fetchDlq();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDlq = async () => {
    if (!confirmAction) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `/api/integrations/webhooks/dlq/${confirmAction.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to resolve");
      }
      toast.success("DLQ entry resolved");
      setConfirmAction(null);
      await fetchDlq();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) {
      return;
    }
    if (confirmAction.type === "delete") {
      handleDelete().catch(() => {
        // Delete error shown via toast
      });
    } else if (confirmAction.type === "toggle") {
      handleToggleStatus().catch(() => {
        // Toggle error shown via toast
      });
    } else if (confirmAction.type === "retry-dlq") {
      handleRetryDlq().catch(() => {
        // Retry error shown via toast
      });
    } else if (confirmAction.type === "resolve-dlq") {
      handleResolveDlq().catch(() => {
        // Resolve error shown via toast
      });
    }
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/integrations/webhooks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxRetries: 50 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to retry");
      }
      const data = await res.json();
      toast.success(`Retried ${data.retried ?? 0} deliveries`);
      await fetchLogs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------

  const activeCount = webhooks.filter((w) => w.status === "active").length;
  const failedDeliveries = logs.filter((l) => l.status === "failed").length;
  const unresolvedDlq = dlqEntries.filter((e) => !e.resolvedAt).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="dev-console-stack">
      {/* Summary Cards */}
      <section className="dev-console-grid dev-console-grid-4">
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <GlobeIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Webhooks</p>
              <p className="text-xl font-semibold text-slate-200">
                {webhooks.length}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active</p>
              <p className="text-xl font-semibold text-green-400">
                {activeCount}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Failed Deliveries</p>
              <p className="text-xl font-semibold text-red-400">
                {failedDeliveries}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Dead Letter Queue</p>
              <p className="text-xl font-semibold text-yellow-400">
                {unresolvedDlq}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-900/50 p-1">
        {(
          [
            { key: "webhooks", label: "Webhooks" },
            { key: "delivery-logs", label: "Delivery Logs" },
            { key: "dlq", label: "Dead Letter Queue" },
          ] as const
        ).map((t) => (
          <button
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-slate-700/50 text-slate-200"
                : "text-slate-400 hover:text-slate-300"
            }`}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== WEBHOOKS TAB ====== */}
      {tab === "webhooks" && (
        <div className="dev-console-panel">
          <div className="dev-console-panel-header">
            <div>
              <h2>Outbound Webhooks</h2>
              <p>
                {whLoading
                  ? "Loading..."
                  : whError
                    ? "Failed to load"
                    : `${webhooks.length} webhook${webhooks.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="dev-console-header-actions">
              <button
                className="dev-console-button dev-console-button-ghost"
                disabled={refreshing || whLoading}
                onClick={() => {
                  fetchWebhooks(true).catch(() => {
                    // Refresh error handled internally
                  });
                }}
                type="button"
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                className="dev-console-button dev-console-button-primary"
                onClick={() => {
                  setEditingWebhook(null);
                  setShowFormDialog(true);
                }}
                type="button"
              >
                <PlusIcon className="h-4 w-4" />
                Create Webhook
              </button>
            </div>
          </div>

          {whLoading && !refreshing && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-slate-400">Loading webhooks...</p>
              </div>
            </div>
          )}

          {whError && !whLoading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <p className="text-rose-400">{whError}</p>
                <button
                  className="mt-4 text-sm text-blue-400 hover:underline"
                  onClick={() => {
                    fetchWebhooks().catch(() => {
                      // Retry error handled internally
                    });
                  }}
                  type="button"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {!(whLoading || whError) && webhooks.length === 0 && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <GlobeIcon className="h-12 w-12 text-slate-600" />
                <div>
                  <p className="font-medium text-slate-300">No webhooks</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Create an outbound webhook to receive event notifications
                  </p>
                </div>
                <button
                  className="dev-console-button dev-console-button-primary mt-2"
                  onClick={() => {
                    setEditingWebhook(null);
                    setShowFormDialog(true);
                  }}
                  type="button"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create Your First Webhook
                </button>
              </div>
            </div>
          )}

          {!(whLoading || whError) && webhooks.length > 0 && (
            <div className="-mx-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhooks.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell>
                        <span className="font-medium text-slate-200">
                          {wh.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-xs text-slate-400"
                          title={wh.url}
                        >
                          {truncateUrl(wh.url)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[160px] flex-wrap gap-1">
                          {(wh.eventTypeFilters as string[]).length === 0 ? (
                            <span className="text-xs text-slate-500">All</span>
                          ) : (
                            (wh.eventTypeFilters as string[]).map((f) => (
                              <span
                                className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                                key={f}
                              >
                                {f}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={wh.status} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            wh.consecutiveFailures > 0
                              ? "text-red-400"
                              : "text-slate-400"
                          }
                        >
                          {wh.consecutiveFailures}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {formatDate(wh.lastTriggeredAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                            onClick={() => setDetailWebhook(wh)}
                            title="View details"
                            type="button"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-900/30 hover:text-blue-400"
                            onClick={() => {
                              setEditingWebhook(wh);
                              setShowFormDialog(true);
                            }}
                            title="Edit webhook"
                            type="button"
                          >
                            <RefreshCwIcon className="h-4 w-4" />
                          </button>
                          {wh.status === "active" ? (
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-yellow-900/30 hover:text-yellow-400"
                              onClick={() =>
                                setConfirmAction({
                                  type: "toggle",
                                  id: wh.id,
                                  label: wh.name,
                                })
                              }
                              title="Pause webhook"
                              type="button"
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-green-900/30 hover:text-green-400"
                              onClick={() =>
                                setConfirmAction({
                                  type: "toggle",
                                  id: wh.id,
                                  label: wh.name,
                                })
                              }
                              title="Activate webhook"
                              type="button"
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
                            onClick={() =>
                              setConfirmAction({
                                type: "delete",
                                id: wh.id,
                                label: wh.name,
                              })
                            }
                            title="Delete webhook"
                            type="button"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ====== DELIVERY LOGS TAB ====== */}
      {tab === "delivery-logs" && (
        <div className="dev-console-panel">
          <div className="dev-console-panel-header">
            <div>
              <h2>Delivery Logs</h2>
              <p>
                {logsLoading
                  ? "Loading..."
                  : `${logsPagination.total} log${logsPagination.total === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="dev-console-header-actions">
              <button
                className="dev-console-button dev-console-button-ghost"
                disabled={logsLoading}
                onClick={() => {
                  fetchLogs().catch(() => {
                    // Refresh error handled internally
                  });
                }}
                type="button"
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <button
                className="dev-console-button dev-console-button-ghost"
                disabled={actionLoading}
                onClick={() => {
                  handleRetryFailed().catch(() => {
                    // Retry error shown via toast
                  });
                }}
                type="button"
              >
                <RotateCwIcon className="h-4 w-4" />
                Retry Failed
              </button>
            </div>
          </div>

          {logsLoading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-slate-400">
                  Loading delivery logs...
                </p>
              </div>
            </div>
          )}

          {!logsLoading && logs.length === 0 && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-3 font-medium text-slate-300">
                  No delivery logs
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Logs will appear when webhooks are triggered
                </p>
              </div>
            </div>
          )}

          {!logsLoading && logs.length > 0 && (
            <div className="-mx-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>HTTP Status</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                          {log.eventType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-300">
                          {log.entityType.replace(/_/g, " ")}
                        </span>
                        <span className="ml-1 font-mono text-xs text-slate-500">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {log.attemptNumber}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${
                            log.httpResponseStatus &&
                            log.httpResponseStatus >= 200 &&
                            log.httpResponseStatus < 300
                              ? "text-green-400"
                              : log.httpResponseStatus
                                ? "text-red-400"
                                : "text-slate-500"
                          }`}
                        >
                          {log.httpResponseStatus ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="max-w-[200px] truncate text-xs text-slate-500">
                          {log.errorMessage ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {logsPagination.hasMore && (
                <div className="flex justify-center py-3">
                  <button
                    className="text-sm text-blue-400 hover:underline"
                    onClick={() => {
                      fetchLogs().catch(() => {
                        // Pagination fetch error handled internally
                      });
                    }}
                    type="button"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====== DLQ TAB ====== */}
      {tab === "dlq" && (
        <div className="dev-console-panel">
          <div className="dev-console-panel-header">
            <div>
              <h2>Dead Letter Queue</h2>
              <p>
                {dlqLoading
                  ? "Loading..."
                  : `${dlqPagination.total} entr${dlqPagination.total === 1 ? "y" : "ies"}`}
              </p>
            </div>
            <div className="dev-console-header-actions">
              <button
                className="dev-console-button dev-console-button-ghost"
                disabled={dlqLoading}
                onClick={() => {
                  fetchDlq().catch(() => {
                    // Refresh error handled internally
                  });
                }}
                type="button"
              >
                <RefreshCwIcon
                  className={`h-4 w-4 ${dlqLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {dlqLoading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-slate-400">Loading DLQ entries...</p>
              </div>
            </div>
          )}

          {!dlqLoading && dlqEntries.length === 0 && (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="text-center">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-3 font-medium text-slate-300">
                  Dead letter queue is empty
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Permanently failed deliveries will appear here
                </p>
              </div>
            </div>
          )}

          {!dlqLoading && dlqEntries.length > 0 && (
            <div className="-mx-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Failure Reason</TableHead>
                    <TableHead>Moved to DLQ</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dlqEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                          {entry.eventType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-300">
                          {entry.entityType.replace(/_/g, " ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="max-w-[150px] truncate text-xs text-slate-400">
                          {entry.webhook?.name ?? entry.webhookId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {entry.attemptCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="max-w-[200px] truncate text-xs text-slate-500">
                          {entry.failureReason ?? "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {formatDate(entry.movedToDlqAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-900/30 hover:text-blue-400"
                            onClick={() =>
                              setConfirmAction({
                                type: "retry-dlq",
                                id: entry.id,
                                label: entry.webhook?.name ?? "entry",
                              })
                            }
                            title="Retry delivery"
                            type="button"
                          >
                            <RotateCwIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-green-900/30 hover:text-green-400"
                            onClick={() =>
                              setConfirmAction({
                                type: "resolve-dlq",
                                id: entry.id,
                                label: entry.webhook?.name ?? "entry",
                              })
                            }
                            title="Mark as resolved"
                            type="button"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Info Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>About Webhooks</h2>
            <p>Outbound webhook delivery and monitoring</p>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
          <div>
            <p className="mb-2 font-medium text-slate-300">Operations</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-green-400">Create</span> - Register a new
                webhook endpoint
              </li>
              <li>
                <span className="text-blue-400">Edit</span> - Update URL,
                filters, or retry settings
              </li>
              <li>
                <span className="text-yellow-400">Pause/Resume</span> - Toggle
                webhook delivery
              </li>
              <li>
                <span className="text-red-400">Delete</span> - Remove the
                webhook permanently
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Delivery</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Automatic retry with exponential backoff</li>
              <li>HMAC signature verification on payloads</li>
              <li>Auto-disable after consecutive failures</li>
              <li>Dead Letter Queue for manual review</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Status Lifecycle</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-green-400">Active</span> - Receiving
                events
              </li>
              <li>
                <span className="text-slate-400">Inactive</span> - Paused
                manually
              </li>
              <li>
                <span className="text-red-400">Disabled</span> - Auto-disabled
                after failures
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <WebhookFormDialog
        editing={editingWebhook}
        onClose={() => {
          setShowFormDialog(false);
          setEditingWebhook(null);
        }}
        onSaved={() => {
          fetchWebhooks(true).catch(() => {
            // Refresh error handled internally
          });
        }}
        open={showFormDialog}
      />

      <WebhookDetailDialog
        onClose={() => setDetailWebhook(null)}
        open={detailWebhook !== null}
        webhook={detailWebhook}
      />

      <ConfirmDialog
        confirmLabel={
          confirmAction?.type === "delete"
            ? "Delete Webhook"
            : confirmAction?.type === "toggle"
              ? "Confirm"
              : confirmAction?.type === "retry-dlq"
                ? "Retry Delivery"
                : "Resolve Entry"
        }
        confirmVariant={confirmAction?.type === "delete" ? "danger" : "primary"}
        description={
          confirmAction?.type === "delete"
            ? `Permanently delete webhook "${confirmAction.label}"? This cannot be undone.`
            : confirmAction?.type === "toggle"
              ? `Change the status of webhook "${confirmAction.label}"?`
              : confirmAction?.type === "retry-dlq"
                ? `Retry this failed delivery for "${confirmAction.label}"?`
                : "Mark this DLQ entry as resolved? It will not be retried."
        }
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        open={confirmAction !== null}
        title={
          confirmAction?.type === "delete"
            ? "Delete Webhook"
            : confirmAction?.type === "toggle"
              ? "Toggle Webhook Status"
              : confirmAction?.type === "retry-dlq"
                ? "Retry Failed Delivery"
                : "Resolve DLQ Entry"
        }
      />
    </div>
  );
};
