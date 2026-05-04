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
  CheckIcon,
  CopyIcon,
  EyeIcon,
  KeyRoundIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  RotateCwIcon,
  ShieldOffIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiKeyListResponse {
  success: boolean;
  result?: { apiKeys: ApiKey[] };
  apiKeys?: ApiKey[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Never";
  }
  return new Date(dateStr).toLocaleString();
}

function getKeyStatus(key: ApiKey): "active" | "expired" | "revoked" {
  if (key.revokedAt) {
    return "revoked";
  }
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
    return "expired";
  }
  return "active";
}

function StatusBadge({ status }: { status: "active" | "expired" | "revoked" }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Active
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Expired
        </span>
      );
    case "revoked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Revoked
        </span>
      );
    default:
      return null;
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    // Silently ignore clipboard errors (e.g. insecure context)
  });
}

// ---------------------------------------------------------------------------
// Confirmation Dialog (dev-console styled)
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
// Detail Dialog
// ---------------------------------------------------------------------------

function DetailDialog({
  open,
  apiKey,
  onClose,
}: {
  open: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
}) {
  if (!(open && apiKey)) {
    return null;
  }

  const status = getKeyStatus(apiKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-lg">
        <div className="dev-console-panel-header">
          <div>
            <h2>{apiKey.name}</h2>
            <p>API Key Details</p>
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
            <StatusBadge status={status} />

            <span className="text-slate-500">Key Prefix</span>
            <span className="font-mono text-slate-300">
              {apiKey.keyPrefix}...
              <button
                className="ml-2 text-slate-500 hover:text-slate-300"
                onClick={() => copyToClipboard(apiKey.keyPrefix)}
                title="Copy prefix"
                type="button"
              >
                <CopyIcon className="inline h-3 w-3" />
              </button>
            </span>

            <span className="text-slate-500">ID</span>
            <span className="font-mono text-xs text-slate-400">
              {apiKey.id}
            </span>

            <span className="text-slate-500">Scopes</span>
            <div className="flex flex-wrap gap-1.5">
              {apiKey.scopes.length === 0 ? (
                <span className="text-slate-500">No scopes</span>
              ) : (
                apiKey.scopes.map((scope) => (
                  <span
                    className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                    key={scope}
                  >
                    {scope}
                  </span>
                ))
              )}
            </div>

            <span className="text-slate-500">Last Used</span>
            <span className="text-slate-300">
              {formatDate(apiKey.lastUsedAt)}
            </span>

            <span className="text-slate-500">Created</span>
            <span className="text-slate-300">
              {formatDate(apiKey.createdAt)}
            </span>

            <span className="text-slate-500">Updated</span>
            <span className="text-slate-300">
              {formatDate(apiKey.updatedAt)}
            </span>

            {apiKey.expiresAt && (
              <>
                <span className="text-slate-500">Expires</span>
                <span
                  className={
                    status === "expired" ? "text-red-400" : "text-slate-300"
                  }
                >
                  {formatDate(apiKey.expiresAt)}
                </span>
              </>
            )}

            {apiKey.revokedAt && (
              <>
                <span className="text-slate-500">Revoked</span>
                <span className="text-slate-400">
                  {formatDate(apiKey.revokedAt)}
                </span>
              </>
            )}

            {apiKey.createdByUserId && (
              <>
                <span className="text-slate-500">Created By</span>
                <span className="font-mono text-xs text-slate-400">
                  {apiKey.createdByUserId}
                </span>
              </>
            )}
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
// New Key Dialog
// ---------------------------------------------------------------------------

const AVAILABLE_SCOPES = [
  "read:events",
  "write:events",
  "read:kitchen",
  "write:kitchen",
  "read:inventory",
  "write:inventory",
  "read:staff",
  "write:staff",
  "read:crm",
  "write:crm",
  "read:finance",
  "write:finance",
  "admin",
];

function CreateKeyDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Key name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopes: selectedScopes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || data.error || "Failed to create API key");
        return;
      }

      // The manifest command returns { result: { ... }, events: [...] }
      // Check for a plainKey in the result
      const plainKey =
        data.result?.plainKey || data.result?.key || data.plainKey || null;
      if (plainKey) {
        setCreatedPlainKey(plainKey);
      }

      toast.success(`API key "${name.trim()}" created successfully`);
      setName("");
      setSelectedScopes([]);
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setSelectedScopes([]);
    setCreatedPlainKey(null);
    onClose();
  };

  if (!open) {
    return null;
  }

  // Show the newly created key
  if (createdPlainKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="dev-console-panel mx-4 w-full max-w-lg">
          <div className="dev-console-panel-header">
            <div>
              <h2>API Key Created</h2>
              <p>Copy the key now. You will not be able to see it again.</p>
            </div>
            <button
              className="dev-console-button dev-console-button-ghost"
              onClick={handleClose}
              type="button"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 rounded-md bg-slate-900/80 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Plain Key
              </span>
              <button
                className="dev-console-button dev-console-button-ghost text-xs"
                onClick={() => {
                  copyToClipboard(createdPlainKey);
                  toast.success("Key copied to clipboard");
                }}
                type="button"
              >
                <CopyIcon className="h-3 w-3" />
                Copy
              </button>
            </div>
            <code className="block break-all font-mono text-sm text-green-400">
              {createdPlainKey}
            </code>
          </div>

          <div className="flex justify-end pt-4">
            <button
              className="dev-console-button dev-console-button-primary"
              onClick={handleClose}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-lg">
        <div className="dev-console-panel-header">
          <div>
            <h2>Create API Key</h2>
            <p>Generate a new API key with selected scopes</p>
          </div>
          <button
            className="dev-console-button dev-console-button-ghost"
            onClick={handleClose}
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
                htmlFor="api-key-name"
              >
                Key Name
              </label>
              <input
                className="dev-console-input w-full"
                id="api-key-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production API Key"
                type="text"
                value={name}
              />
            </div>

            <div>
              <span className="mb-1.5 block text-xs text-slate-400">
                Scopes
              </span>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      selectedScopes.includes(scope)
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                    }`}
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    type="button"
                  >
                    {selectedScopes.includes(scope) && (
                      <CheckIcon className="h-3 w-3" />
                    )}
                    {scope}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="dev-console-button dev-console-button-ghost"
              disabled={loading}
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="dev-console-button dev-console-button-primary"
              disabled={loading || !name.trim()}
              type="submit"
            >
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              Create Key
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rotate Key Dialog (shows new plain key after rotation)
// ---------------------------------------------------------------------------

function RotateKeyResultDialog({
  open,
  plainKey,
  keyName,
  onClose,
}: {
  open: boolean;
  plainKey: string | null;
  keyName: string;
  onClose: () => void;
}) {
  if (!(open && plainKey)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-lg">
        <div className="dev-console-panel-header">
          <div>
            <h2>Key Rotated: {keyName}</h2>
            <p>
              Copy the new key now. The old key is no longer valid and this is
              the only time the new key will be shown.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-slate-900/80 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              New Plain Key
            </span>
            <button
              className="dev-console-button dev-console-button-ghost text-xs"
              onClick={() => {
                copyToClipboard(plainKey);
                toast.success("New key copied to clipboard");
              }}
              type="button"
            >
              <CopyIcon className="h-3 w-3" />
              Copy
            </button>
          </div>
          <code className="block break-all font-mono text-sm text-green-400">
            {plainKey}
          </code>
        </div>

        <div className="flex justify-end pt-4">
          <button
            className="dev-console-button dev-console-button-primary"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export const ApiKeysClient = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [detailKey, setDetailKey] = useState<ApiKey | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "revoke" | "delete";
    key: ApiKey;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rotateResult, setRotateResult] = useState<{
    plainKey: string;
    keyName: string;
  } | null>(null);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchApiKeys = useCallback(async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await apiFetch("/api/settings/api-keys");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to fetch API keys");
      }
      const data: ApiKeyListResponse = await res.json();
      // Handle both response shapes (manifest-wrapped and direct)
      const keys = data.result?.apiKeys ?? data.apiKeys ?? data.keys ?? [];
      setApiKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setApiKeys([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys().catch(() => {
      // Initial fetch error is handled internally by fetchApiKeys
    });
  }, [fetchApiKeys]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleRevoke = async () => {
    if (!confirmAction?.key) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `/api/settings/api-keys/${confirmAction.key.id}/revoke`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to revoke key");
      }
      toast.success(`Key "${confirmAction.key.name}" revoked`);
      setConfirmAction(null);
      await fetchApiKeys(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction?.key) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(
        `/api/settings/api-keys/${confirmAction.key.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete key");
      }
      toast.success(`Key "${confirmAction.key.name}" deleted`);
      setConfirmAction(null);
      await fetchApiKeys(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete key");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRotate = async (key: ApiKey) => {
    if (key.revokedAt) {
      toast.error("Cannot rotate a revoked key");
      return;
    }
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/settings/api-keys/${key.id}/rotate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to rotate key");
      }
      const data = await res.json();
      toast.success(`Key "${key.name}" rotated`);
      if (data.plainKey) {
        setRotateResult({ plainKey: data.plainKey, keyName: key.name });
      }
      await fetchApiKeys(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate key");
    } finally {
      setActionLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  function getSubtitle(): string {
    if (loading) {
      return "Loading...";
    }
    if (error) {
      return "Failed to load keys";
    }
    return `${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"}`;
  }

  return (
    <div className="dev-console-stack">
      {/* Key List Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>API Keys</h2>
            <p>{getSubtitle()}</p>
          </div>
          <div className="dev-console-header-actions">
            <button
              className="dev-console-button dev-console-button-ghost"
              disabled={refreshing || loading}
              onClick={() => {
                fetchApiKeys(true).catch(() => {
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
              onClick={() => setShowCreateDialog(true)}
              type="button"
            >
              <PlusIcon className="h-4 w-4" />
              Create Key
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !refreshing && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Loading API keys...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-rose-400">{error}</p>
              <button
                className="mt-4 text-sm text-blue-400 hover:underline"
                onClick={() => {
                  fetchApiKeys().catch(() => {
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

        {/* Empty State */}
        {!(loading || error) && apiKeys.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <KeyRoundIcon className="h-12 w-12 text-slate-600" />
              <div>
                <p className="font-medium text-slate-300">No API keys</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create an API key to authenticate external services
                </p>
              </div>
              <button
                className="dev-console-button dev-console-button-primary mt-2"
                onClick={() => setShowCreateDialog(true)}
                type="button"
              >
                <PlusIcon className="h-4 w-4" />
                Create Your First Key
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {!(loading || error) && apiKeys.length > 0 && (
          <div className="-mx-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const status = getKeyStatus(key);
                  return (
                    <TableRow key={key.id}>
                      <TableCell>
                        <span className="font-medium text-slate-200">
                          {key.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-slate-400">
                          {key.keyPrefix}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {key.scopes.length === 0 ? (
                            <span className="text-xs text-slate-500">None</span>
                          ) : (
                            key.scopes.slice(0, 2).map((scope) => (
                              <span
                                className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                                key={scope}
                              >
                                {scope}
                              </span>
                            ))
                          )}
                          {key.scopes.length > 2 && (
                            <span className="text-xs text-slate-500">
                              +{key.scopes.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {key.lastUsedAt
                            ? formatDate(key.lastUsedAt)
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-400">
                          {formatDate(key.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                            onClick={() => setDetailKey(key)}
                            title="View details"
                            type="button"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {status !== "revoked" && (
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-900/30 hover:text-blue-400"
                              onClick={() => {
                                handleRotate(key).catch(() => {
                                  // Rotation error shown via toast
                                });
                              }}
                              title="Rotate key"
                              type="button"
                            >
                              <RotateCwIcon className="h-4 w-4" />
                            </button>
                          )}
                          {status !== "revoked" && (
                            <button
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-amber-900/30 hover:text-amber-400"
                              onClick={() =>
                                setConfirmAction({ type: "revoke", key })
                              }
                              title="Revoke key"
                              type="button"
                            >
                              <ShieldOffIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
                            onClick={() =>
                              setConfirmAction({ type: "delete", key })
                            }
                            title="Delete key"
                            type="button"
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>About API Keys</h2>
            <p>Managing authentication for external integrations</p>
          </div>
        </div>
        <div className="grid gap-4 text-sm text-slate-400 md:grid-cols-3">
          <div>
            <p className="mb-2 font-medium text-slate-300">Key Operations</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-green-400">Create</span> - Generate a new
                key with selected scopes
              </li>
              <li>
                <span className="text-blue-400">Rotate</span> - Replace the key
                value (old key stops working)
              </li>
              <li>
                <span className="text-amber-400">Revoke</span> - Disable a key
                without deleting it
              </li>
              <li>
                <span className="text-red-400">Delete</span> - Permanently
                remove the key
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Security Notes</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Plain keys are only shown once at creation or rotation</li>
              <li>Revoked keys cannot authenticate</li>
              <li>Rotate keys regularly for security</li>
              <li>Use minimal scopes for each key</li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Status Lifecycle</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-green-400">Active</span> - Key is usable
              </li>
              <li>
                <span className="text-red-400">Expired</span> - Past expiration
                date
              </li>
              <li>
                <span className="text-slate-400">Revoked</span> - Manually
                disabled
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateKeyDialog
        onClose={() => setShowCreateDialog(false)}
        onCreated={() => {
          fetchApiKeys(true).catch(() => {
            // Refresh error handled internally
          });
        }}
        open={showCreateDialog}
      />

      <DetailDialog
        apiKey={detailKey}
        onClose={() => setDetailKey(null)}
        open={detailKey !== null}
      />

      <ConfirmDialog
        confirmLabel={
          confirmAction?.type === "revoke" ? "Revoke Key" : "Delete Key"
        }
        confirmVariant={confirmAction?.type === "delete" ? "danger" : "danger"}
        description={
          confirmAction?.type === "revoke"
            ? `This will immediately disable the key "${confirmAction.key.name}". Any services using this key will lose access. This action can be undone by rotating the key.`
            : `This will permanently delete the key "${confirmAction?.key.name}". This action cannot be undone.`
        }
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === "revoke") {
            handleRevoke().catch(() => {
              // Revoke error shown via toast
            });
          } else {
            handleDelete().catch(() => {
              // Delete error shown via toast
            });
          }
        }}
        open={confirmAction !== null}
        title={
          confirmAction?.type === "revoke" ? "Revoke API Key" : "Delete API Key"
        }
      />

      <RotateKeyResultDialog
        keyName={rotateResult?.keyName ?? ""}
        onClose={() => setRotateResult(null)}
        open={rotateResult !== null}
        plainKey={rotateResult?.plainKey ?? null}
      />
    </div>
  );
};
