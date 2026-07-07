"use client";

/**
 * @module SecurityClient
 * @intent Client component for security settings — API keys and role policies
 * @domain Settings / Security
 * @tags settings, security, api-keys, role-policies, client-component
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Separator } from "@repo/design-system/components/ui/separator";
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
import { AlertCircle, Eye, Key, Loader2, Shield, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  apiKeyRevoke,
  getRolePolicy,
  listApiKeies,
  listRolePolicies,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKey {
  createdAt: string;
  createdByUserId: string | null;
  expiresAt: string | null;
  id: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  name: string;
  revokedAt: string | null;
  scopes: string[];
  updatedAt: string;
}

interface RolePolicy {
  deletedAt: string | null;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  policyType: string | null;
  tenantId: string | null;
}

interface RolePolicyDetail extends RolePolicy {}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | null): string {
  if (!value) {
    return "N/A";
  }
  return new Date(value).toLocaleString();
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

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  expired: "destructive",
  revoked: "secondary",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  revoked: "Revoked",
};

// ---------------------------------------------------------------------------
// API Key Detail Dialog
// ---------------------------------------------------------------------------

function ApiKeyDetailDialog({
  apiKey,
  open,
  onOpenChange,
}: {
  apiKey: ApiKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!apiKey) {
    return null;
  }

  const status = getKeyStatus(apiKey);

  const rows: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Name", value: apiKey.name },
    { label: "Key Prefix", value: apiKey.keyPrefix, mono: true },
    { label: "Status", value: STATUS_LABEL[status] ?? status },
    { label: "Last Used", value: formatDate(apiKey.lastUsedAt) },
    { label: "Created", value: formatDate(apiKey.createdAt) },
    { label: "Updated", value: formatDate(apiKey.updatedAt) },
  ];

  if (apiKey.expiresAt) {
    rows.splice(4, 0, {
      label: "Expires",
      value: formatDate(apiKey.expiresAt),
    });
  }
  if (apiKey.revokedAt) {
    rows.splice(3, 0, {
      label: "Revoked",
      value: formatDate(apiKey.revokedAt),
    });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Details
          </DialogTitle>
          <DialogDescription>
            Details for &quot;{apiKey.name}&quot;
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {rows.map((row) => (
            <div className="flex justify-between gap-4" key={row.label}>
              <span className="text-muted-foreground">{row.label}</span>
              <span className={row.mono ? "font-mono text-xs" : ""}>
                {row.value}
              </span>
            </div>
          ))}
          <Separator />
          <div>
            <span className="text-muted-foreground">Scopes</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {apiKey.scopes.length === 0 ? (
                <span className="text-muted-foreground text-xs italic">
                  No scopes assigned
                </span>
              ) : (
                apiKey.scopes.map((scope) => (
                  <Badge className="text-xs" key={scope} variant="outline">
                    {scope}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Role Policy Detail Dialog
// ---------------------------------------------------------------------------

function RolePolicyDetailDialog({
  policy,
  loading: policyLoading,
  open,
  onOpenChange,
}: {
  policy: RolePolicyDetail | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  function renderPolicyDetailContent() {
    if (policyLoading) {
      return (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (policy) {
      return (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{policy.name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Type</span>
            <span>{policy.policyType || "N/A"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={policy.isActive ? "default" : "secondary"}>
              {policy.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {policy.description && (
            <>
              <Separator />
              <div className="space-y-1">
                <span className="text-muted-foreground">Description</span>
                <p className="text-sm">{policy.description}</p>
              </div>
            </>
          )}
        </div>
      );
    }
    return (
      <p className="text-muted-foreground text-sm">
        Failed to load policy details.
      </p>
    );
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Policy Details
          </DialogTitle>
          <DialogDescription>
            {policy ? `Details for "${policy.name}"` : "Loading policy..."}
          </DialogDescription>
        </DialogHeader>
        {renderPolicyDetailContent()}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Revoke Confirmation Dialog
// ---------------------------------------------------------------------------

function RevokeKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onConfirm,
  revoking,
}: {
  apiKey: ApiKey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  revoking: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Revoke API Key
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this API key? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {apiKey && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm">
            <span className="font-medium">{apiKey.name}</span>
            <span className="ml-2 font-mono text-muted-foreground text-xs">
              ({apiKey.keyPrefix}...)
            </span>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={revoking} variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button disabled={revoking} onClick={onConfirm} variant="destructive">
            {revoking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Revoke Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Icon className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-muted-foreground text-sm">{title}</p>
        <p className="text-muted-foreground/75 text-xs">{description}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SecurityClient() {
  // -- Data state --
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Dialog state --
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const [policyDetail, setPolicyDetail] = useState<RolePolicyDetail | null>(
    null
  );
  const [policyDetailOpen, setPolicyDetailOpen] = useState(false);
  const [policyDetailLoading, setPolicyDetailLoading] = useState(false);

  // -- Data loading --
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysResult, policiesResult] = await Promise.all([
        listApiKeies(),
        listRolePolicies(),
      ]);

      setApiKeys(keysResult.data as unknown as ApiKey[]);
      setRolePolicies(policiesResult.data as unknown as RolePolicy[]);
    } catch {
      toast.error("Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -- Actions --
  const handleViewKey = (key: ApiKey) => {
    setSelectedKey(key);
    setDetailOpen(true);
  };

  const handleRevokeKey = (key: ApiKey) => {
    setRevokeTarget(key);
    setRevokeOpen(true);
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) {
      return;
    }
    setRevoking(true);
    try {
      await apiKeyRevoke({ id: revokeTarget.id });
      toast.success(`API key "${revokeTarget.name}" revoked.`);
      setRevokeOpen(false);
      setRevokeTarget(null);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke API key."
      );
    } finally {
      setRevoking(false);
    }
  };

  const handleViewPolicy = async (policy: RolePolicy) => {
    setPolicyDetail(policy);
    setPolicyDetailOpen(true);
    setPolicyDetailLoading(true);
    try {
      const data = await getRolePolicy(policy.id);
      setPolicyDetail((data ?? policy) as RolePolicyDetail);
    } catch {
      toast.error("Failed to load policy details.");
      setPolicyDetail(null);
    } finally {
      setPolicyDetailLoading(false);
    }
  };

  // -- Render helpers --
  function renderApiKeysContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (apiKeys.length === 0) {
      return (
        <EmptyState
          description="API keys you create will appear here."
          icon={Key}
          title="No API keys"
        />
      );
    }
    return (
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
          {apiKeys.map((apiKey) => {
            const status = getKeyStatus(apiKey);
            return (
              <TableRow key={apiKey.id}>
                <TableCell className="font-medium">{apiKey.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {apiKey.keyPrefix}...
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.scopes.length === 0 ? (
                      <span className="text-muted-foreground text-xs">
                        None
                      </span>
                    ) : (
                      apiKey.scopes.map((scope) => (
                        <Badge
                          className="text-xs"
                          key={scope}
                          variant="outline"
                        >
                          {scope}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[status]}>
                    {STATUS_LABEL[status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(apiKey.lastUsedAt)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(apiKey.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      onClick={() => handleViewKey(apiKey)}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                    {status === "active" && (
                      <Button
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRevokeKey(apiKey)}
                        size="sm"
                        variant="ghost"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  function renderRolePoliciesContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    if (rolePolicies.length === 0) {
      return (
        <EmptyState
          description="Role policies will appear here once created."
          icon={Shield}
          title="No role policies"
        />
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rolePolicies.map((policy) => (
            <TableRow key={policy.id}>
              <TableCell className="font-medium">{policy.name}</TableCell>
              <TableCell>
                {policy.policyType || (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {policy.description || (
                  <span className="text-muted-foreground italic">
                    No description
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={policy.isActive ? "default" : "secondary"}>
                  {policy.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => handleViewPolicy(policy)}
                  size="sm"
                  variant="ghost"
                >
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  // -- Render --
  return (
    <>
      <Tabs className="w-full" defaultValue="api-keys">
        <TabsList>
          <TabsTrigger className="gap-1.5" value="api-keys">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger className="gap-1.5" value="role-policies">
            <Shield className="h-4 w-4" />
            Role Policies
          </TabsTrigger>
        </TabsList>

        {/* ---- API Keys Tab ---- */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                {apiKeys.length} {apiKeys.length === 1 ? "key" : "keys"}{" "}
                configured.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">{renderApiKeysContent()}</CardContent>
          </Card>
        </TabsContent>

        {/* ---- Role Policies Tab ---- */}
        <TabsContent value="role-policies">
          <Card>
            <CardHeader>
              <CardTitle>Role Policies</CardTitle>
              <CardDescription>
                {rolePolicies.length}{" "}
                {rolePolicies.length === 1 ? "policy" : "policies"} defined.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {renderRolePoliciesContent()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Dialogs ---- */}
      <ApiKeyDetailDialog
        apiKey={selectedKey}
        onOpenChange={setDetailOpen}
        open={detailOpen}
      />

      <RevokeKeyDialog
        apiKey={revokeTarget}
        onConfirm={confirmRevoke}
        onOpenChange={setRevokeOpen}
        open={revokeOpen}
        revoking={revoking}
      />

      <RolePolicyDetailDialog
        loading={policyDetailLoading}
        onOpenChange={setPolicyDetailOpen}
        open={policyDetailOpen}
        policy={policyDetail}
      />
    </>
  );
}
