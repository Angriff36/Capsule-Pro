"use client";

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
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Types
interface ApiKeyInfo {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  isActive: boolean;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  updatedAt: string;
}

interface ApiKeyWithRawKey extends ApiKeyInfo {
  rawKey: string;
}

// Available scopes
const API_SCOPES = [
  { id: "events:read", label: "Events - Read", description: "Read event data" },
  {
    id: "events:write",
    label: "Events - Write",
    description: "Create and modify events",
  },
  {
    id: "kitchen:read",
    label: "Kitchen - Read",
    description: "Read kitchen data",
  },
  {
    id: "kitchen:write",
    label: "Kitchen - Write",
    description: "Modify kitchen data",
  },
  {
    id: "inventory:read",
    label: "Inventory - Read",
    description: "Read inventory data",
  },
  {
    id: "inventory:write",
    label: "Inventory - Write",
    description: "Modify inventory data",
  },
  { id: "staff:read", label: "Staff - Read", description: "Read staff data" },
  {
    id: "staff:write",
    label: "Staff - Write",
    description: "Modify staff data",
  },
  { id: "crm:read", label: "CRM - Read", description: "Read CRM data" },
  { id: "crm:write", label: "CRM - Write", description: "Modify CRM data" },
  {
    id: "reports:read",
    label: "Reports - Read",
    description: "Access reports",
  },
  {
    id: "webhooks:manage",
    label: "Webhooks - Manage",
    description: "Manage webhooks",
  },
  {
    id: "admin:all",
    label: "Admin - All Access",
    description: "Full administrative access",
  },
];

const SCOPE_CATEGORIES = [
  { id: "events", label: "Events", scopes: ["events:read", "events:write"] },
  {
    id: "kitchen",
    label: "Kitchen",
    scopes: ["kitchen:read", "kitchen:write"],
  },
  {
    id: "inventory",
    label: "Inventory",
    scopes: ["inventory:read", "inventory:write"],
  },
  { id: "staff", label: "Staff", scopes: ["staff:read", "staff:write"] },
  { id: "crm", label: "CRM", scopes: ["crm:read", "crm:write"] },
  { id: "reports", label: "Reports", scopes: ["reports:read"] },
  { id: "webhooks", label: "Webhooks", scopes: ["webhooks:manage"] },
  { id: "admin", label: "Admin", scopes: ["admin:all"] },
];

const ApiKeysPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expirationDays, setExpirationDays] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyWithRawKey | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyInfo | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawKey, setShowRawKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/settings/api-keys/list");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.apiKeys || []);
      } else {
        toast.error("Failed to fetch API keys");
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
      toast.error("Failed to fetch API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    if (selectedScopes.length === 0) {
      toast.error("Please select at least one scope");
      return;
    }

    setIsCreating(true);
    try {
      let expiresAt;
      if (expirationDays && expirationDays > 0) {
        expiresAt = new Date(
          Date.now() + expirationDays * 24 * 60 * 60 * 1000
        ).toISOString();
      }

      const response = await fetch("/api/settings/api-keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes,
          expiresAt,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.apiKey);
        setShowCreateDialog(false);
        setNewKeyName("");
        setSelectedScopes([]);
        setExpirationDays(null);
        toast.success("API key created successfully");
        await fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error("Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/settings/api-keys/${selectedKey.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("API key deleted successfully");
        await fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete API key");
      }
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedKey(null);
    }
  };

  const handleRevokeKey = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(
        `/api/settings/api-keys/${selectedKey.id}/revoke`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Revoked by user" }),
        }
      );

      if (response.ok) {
        toast.success("API key revoked successfully");
        await fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to revoke API key");
      }
    } catch (error) {
      console.error("Error revoking API key:", error);
      toast.error("Failed to revoke API key");
    } finally {
      setRevokeDialogOpen(false);
      setSelectedKey(null);
    }
  };

  const handleRotateKey = async () => {
    if (!selectedKey) return;

    try {
      const response = await fetch(
        `/api/settings/api-keys/${selectedKey.id}/rotate`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.apiKey);
        setRotateDialogOpen(false);
        toast.success("API key rotated successfully");
        await fetchApiKeys();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to rotate API key");
      }
    } catch (error) {
      console.error("Error rotating API key:", error);
      toast.error("Failed to rotate API key");
    } finally {
      setSelectedKey(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const toggleCategoryScopes = (categoryScopes: string[]) => {
    const allSelected = categoryScopes.every((s) => selectedScopes.includes(s));
    if (allSelected) {
      setSelectedScopes((prev) =>
        prev.filter((s) => !categoryScopes.includes(s))
      );
    } else {
      setSelectedScopes((prev) => [...new Set([...prev, ...categoryScopes])]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
            Active
          </Badge>
        );
      case "expired":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400">
            Expired
          </Badge>
        );
      case "revoked":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400">
            Revoked
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const activeKeys = apiKeys.filter((k) => k.status === "active");
  const inactiveKeys = apiKeys.filter((k) => k.status !== "active");

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for external integrations with scoped permissions and
          usage tracking.
        </p>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Create Button */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {activeKeys.length} active key{activeKeys.length !== 1 ? "s" : ""}
          </div>
          <Dialog onOpenChange={setShowCreateDialog} open={showCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for external integrations. The key will
                  only be shown once.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Production Integration"
                    value={newKeyName}
                  />
                </div>

                {/* Expiration */}
                <div className="space-y-2">
                  <Label htmlFor="expiration">Expiration (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      className="max-w-[200px]"
                      id="expiration"
                      min="1"
                      onChange={(e) =>
                        setExpirationDays(
                          e.target.value
                            ? Number.parseInt(e.target.value)
                            : null
                        )
                      }
                      placeholder="Days"
                      type="number"
                      value={expirationDays ?? ""}
                    />
                    <span className="text-sm text-muted-foreground self-center">
                      days from now
                    </span>
                  </div>
                </div>

                {/* Scopes */}
                <div className="space-y-3">
                  <Label>Permissions (Scopes)</Label>
                  <Tabs className="w-full" defaultValue="categorized">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="categorized">By Category</TabsTrigger>
                      <TabsTrigger value="all">All Scopes</TabsTrigger>
                    </TabsList>

                    <TabsContent className="space-y-4 mt-4" value="categorized">
                      {SCOPE_CATEGORIES.map((category) => {
                        const categoryScopes = API_SCOPES.filter((s) =>
                          category.scopes.includes(s.id)
                        );
                        const allSelected = category.scopes.every((s) =>
                          selectedScopes.includes(s)
                        );

                        return (
                          <div className="space-y-2" key={category.id}>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                id={`cat-${category.id}`}
                                onCheckedChange={() =>
                                  toggleCategoryScopes(category.scopes)
                                }
                              />
                              <Label
                                className="font-medium cursor-pointer"
                                htmlFor={`cat-${category.id}`}
                              >
                                {category.label}
                              </Label>
                            </div>
                            <div className="ml-6 space-y-1">
                              {categoryScopes.map((scope) => (
                                <div
                                  className="flex items-center gap-2 text-sm"
                                  key={scope.id}
                                >
                                  <Checkbox
                                    checked={selectedScopes.includes(scope.id)}
                                    id={scope.id}
                                    onCheckedChange={() =>
                                      toggleScope(scope.id)
                                    }
                                  />
                                  <Label
                                    className="cursor-pointer"
                                    htmlFor={scope.id}
                                  >
                                    {scope.label}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent className="space-y-2 mt-4" value="all">
                      {API_SCOPES.map((scope) => (
                        <div className="flex items-start gap-2" key={scope.id}>
                          <Checkbox
                            checked={selectedScopes.includes(scope.id)}
                            id={scope.id}
                            onCheckedChange={() => toggleScope(scope.id)}
                          />
                          <div className="grid gap-1 leading-none">
                            <Label
                              className="font-medium cursor-pointer"
                              htmlFor={scope.id}
                            >
                              {scope.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {scope.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={isCreating} onClick={handleCreateKey}>
                  {isCreating ? "Creating..." : "Create API Key"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* API Keys List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Loading API keys...
              </p>
            </CardContent>
          </Card>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create an API key to enable external integrations with your
                Capsule Pro workspace.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Active Keys */}
            {activeKeys.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Active Keys</h3>
                {activeKeys.map((key) => (
                  <Card className="overflow-hidden" key={key.id}>
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <Shield className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold truncate">
                                {key.name}
                              </h4>
                              {getStatusBadge(key.status)}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                              <span className="font-mono">
                                {key.keyPrefix}...
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Created: {formatDate(key.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last used: {formatDate(key.lastUsedAt)}
                              </span>
                              {key.expiresAt && (
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Expires: {formatDate(key.expiresAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {key.scopes.map((scope) => (
                                <Badge
                                  className="text-xs"
                                  key={scope}
                                  variant="outline"
                                >
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => {
                              setSelectedKey(key);
                              setRotateDialogOpen(true);
                            }}
                            size="sm"
                            title="Rotate key"
                            variant="ghost"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedKey(key);
                              setRevokeDialogOpen(true);
                            }}
                            size="sm"
                            title="Revoke key"
                            variant="ghost"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedKey(key);
                              setDeleteDialogOpen(true);
                            }}
                            size="sm"
                            title="Delete key"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Inactive Keys */}
            {inactiveKeys.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground list-none flex items-center gap-2">
                  <span className="group-open:rotate-90 transition-transform">
                    ▶
                  </span>
                  {inactiveKeys.length} inactive key
                  {inactiveKeys.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-3 space-y-3 pl-5">
                  {inactiveKeys.map((key) => (
                    <Card className="opacity-75" key={key.id} variant="outline">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-muted rounded-md">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold truncate">
                                  {key.name}
                                </h4>
                                {getStatusBadge(key.status)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                <span className="font-mono">
                                  {key.keyPrefix}...
                                </span>
                                {key.revokedAt &&
                                  ` • Revoked: ${formatDate(key.revokedAt)}`}
                                {key.expiresAt &&
                                  key.status === "expired" &&
                                  ` • Expired: ${formatDate(key.expiresAt)}`}
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => {
                              setSelectedKey(key);
                              setDeleteDialogOpen(true);
                            }}
                            size="sm"
                            title="Delete key"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* New Key Created Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setCreatedKey(null)}
        open={!!createdKey}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key Name</Label>
              <p className="font-medium">{createdKey?.name}</p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 font-mono text-xs bg-muted p-3 rounded-md relative overflow-hidden">
                  {showRawKey ? (
                    createdKey?.rawKey
                  ) : (
                    <span className="blur-sm select-none">
                      {createdKey?.rawKey}
                    </span>
                  )}
                </div>
                <Button
                  onClick={() => setShowRawKey(!showRawKey)}
                  size="icon"
                  title={showRawKey ? "Hide key" : "Show key"}
                  variant="outline"
                >
                  {showRawKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={() =>
                    createdKey && copyToClipboard(createdKey.rawKey, "rawKey")
                  }
                  size="icon"
                  title="Copy to clipboard"
                  variant="outline"
                >
                  {copiedKey === "rawKey" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Store this key securely. You
                won&apos;t be able to view it again.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>
              I&apos;ve Saved My Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedKey?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteKey}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog onOpenChange={setRevokeDialogOpen} open={revokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke &quot;{selectedKey?.name}&quot;?
              The key will immediately stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleRevokeKey}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rotate Confirmation Dialog */}
      <AlertDialog onOpenChange={setRotateDialogOpen} open={rotateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new key for &quot;{selectedKey?.name}&quot;.
              The old key will immediately stop working. You&apos;ll need to
              update any applications using this key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotateKey}>
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApiKeysPage;
