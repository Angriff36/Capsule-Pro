"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
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
  Checkbox,
  CheckboxControl,
} from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { Switch } from "@repo/design-system/components/ui/switch";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface RolePolicy {
  id: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PermissionCategory {
  name: string;
  permissions: Array<{
    name: string;
    value: string;
    description: string;
  }>;
}

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Events",
    permissions: [
      {
        name: "Create Events",
        value: "events.create",
        description: "Create new events",
      },
      { name: "Read Events", value: "events.read", description: "View events" },
      {
        name: "Update Events",
        value: "events.update",
        description: "Edit events",
      },
      {
        name: "Delete Events",
        value: "events.delete",
        description: "Delete events",
      },
    ],
  },
  {
    name: "Clients",
    permissions: [
      {
        name: "Create Clients",
        value: "clients.create",
        description: "Create new clients",
      },
      {
        name: "Read Clients",
        value: "clients.read",
        description: "View clients",
      },
      {
        name: "Update Clients",
        value: "clients.update",
        description: "Edit clients",
      },
      {
        name: "Delete Clients",
        value: "clients.delete",
        description: "Delete clients",
      },
    ],
  },
  {
    name: "Users",
    permissions: [
      {
        name: "Create Users",
        value: "users.create",
        description: "Create new users",
      },
      { name: "Read Users", value: "users.read", description: "View users" },
      {
        name: "Update Users",
        value: "users.update",
        description: "Edit users",
      },
      {
        name: "Delete Users",
        value: "users.delete",
        description: "Delete users",
      },
      {
        name: "Manage Roles",
        value: "users.manage_roles",
        description: "Change user roles",
      },
    ],
  },
  {
    name: "Inventory",
    permissions: [
      {
        name: "Create Items",
        value: "inventory.create",
        description: "Create inventory items",
      },
      {
        name: "Read Inventory",
        value: "inventory.read",
        description: "View inventory",
      },
      {
        name: "Update Inventory",
        value: "inventory.update",
        description: "Edit inventory",
      },
      {
        name: "Delete Items",
        value: "inventory.delete",
        description: "Delete items",
      },
      {
        name: "Adjust Stock",
        value: "inventory.adjust",
        description: "Adjust stock levels",
      },
    ],
  },
  {
    name: "Kitchen",
    permissions: [
      {
        name: "Create Kitchen Items",
        value: "kitchen.create",
        description: "Create dishes, recipes",
      },
      {
        name: "Read Kitchen",
        value: "kitchen.read",
        description: "View kitchen data",
      },
      {
        name: "Update Kitchen",
        value: "kitchen.update",
        description: "Edit kitchen items",
      },
      {
        name: "Delete Kitchen",
        value: "kitchen.delete",
        description: "Delete kitchen items",
      },
    ],
  },
  {
    name: "Recipes",
    permissions: [
      {
        name: "Create Recipes",
        value: "recipes.create",
        description: "Create new recipes",
      },
      {
        name: "Read Recipes",
        value: "recipes.read",
        description: "View recipes",
      },
      {
        name: "Update Recipes",
        value: "recipes.update",
        description: "Edit recipes",
      },
      {
        name: "Delete Recipes",
        value: "recipes.delete",
        description: "Delete recipes",
      },
      {
        name: "Scale Recipes",
        value: "recipes.scale",
        description: "Scale recipe quantities",
      },
    ],
  },
  {
    name: "Prep Tasks",
    permissions: [
      {
        name: "Create Tasks",
        value: "prep_tasks.create",
        description: "Create prep tasks",
      },
      {
        name: "Read Tasks",
        value: "prep_tasks.read",
        description: "View prep tasks",
      },
      {
        name: "Update Tasks",
        value: "prep_tasks.update",
        description: "Edit prep tasks",
      },
      {
        name: "Delete Tasks",
        value: "prep_tasks.delete",
        description: "Delete prep tasks",
      },
      {
        name: "Claim Tasks",
        value: "prep_tasks.claim",
        description: "Claim tasks",
      },
    ],
  },
  {
    name: "Settings",
    permissions: [
      {
        name: "Read Settings",
        value: "settings.read",
        description: "View settings",
      },
      {
        name: "Manage Settings",
        value: "settings.manage",
        description: "Edit system settings",
      },
      {
        name: "Approve AI Plans",
        value: "settings.ai_approve",
        description: "Approve AI-generated plans",
      },
    ],
  },
];

const DEFAULT_ROLES = [
  { id: "admin", name: "Admin", description: "Full system access" },
  { id: "manager", name: "Manager", description: "Management access" },
  {
    id: "kitchen_lead",
    name: "Kitchen Lead",
    description: "Kitchen management",
  },
  {
    id: "kitchen_staff",
    name: "Kitchen Staff",
    description: "Kitchen operations",
  },
  { id: "staff", name: "Staff", description: "Basic access" },
];

const RolePoliciesPage = () => {
  const [rolePolicies, setRolePolicies] = useState<RolePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<RolePolicy | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleId, setNewRoleId] = useState("");

  useEffect(() => {
    loadRolePolicies();
  }, []);

  const loadRolePolicies = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/settings/role-policies");
      if (!response.ok) {
        throw new Error("Failed to load role policies");
      }
      const data = await response.json();
      setRolePolicies(data.rolePolicies || []);
    } catch (err) {
      console.error("Failed to load role policies:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to load role policies");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    if (!(newRoleId && newRoleName)) {
      toast.error("Please select a role");
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/settings/role-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: newRoleId,
          roleName: newRoleName,
          permissions: [],
          description: "",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create role policy");
      }

      toast.success("Role policy created");
      setShowCreateDialog(false);
      setNewRoleId("");
      setNewRoleName("");
      loadRolePolicies();
    } catch (err) {
      console.error("Failed to create role policy:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to create role policy"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePermission = async (
    policy: RolePolicy,
    permission: string,
    granted: boolean
  ) => {
    const endpoint = granted ? "grant" : "revoke";

    try {
      setIsSaving(true);
      const response = await fetch(
        `/api/settings/role-policies/${policy.id}/permissions/${endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permission }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${endpoint} permission`);
      }

      const data = await response.json();

      // Update local state
      setRolePolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? data.rolePolicy : p))
      );

      if (selectedPolicy?.id === policy.id) {
        setSelectedPolicy(data.rolePolicy);
      }

      toast.success(`Permission ${granted ? "granted" : "revoked"}`);
    } catch (err) {
      console.error(`Failed to ${endpoint} permission:`, err);
      toast.error(
        err instanceof Error ? err.message : `Failed to ${endpoint} permission`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePolicy = async (
    policyId: string,
    updates: Partial<RolePolicy>
  ) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/settings/role-policies/${policyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role policy");
      }

      const data = await response.json();

      // Update local state
      setRolePolicies((prev) =>
        prev.map((p) => (p.id === policyId ? data.rolePolicy : p))
      );

      if (selectedPolicy?.id === policyId) {
        setSelectedPolicy(data.rolePolicy);
      }

      toast.success("Role policy updated");
    } catch (err) {
      console.error("Failed to update role policy:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to update role policy"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this role policy?")) {
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/settings/role-policies/${policyId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete role policy");
      }

      toast.success("Role policy deleted");
      setSelectedPolicy(null);
      loadRolePolicies();
    } catch (err) {
      console.error("Failed to delete role policy:", err);
      toast.error("Failed to delete role policy");
    } finally {
      setIsSaving(false);
    }
  };

  const isPermissionGranted = (policy: RolePolicy, permission: string) => {
    return policy.permissions.includes(permission);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role-Based Access Control
          </h1>
          <p className="text-muted-foreground">
            Manage granular permissions for each role
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={isLoading}
            onClick={loadRolePolicies}
            variant="outline"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Reload
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Alert variant="default">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Granular Permission System</AlertTitle>
        <AlertDescription>
          Define which permissions each role has. Admin role has wildcard access
          to all permissions. Custom permissions can be granted or revoked per
          role.
        </AlertDescription>
      </Alert>

      {/* Create Policy Dialog */}
      {showCreateDialog && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Create New Role Policy</CardTitle>
            <CardDescription>
              Select a role to create a custom permission policy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-select">Role</Label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                id="role-select"
                onChange={(e) => {
                  const role = DEFAULT_ROLES.find(
                    (r) => r.id === e.target.value
                  );
                  setNewRoleId(e.target.value);
                  setNewRoleName(role?.name || "");
                }}
                value={newRoleId}
              >
                <option value="">Select a role...</option>
                {DEFAULT_ROLES.filter(
                  (r) => !rolePolicies.some((p) => p.roleId === r.id)
                ).map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} - {role.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={isSaving || !newRoleId}
                onClick={handleCreatePolicy}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Create
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Role Policies List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Policy List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold">Role Policies</h2>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : rolePolicies.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No role policies found. Create one to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rolePolicies.map((policy) => (
                <Card
                  className={`cursor-pointer transition-colors ${
                    selectedPolicy?.id === policy.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  key={policy.id}
                  onClick={() => setSelectedPolicy(policy)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{policy.roleName}</p>
                          <p className="text-xs text-muted-foreground">
                            {policy.permissions.length} permissions
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {!policy.isActive && (
                      <Badge className="mt-2" variant="secondary">
                        Inactive
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Permission Editor */}
        <div className="lg:col-span-2">
          {selectedPolicy ? (
            <div className="space-y-4">
              {/* Policy Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {selectedPolicy.roleName} Permissions
                      </CardTitle>
                      <CardDescription>
                        Manage what this role can access
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="active-toggle">Active</Label>
                        <Switch
                          checked={selectedPolicy.isActive}
                          disabled={isSaving}
                          id="active-toggle"
                          onCheckedChange={(checked) =>
                            handleUpdatePolicy(selectedPolicy.id, {
                              isActive: checked,
                            })
                          }
                        />
                      </div>
                      <Button
                        disabled={isSaving}
                        onClick={() => handleDeletePolicy(selectedPolicy.id)}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Permissions by Category */}
              {PERMISSION_CATEGORIES.map((category) => (
                <Card key={category.name}>
                  <CardHeader>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {category.permissions.map((permission) => {
                      const granted = isPermissionGranted(
                        selectedPolicy,
                        permission.value
                      );

                      return (
                        <div
                          className="flex items-center justify-between p-3 rounded-lg border bg-background"
                          key={permission.value}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={granted}
                              disabled={isSaving}
                              onCheckedChange={(checked) =>
                                handleTogglePermission(
                                  selectedPolicy,
                                  permission.value,
                                  !!checked
                                )
                              }
                            >
                              <CheckboxControl />
                            </Checkbox>
                            <div>
                              <p className="font-medium">{permission.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                          </div>
                          {granted && (
                            <Badge className="bg-primary" variant="default">
                              <Check className="h-3 w-3 mr-1" />
                              Granted
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a role policy to view and edit permissions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolePoliciesPage;
