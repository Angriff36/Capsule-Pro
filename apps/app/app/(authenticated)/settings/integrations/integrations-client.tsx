"use client";

import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Settings,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom integration endpoints: GoodShuffle/Nowsta config/status/test/sync, QuickBooks export/history (no generated client equivalents)
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoodShuffleConfig {
  id: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string | null;
  syncEnabled: boolean;
  syncDirection: "one_way" | "two_way";
  conflictResolution: "convoy_wins" | "goodshuffle_wins" | "manual";
  autoSyncInterval: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoodShuffleConfigResponse {
  configured: boolean;
  config: GoodShuffleConfig | null;
}

interface GoodShuffleStatus {
  configured: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  pendingConflicts: number;
  totalSynced: number;
}

interface NowstaConfig {
  id: string;
  apiKey: string;
  apiSecret: string;
  organizationId: string | null;
  syncEnabled: boolean;
  syncDirection: "one_way" | "two_way";
  autoSyncInterval: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NowstaConfigResponse {
  configured: boolean;
  config: NowstaConfig | null;
}

interface NowstaStatus {
  configured: boolean;
  syncEnabled: boolean;
  autoSyncInterval: number;
  lastSync: {
    at: string | null;
    status: string | null;
    error: string | null;
  };
  statistics: {
    employeeMappings: {
      total: number;
      autoMapped: number;
      confirmed: number;
    };
    shiftSyncs: {
      total: number;
      synced: number;
      pending: number;
      error: number;
    };
    recentErrors: Array<{
      shiftId: string;
      error: string;
      at: string;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return "Never";
  }
  return new Date(dateStr).toLocaleString();
}

function syncStatusBadge(status: string | null | undefined) {
  if (!status) {
    return <Badge variant="outline">No sync yet</Badge>;
  }
  if (status === "success") {
    return (
      <Badge className="gap-1" variant="default">
        <CheckCircle className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  if (status === "error" || status === "failed") {
    return (
      <Badge className="gap-1" variant="destructive">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  return <Badge variant="secondary">{status}</Badge>;
}

function conflictResolutionLabel(value: string): string {
  if (value === "convoy_wins") {
    return "Convoy Wins";
  }
  if (value === "goodshuffle_wins") {
    return "GoodShuffle Wins";
  }
  return "Manual";
}

function syncDirectionLabel(value: string): string {
  return value === "one_way" ? "One Way" : "Two Way";
}

function buildConfigBody(
  fields: Record<string, unknown>,
  apiKey: string,
  apiSecret: string,
  optionalFields: Record<string, string>
): Record<string, unknown> {
  const body = { ...fields };
  if (apiKey.trim()) {
    body.apiKey = apiKey.trim();
  }
  if (apiSecret.trim()) {
    body.apiSecret = apiSecret.trim();
  }
  for (const [key, value] of Object.entries(optionalFields)) {
    if (value.trim()) {
      body[key] = value.trim();
    }
  }
  return body;
}

// ---------------------------------------------------------------------------
// Shared Sub-components
// ---------------------------------------------------------------------------

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  deleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  deleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            This will permanently remove your integration credentials and
            disable all syncing. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={deleting} onClick={onConfirm} variant="destructive">
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionsCard({
  testing,
  syncing,
  onTest,
  onSync,
}: {
  testing: boolean;
  syncing: boolean;
  onTest: () => void;
  onSync: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Actions
        </CardTitle>
        <CardDescription>
          Test your connection or trigger a manual sync
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          <Button disabled={testing} onClick={onTest} variant="outline">
            {testing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
          <Button disabled={syncing} onClick={onSync}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium${mono ? " font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function SyncEnabledBadge({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <Badge variant="default">Enabled</Badge>
  ) : (
    <Badge variant="secondary">Disabled</Badge>
  );
}

// ---------------------------------------------------------------------------
// GoodShuffle sub-components
// ---------------------------------------------------------------------------

function GoodShuffleStatusCard({
  status,
  isConfigured,
}: {
  status: GoodShuffleStatus | null;
  isConfigured: boolean;
}) {
  return (
    <Card tone="canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current GoodShuffle integration status and sync information
            </CardDescription>
          </div>
          {isConfigured ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="outline">Not Configured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sync Status</p>
              {syncStatusBadge(status.lastSyncStatus)}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">
                {formatDate(status.lastSyncAt)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Synced</p>
              <p className="text-sm font-medium">{status.totalSynced}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Conflicts</p>
              <p className="text-sm font-medium">{status.pendingConflicts}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No status information available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function GoodShuffleConfigDisplay({
  config,
  onEdit,
  onDelete,
}: {
  config: GoodShuffleConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Manage your GoodShuffle integration settings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} size="sm" variant="outline">
              Edit
            </Button>
            <Button onClick={onDelete} size="sm" variant="destructive">
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConfigField label="API Key" mono value={config.apiKey} />
          <ConfigField label="API Secret" mono value={config.apiSecret} />
          <ConfigField
            label="Webhook Secret"
            mono
            value={config.webhookSecret || "Not set"}
          />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Sync Enabled</p>
            <SyncEnabledBadge enabled={config.syncEnabled} />
          </div>
          <ConfigField
            label="Sync Direction"
            value={syncDirectionLabel(config.syncDirection)}
          />
          <ConfigField
            label="Conflict Resolution"
            value={conflictResolutionLabel(config.conflictResolution)}
          />
          <ConfigField
            label="Auto Sync Interval"
            value={`${config.autoSyncInterval} minutes`}
          />
          <ConfigField
            label="Last Updated"
            value={formatDate(config.updatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GoodShuffleConfigForm({
  editing,
  formApiKey,
  formApiSecret,
  formWebhookSecret,
  formSyncEnabled,
  formSyncDirection,
  formConflictResolution,
  formAutoSyncInterval,
  setFormApiKey,
  setFormApiSecret,
  setFormWebhookSecret,
  setFormSyncEnabled,
  setFormSyncDirection,
  setFormConflictResolution,
  setFormAutoSyncInterval,
  onSubmit,
  onCancel,
}: {
  editing: boolean;
  formApiKey: string;
  formApiSecret: string;
  formWebhookSecret: string;
  formSyncEnabled: string;
  formSyncDirection: string;
  formConflictResolution: string;
  formAutoSyncInterval: string;
  setFormApiKey: (v: string) => void;
  setFormApiSecret: (v: string) => void;
  setFormWebhookSecret: (v: string) => void;
  setFormSyncEnabled: (v: string) => void;
  setFormSyncDirection: (v: string) => void;
  setFormConflictResolution: (v: string) => void;
  setFormAutoSyncInterval: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const secretPlaceholder = editing
    ? "Leave blank to keep current"
    : "Enter API secret";
  const keyPlaceholder = editing
    ? "Leave blank to keep current"
    : "Enter API key";

  return (
    <Card tone="canvas">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          {editing
            ? "Update your credentials below. Leave API Key/Secret blank to keep the existing values."
            : "Enter your GoodShuffle API credentials to set up the integration."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gs-api-key">API Key</Label>
              <Input
                id="gs-api-key"
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={keyPlaceholder}
                type="text"
                value={formApiKey}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-api-secret">API Secret</Label>
              <Input
                id="gs-api-secret"
                onChange={(e) => setFormApiSecret(e.target.value)}
                placeholder={secretPlaceholder}
                type="password"
                value={formApiSecret}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="gs-webhook-secret">
                Webhook Secret{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="gs-webhook-secret"
                onChange={(e) => setFormWebhookSecret(e.target.value)}
                placeholder="Enter webhook secret"
                type="text"
                value={formWebhookSecret}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-sync-enabled">Sync Enabled</Label>
              <Select
                onValueChange={setFormSyncEnabled}
                value={formSyncEnabled}
              >
                <SelectTrigger id="gs-sync-enabled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-sync-direction">Sync Direction</Label>
              <Select
                onValueChange={setFormSyncDirection}
                value={formSyncDirection}
              >
                <SelectTrigger id="gs-sync-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="two_way">Two Way</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-conflict-resolution">
                Conflict Resolution
              </Label>
              <Select
                onValueChange={setFormConflictResolution}
                value={formConflictResolution}
              >
                <SelectTrigger id="gs-conflict-resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="convoy_wins">Convoy Wins</SelectItem>
                  <SelectItem value="goodshuffle_wins">
                    GoodShuffle Wins
                  </SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gs-auto-sync-interval">
                Auto Sync Interval (minutes)
              </Label>
              <Input
                id="gs-auto-sync-interval"
                max={1440}
                min={5}
                onChange={(e) => setFormAutoSyncInterval(e.target.value)}
                type="number"
                value={formAutoSyncInterval}
              />
              <p className="text-xs text-muted-foreground">
                Between 5 and 1440 minutes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSubmit}>Save Configuration</Button>
            {editing && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// GoodShuffle Integration
// ---------------------------------------------------------------------------

function GoodShuffleIntegration() {
  const [config, setConfig] = useState<GoodShuffleConfig | null>(null);
  const [status, setStatus] = useState<GoodShuffleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formApiKey, setFormApiKey] = useState("");
  const [formApiSecret, setFormApiSecret] = useState("");
  const [formWebhookSecret, setFormWebhookSecret] = useState("");
  const [formSyncEnabled, setFormSyncEnabled] = useState("true");
  const [formSyncDirection, setFormSyncDirection] = useState("one_way");
  const [formConflictResolution, setFormConflictResolution] =
    useState("convoy_wins");
  const [formAutoSyncInterval, setFormAutoSyncInterval] = useState("30");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        apiFetch("/api/integrations/goodshuffle/config"),
        apiFetch("/api/integrations/goodshuffle/status"),
      ]);
      const configData: GoodShuffleConfigResponse = await configRes.json();
      const statusData: GoodShuffleStatus = await statusRes.json();

      if (configData.configured && configData.config) {
        setConfig(configData.config);
        setFormSyncEnabled(String(configData.config.syncEnabled));
        setFormSyncDirection(configData.config.syncDirection);
        setFormConflictResolution(configData.config.conflictResolution);
        setFormAutoSyncInterval(String(configData.config.autoSyncInterval));
      } else {
        setConfig(null);
      }
      setStatus(statusData);
    } catch {
      toast.error("Failed to load GoodShuffle configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const resetForm = useCallback(() => {
    setFormApiKey("");
    setFormApiSecret("");
    setFormWebhookSecret("");
    setFormSyncEnabled("true");
    setFormSyncDirection("one_way");
    setFormConflictResolution("convoy_wins");
    setFormAutoSyncInterval("30");
    setEditing(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    const interval = Number(formAutoSyncInterval);
    if (Number.isNaN(interval) || interval < 5 || interval > 1440) {
      toast.error("Auto sync interval must be between 5 and 1440 minutes");
      return;
    }
    if (!(editing || (formApiKey.trim() && formApiSecret.trim()))) {
      toast.error("API Key and API Secret are required");
      return;
    }

    try {
      const body = buildConfigBody(
        {
          syncEnabled: formSyncEnabled === "true",
          syncDirection: formSyncDirection,
          conflictResolution: formConflictResolution,
          autoSyncInterval: interval,
        },
        formApiKey,
        formApiSecret,
        { webhookSecret: formWebhookSecret }
      );

      const res = await apiFetch("/api/integrations/goodshuffle/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to save configuration", {
          description: data.error || "Unknown error",
        });
        return;
      }

      toast.success("GoodShuffle configuration saved");
      resetForm();
      loadConfig();
    } catch {
      toast.error("Failed to save configuration");
    }
  }, [
    editing,
    formApiKey,
    formApiSecret,
    formWebhookSecret,
    formSyncEnabled,
    formSyncDirection,
    formConflictResolution,
    formAutoSyncInterval,
    resetForm,
    loadConfig,
  ]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/api/integrations/goodshuffle/test", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Connection test successful", {
          description: data.message || "GoodShuffle is reachable",
        });
      } else {
        toast.error("Connection test failed", {
          description: data.error || data.message || "Unknown error",
        });
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/integrations/goodshuffle/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Sync completed", {
          description: data.result
            ? `Processed ${data.result}`
            : "GoodShuffle sync finished",
        });
        loadConfig();
      } else {
        toast.error("Sync failed", {
          description: data.error || data.result || "Unknown error",
        });
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [loadConfig]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/api/integrations/goodshuffle/config", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("GoodShuffle configuration deleted");
        setDeleteDialogOpen(false);
        resetForm();
        loadConfig();
      } else {
        toast.error("Failed to delete configuration", {
          description: data.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Failed to delete configuration");
    } finally {
      setDeleting(false);
    }
  }, [loadConfig, resetForm]);

  const startEditing = useCallback(() => {
    if (!config) {
      return;
    }
    setFormSyncEnabled(String(config.syncEnabled));
    setFormSyncDirection(config.syncDirection);
    setFormConflictResolution(config.conflictResolution);
    setFormAutoSyncInterval(String(config.autoSyncInterval));
    setFormApiKey("");
    setFormApiSecret("");
    setFormWebhookSecret("");
    setEditing(true);
  }, [config]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConfigured = config !== null;

  return (
    <div className="space-y-6">
      <GoodShuffleStatusCard isConfigured={isConfigured} status={status} />

      {isConfigured && !editing ? (
        <GoodShuffleConfigDisplay
          config={config}
          onDelete={() => setDeleteDialogOpen(true)}
          onEdit={startEditing}
        />
      ) : (
        <GoodShuffleConfigForm
          editing={editing}
          formApiKey={formApiKey}
          formApiSecret={formApiSecret}
          formAutoSyncInterval={formAutoSyncInterval}
          formConflictResolution={formConflictResolution}
          formSyncDirection={formSyncDirection}
          formSyncEnabled={formSyncEnabled}
          formWebhookSecret={formWebhookSecret}
          onCancel={resetForm}
          onSubmit={handleSubmit}
          setFormApiKey={setFormApiKey}
          setFormApiSecret={setFormApiSecret}
          setFormAutoSyncInterval={setFormAutoSyncInterval}
          setFormConflictResolution={setFormConflictResolution}
          setFormSyncDirection={setFormSyncDirection}
          setFormSyncEnabled={setFormSyncEnabled}
          setFormWebhookSecret={setFormWebhookSecret}
        />
      )}

      {isConfigured && (
        <ActionsCard
          onSync={handleSync}
          onTest={handleTest}
          syncing={syncing}
          testing={testing}
        />
      )}

      <DeleteConfirmDialog
        deleting={deleting}
        onConfirm={handleDelete}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        title="Delete GoodShuffle Configuration"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nowsta sub-components
// ---------------------------------------------------------------------------

function NowstaStatistics({
  statistics,
}: {
  statistics: NowstaStatus["statistics"];
}) {
  return (
    <>
      <Separator />
      <div>
        <p className="mb-3 text-sm font-medium">Employee Mappings</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold">
              {statistics.employeeMappings.total}
            </p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold">
              {statistics.employeeMappings.autoMapped}
            </p>
            <p className="text-xs text-muted-foreground">Auto-Mapped</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold">
              {statistics.employeeMappings.confirmed}
            </p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </div>
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium">Shift Syncs</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold">{statistics.shiftSyncs.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold text-green-600">
              {statistics.shiftSyncs.synced}
            </p>
            <p className="text-xs text-muted-foreground">Synced</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold text-yellow-600">
              {statistics.shiftSyncs.pending}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-2xl font-bold text-red-600">
              {statistics.shiftSyncs.error}
            </p>
            <p className="text-xs text-muted-foreground">Errors</p>
          </div>
        </div>
      </div>
      {statistics.recentErrors.length > 0 && (
        <NowstaRecentErrors errors={statistics.recentErrors} />
      )}
    </>
  );
}

function NowstaRecentErrors({
  errors,
}: {
  errors: NowstaStatus["statistics"]["recentErrors"];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-destructive">Recent Errors</p>
      <div className="space-y-2">
        {errors.map((err, idx) => (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3"
            key={`nowsta-err-${err.shiftId}-${idx}`}
          >
            <p className="text-sm font-medium">Shift: {err.shiftId}</p>
            <p className="text-sm text-muted-foreground">{err.error}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(err.at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NowstaStatusCard({
  status,
  isConfigured,
}: {
  status: NowstaStatus | null;
  isConfigured: boolean;
}) {
  return (
    <Card tone="canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Current Nowsta integration status and sync information
            </CardDescription>
          </div>
          {isConfigured ? (
            <Badge variant="default">Connected</Badge>
          ) : (
            <Badge variant="outline">Not Configured</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {status ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Sync Status</p>
                {syncStatusBadge(status.lastSync.status)}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Sync</p>
                <p className="text-sm font-medium">
                  {formatDate(status.lastSync.at)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Auto Sync Interval
                </p>
                <p className="text-sm font-medium">
                  {status.autoSyncInterval} minutes
                </p>
              </div>
            </div>

            {status.lastSync.error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  {status.lastSync.error}
                </p>
              </div>
            )}

            {isConfigured && status.statistics && (
              <NowstaStatistics statistics={status.statistics} />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No status information available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function NowstaConfigDisplay({
  config,
  onEdit,
  onDelete,
}: {
  config: NowstaConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>
              Manage your Nowsta integration settings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={onEdit} size="sm" variant="outline">
              Edit
            </Button>
            <Button onClick={onDelete} size="sm" variant="destructive">
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <ConfigField label="API Key" mono value={config.apiKey} />
          <ConfigField label="API Secret" mono value={config.apiSecret} />
          <ConfigField
            label="Organization ID"
            mono
            value={config.organizationId || "Not set"}
          />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Sync Enabled</p>
            <SyncEnabledBadge enabled={config.syncEnabled} />
          </div>
          <ConfigField
            label="Sync Direction"
            value={syncDirectionLabel(config.syncDirection)}
          />
          <ConfigField
            label="Auto Sync Interval"
            value={`${config.autoSyncInterval} minutes`}
          />
          <ConfigField
            label="Last Updated"
            value={formatDate(config.updatedAt)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function NowstaConfigForm({
  editing,
  formApiKey,
  formApiSecret,
  formOrganizationId,
  formSyncEnabled,
  formSyncDirection,
  formAutoSyncInterval,
  setFormApiKey,
  setFormApiSecret,
  setFormOrganizationId,
  setFormSyncEnabled,
  setFormSyncDirection,
  setFormAutoSyncInterval,
  onSubmit,
  onCancel,
}: {
  editing: boolean;
  formApiKey: string;
  formApiSecret: string;
  formOrganizationId: string;
  formSyncEnabled: string;
  formSyncDirection: string;
  formAutoSyncInterval: string;
  setFormApiKey: (v: string) => void;
  setFormApiSecret: (v: string) => void;
  setFormOrganizationId: (v: string) => void;
  setFormSyncEnabled: (v: string) => void;
  setFormSyncDirection: (v: string) => void;
  setFormAutoSyncInterval: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const secretPlaceholder = editing
    ? "Leave blank to keep current"
    : "Enter API secret";
  const keyPlaceholder = editing
    ? "Leave blank to keep current"
    : "Enter API key";

  return (
    <Card tone="canvas">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuration
        </CardTitle>
        <CardDescription>
          {editing
            ? "Update your credentials below. Leave API Key/Secret blank to keep the existing values."
            : "Enter your Nowsta API credentials to set up the integration."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nw-api-key">API Key</Label>
              <Input
                id="nw-api-key"
                onChange={(e) => setFormApiKey(e.target.value)}
                placeholder={keyPlaceholder}
                type="text"
                value={formApiKey}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw-api-secret">API Secret</Label>
              <Input
                id="nw-api-secret"
                onChange={(e) => setFormApiSecret(e.target.value)}
                placeholder={secretPlaceholder}
                type="password"
                value={formApiSecret}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nw-org-id">
                Organization ID{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="nw-org-id"
                onChange={(e) => setFormOrganizationId(e.target.value)}
                placeholder="Enter organization ID"
                type="text"
                value={formOrganizationId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw-sync-enabled">Sync Enabled</Label>
              <Select
                onValueChange={setFormSyncEnabled}
                value={formSyncEnabled}
              >
                <SelectTrigger id="nw-sync-enabled">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw-sync-direction">Sync Direction</Label>
              <Select
                onValueChange={setFormSyncDirection}
                value={formSyncDirection}
              >
                <SelectTrigger id="nw-sync-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_way">One Way</SelectItem>
                  <SelectItem value="two_way">Two Way</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nw-auto-sync-interval">
                Auto Sync Interval (minutes)
              </Label>
              <Input
                id="nw-auto-sync-interval"
                max={1440}
                min={5}
                onChange={(e) => setFormAutoSyncInterval(e.target.value)}
                type="number"
                value={formAutoSyncInterval}
              />
              <p className="text-xs text-muted-foreground">
                Between 5 and 1440 minutes
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSubmit}>Save Configuration</Button>
            {editing && (
              <Button onClick={onCancel} variant="outline">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Nowsta Integration
// ---------------------------------------------------------------------------

function NowstaIntegration() {
  const [config, setConfig] = useState<NowstaConfig | null>(null);
  const [status, setStatus] = useState<NowstaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formApiKey, setFormApiKey] = useState("");
  const [formApiSecret, setFormApiSecret] = useState("");
  const [formOrganizationId, setFormOrganizationId] = useState("");
  const [formSyncEnabled, setFormSyncEnabled] = useState("true");
  const [formSyncDirection, setFormSyncDirection] = useState("one_way");
  const [formAutoSyncInterval, setFormAutoSyncInterval] = useState("30");

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, statusRes] = await Promise.all([
        apiFetch("/api/integrations/nowsta/config"),
        apiFetch("/api/integrations/nowsta/status"),
      ]);
      const configData: NowstaConfigResponse = await configRes.json();
      const statusData: NowstaStatus = await statusRes.json();

      if (configData.configured && configData.config) {
        setConfig(configData.config);
        setFormSyncEnabled(String(configData.config.syncEnabled));
        setFormSyncDirection(configData.config.syncDirection);
        setFormAutoSyncInterval(String(configData.config.autoSyncInterval));
      } else {
        setConfig(null);
      }
      setStatus(statusData);
    } catch {
      toast.error("Failed to load Nowsta configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const resetForm = useCallback(() => {
    setFormApiKey("");
    setFormApiSecret("");
    setFormOrganizationId("");
    setFormSyncEnabled("true");
    setFormSyncDirection("one_way");
    setFormAutoSyncInterval("30");
    setEditing(false);
  }, []);

  const startEditing = useCallback(() => {
    if (!config) {
      return;
    }
    setFormSyncEnabled(String(config.syncEnabled));
    setFormSyncDirection(config.syncDirection);
    setFormAutoSyncInterval(String(config.autoSyncInterval));
    setFormApiKey("");
    setFormApiSecret("");
    setFormOrganizationId(config.organizationId || "");
    setEditing(true);
  }, [config]);

  const handleSubmit = useCallback(async () => {
    const interval = Number(formAutoSyncInterval);
    if (Number.isNaN(interval) || interval < 5 || interval > 1440) {
      toast.error("Auto sync interval must be between 5 and 1440 minutes");
      return;
    }
    if (!(editing || (formApiKey.trim() && formApiSecret.trim()))) {
      toast.error("API Key and API Secret are required");
      return;
    }

    try {
      const body = buildConfigBody(
        {
          syncEnabled: formSyncEnabled === "true",
          syncDirection: formSyncDirection,
          autoSyncInterval: interval,
        },
        formApiKey,
        formApiSecret,
        { organizationId: formOrganizationId }
      );

      const res = await apiFetch("/api/integrations/nowsta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to save configuration", {
          description: data.error || "Unknown error",
        });
        return;
      }

      toast.success("Nowsta configuration saved");
      resetForm();
      loadConfig();
    } catch {
      toast.error("Failed to save configuration");
    }
  }, [
    editing,
    formApiKey,
    formApiSecret,
    formOrganizationId,
    formSyncEnabled,
    formSyncDirection,
    formAutoSyncInterval,
    resetForm,
    loadConfig,
  ]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/api/integrations/nowsta/test", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Connection test successful", {
          description: data.message || "Nowsta is reachable",
        });
      } else {
        toast.error("Connection test failed", {
          description: data.error || data.message || "Unknown error",
        });
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTesting(false);
    }
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await apiFetch("/api/integrations/nowsta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        toast.success("Sync completed", {
          description: data.result
            ? `Processed ${data.result}`
            : "Nowsta sync finished",
        });
        loadConfig();
      } else {
        toast.error("Sync failed", {
          description: data.error || data.result || "Unknown error",
        });
      }
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [loadConfig]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/api/integrations/nowsta/config", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Nowsta configuration deleted");
        setDeleteDialogOpen(false);
        resetForm();
        loadConfig();
      } else {
        toast.error("Failed to delete configuration", {
          description: data.error || "Unknown error",
        });
      }
    } catch {
      toast.error("Failed to delete configuration");
    } finally {
      setDeleting(false);
    }
  }, [loadConfig, resetForm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConfigured = config !== null;

  return (
    <div className="space-y-6">
      <NowstaStatusCard isConfigured={isConfigured} status={status} />

      {isConfigured && !editing ? (
        <NowstaConfigDisplay
          config={config}
          onDelete={() => setDeleteDialogOpen(true)}
          onEdit={startEditing}
        />
      ) : (
        <NowstaConfigForm
          editing={editing}
          formApiKey={formApiKey}
          formApiSecret={formApiSecret}
          formAutoSyncInterval={formAutoSyncInterval}
          formOrganizationId={formOrganizationId}
          formSyncDirection={formSyncDirection}
          formSyncEnabled={formSyncEnabled}
          onCancel={resetForm}
          onSubmit={handleSubmit}
          setFormApiKey={setFormApiKey}
          setFormApiSecret={setFormApiSecret}
          setFormAutoSyncInterval={setFormAutoSyncInterval}
          setFormOrganizationId={setFormOrganizationId}
          setFormSyncDirection={setFormSyncDirection}
          setFormSyncEnabled={setFormSyncEnabled}
        />
      )}

      {isConfigured && (
        <ActionsCard
          onSync={handleSync}
          onTest={handleTest}
          syncing={syncing}
          testing={testing}
        />
      )}

      <DeleteConfirmDialog
        deleting={deleting}
        onConfirm={handleDelete}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        title="Delete Nowsta Configuration"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuickBooks Integration
// ---------------------------------------------------------------------------

interface ExportResult {
  filename: string;
  format: string;
  recordCount: number;
  totalAmount: number;
  fileUrl: string;
}

interface ExportHistoryEntry {
  id: string;
  type: string;
  format: string;
  recordCount: number;
  totalAmount: number;
  filename: string;
  exportedAt: string;
}

function ExportSection({
  title,
  description,
  children,
  open,
  onToggle,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card tone="canvas">
      <CardHeader className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {open ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function QuickBooksIntegration() {
  const [billsOpen, setBillsOpen] = useState(false);
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);

  const [billsStartDate, setBillsStartDate] = useState("");
  const [billsEndDate, setBillsEndDate] = useState("");
  const [billsFormat, setBillsFormat] = useState("qbOnlineCsv");
  const [billsExporting, setBillsExporting] = useState(false);

  const [invoicesStartDate, setInvoicesStartDate] = useState("");
  const [invoicesEndDate, setInvoicesEndDate] = useState("");
  const [invoicesFormat, setInvoicesFormat] = useState("qbOnlineCsv");
  const [invoicesExporting, setInvoicesExporting] = useState(false);

  const [payrollPeriodId, setPayrollPeriodId] = useState("");
  const [payrollFormat, setPayrollFormat] = useState("qbOnlineCsv");
  const [payrollExporting, setPayrollExporting] = useState(false);

  const [lastResult, setLastResult] = useState<ExportResult | null>(null);
  const [history, setHistory] = useState<ExportHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch("/api/integrations/quickbooks/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.exports ?? []);
      }
    } catch {
      // Silently fail — history is supplementary
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleExport = useCallback(
    async (
      endpoint: string,
      body: Record<string, unknown>,
      setExporting: (v: boolean) => void
    ) => {
      setExporting(true);
      try {
        const res = await apiFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error("Export failed", {
            description: data.error || "Unknown error",
          });
          return;
        }

        const result: ExportResult = {
          filename: data.filename || "export.csv",
          format: data.format || body.format || "qbOnlineCsv",
          recordCount: data.recordCount ?? 0,
          totalAmount: data.totalAmount ?? 0,
          fileUrl: data.fileUrl || "",
        };

        setLastResult(result);
        toast.success("Export completed", {
          description: `${result.recordCount} records exported`,
        });

        if (result.fileUrl) {
          const link = document.createElement("a");
          link.href = result.fileUrl;
          link.download = result.filename;
          link.click();
        }

        loadHistory();
      } catch {
        toast.error("Export failed");
      } finally {
        setExporting(false);
      }
    },
    [loadHistory]
  );

  const handleBillsExport = useCallback(() => {
    if (!(billsStartDate && billsEndDate)) {
      toast.error("Start date and end date are required");
      return;
    }
    handleExport(
      "/api/inventory/purchase-orders/export/quickbooks",
      {
        startDate: billsStartDate,
        endDate: billsEndDate,
        format: billsFormat,
      },
      setBillsExporting
    );
  }, [billsStartDate, billsEndDate, billsFormat, handleExport]);

  const handleInvoicesExport = useCallback(() => {
    if (!(invoicesStartDate && invoicesEndDate)) {
      toast.error("Start date and end date are required");
      return;
    }
    handleExport(
      "/api/events/export/quickbooks",
      {
        startDate: invoicesStartDate,
        endDate: invoicesEndDate,
        format: invoicesFormat,
      },
      setInvoicesExporting
    );
  }, [invoicesStartDate, invoicesEndDate, invoicesFormat, handleExport]);

  const handlePayrollExport = useCallback(() => {
    if (!payrollPeriodId.trim()) {
      toast.error("Period ID is required");
      return;
    }
    handleExport(
      "/api/payroll/export/quickbooks",
      { periodId: payrollPeriodId.trim(), format: payrollFormat },
      setPayrollExporting
    );
  }, [payrollPeriodId, payrollFormat, handleExport]);

  const handleRedownload = useCallback(() => {
    if (!lastResult?.fileUrl) {
      return;
    }
    const link = document.createElement("a");
    link.href = lastResult.fileUrl;
    link.download = lastResult.filename;
    link.click();
  }, [lastResult]);

  const formatLabel = (fmt: string) => {
    if (fmt === "iif") return "IIF (QuickBooks Desktop)";
    return "CSV (QuickBooks Online)";
  };

  return (
    <div className="space-y-6">
      <Card tone="canvas">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            QuickBooks File Export
          </CardTitle>
          <CardDescription>
            Export bills, invoices, and payroll data as CSV or IIF files for
            import into QuickBooks Desktop or QuickBooks Online. This is an
            export-only integration — no live connection or sync is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Bills (POs)</p>
              <p className="text-xs text-muted-foreground">
                Export purchase orders
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Invoices</p>
              <p className="text-xs text-muted-foreground">
                Export event invoices
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Payroll</p>
              <p className="text-xs text-muted-foreground">
                Export payroll periods
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExportSection
        description="Export purchase orders as bills for QuickBooks"
        onToggle={() => setBillsOpen((v) => !v)}
        open={billsOpen}
        title="Bills (Purchase Orders)"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qb-bills-start">Start Date</Label>
              <DatePicker
                id="qb-bills-start"
                onChange={(e) => setBillsStartDate(e.target.value)}
                value={billsStartDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-bills-end">End Date</Label>
              <DatePicker
                id="qb-bills-end"
                onChange={(e) => setBillsEndDate(e.target.value)}
                value={billsEndDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-bills-format">Format</Label>
              <Select onValueChange={setBillsFormat} value={billsFormat}>
                <SelectTrigger id="qb-bills-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qbOnlineCsv">
                    CSV (QuickBooks Online)
                  </SelectItem>
                  <SelectItem value="iif">IIF (QuickBooks Desktop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={billsExporting} onClick={handleBillsExport}>
            {billsExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Bills
          </Button>
        </div>
      </ExportSection>

      <ExportSection
        description="Export event invoices for QuickBooks"
        onToggle={() => setInvoicesOpen((v) => !v)}
        open={invoicesOpen}
        title="Invoices (Events)"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qb-inv-start">Start Date</Label>
              <DatePicker
                id="qb-inv-start"
                onChange={(e) => setInvoicesStartDate(e.target.value)}
                value={invoicesStartDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-inv-end">End Date</Label>
              <DatePicker
                id="qb-inv-end"
                onChange={(e) => setInvoicesEndDate(e.target.value)}
                value={invoicesEndDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-inv-format">Format</Label>
              <Select onValueChange={setInvoicesFormat} value={invoicesFormat}>
                <SelectTrigger id="qb-inv-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qbOnlineCsv">
                    CSV (QuickBooks Online)
                  </SelectItem>
                  <SelectItem value="iif">IIF (QuickBooks Desktop)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={invoicesExporting} onClick={handleInvoicesExport}>
            {invoicesExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Invoices
          </Button>
        </div>
      </ExportSection>

      <ExportSection
        description="Export payroll data for QuickBooks"
        onToggle={() => setPayrollOpen((v) => !v)}
        open={payrollOpen}
        title="Payroll"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qb-pr-period">Period ID</Label>
              <Input
                id="qb-pr-period"
                onChange={(e) => setPayrollPeriodId(e.target.value)}
                placeholder="Enter payroll period ID"
                value={payrollPeriodId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qb-pr-format">Format</Label>
              <Select onValueChange={setPayrollFormat} value={payrollFormat}>
                <SelectTrigger id="qb-pr-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qbOnlineCsv">
                    CSV (QuickBooks Online)
                  </SelectItem>
                  <SelectItem value="qbxml">
                    QBXML (QuickBooks Desktop)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button disabled={payrollExporting} onClick={handlePayrollExport}>
            {payrollExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Payroll
          </Button>
        </div>
      </ExportSection>

      {lastResult && (
        <Card tone="canvas">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Last Export Result
            </CardTitle>
            <CardDescription>
              Your most recent QuickBooks export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Filename</p>
                <p className="text-sm font-medium">{lastResult.filename}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Format</p>
                <p className="text-sm font-medium">
                  {formatLabel(lastResult.format)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Records</p>
                <p className="text-sm font-medium">{lastResult.recordCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-sm font-medium">
                  ${lastResult.totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleRedownload} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card tone="canvas">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>Recent QuickBooks file exports</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No exports yet. Use the sections above to generate your first
              export.
            </p>
          ) : (
            <ResearchTable
              caption={`${history.length} exports`}
              rows={history.map((entry) => ({
                id: entry.id,
                title: (
                  <div>
                    <div>{entry.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.recordCount} records
                    </div>
                  </div>
                ),
                pills: (
                  <>
                    <Badge variant="secondary">
                      {formatLabel(entry.format)}
                    </Badge>
                    <span className="font-medium">
                      ${entry.totalAmount.toLocaleString()}
                    </span>
                  </>
                ),
                meta: (
                  <div>
                    <div className="font-mono text-xs">{entry.filename}</div>
                    <div>{formatDate(entry.exportedAt)}</div>
                  </div>
                ),
              }))}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function IntegrationsClient() {
  return (
    <Tabs defaultValue="goodshuffle">
      <TabsList>
        <TabsTrigger value="goodshuffle">GoodShuffle</TabsTrigger>
        <TabsTrigger value="nowsta">Nowsta</TabsTrigger>
        <TabsTrigger value="quickbooks">QuickBooks</TabsTrigger>
      </TabsList>
      <TabsContent value="goodshuffle">
        <GoodShuffleIntegration />
      </TabsContent>
      <TabsContent value="nowsta">
        <NowstaIntegration />
      </TabsContent>
      <TabsContent value="quickbooks">
        <QuickBooksIntegration />
      </TabsContent>
    </Tabs>
  );
}
