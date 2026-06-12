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
  EyeIcon,
  Loader2Icon,
  RefreshCwIcon,
  ShieldIcon,
  UserCheckIcon,
  UserMinusIcon,
  UserPlusIcon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  userDeactivate,
  userTerminate,
  userUpdateRole,
} from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Employee {
  avatar_url: string | null;
  created_at: string;
  email: string;
  employment_type: string;
  first_name: string | null;
  hire_date: string;
  hourly_rate: number | null;
  id: string;
  is_active: boolean;
  last_name: string | null;
  phone: string | null;
  role: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    return "-";
  }
  return new Date(dateStr).toLocaleDateString();
}

function getDisplayName(emp: Employee): string {
  const first = emp.first_name ?? "";
  const last = emp.last_name ?? "";
  if (first || last) {
    return `${first} ${last}`.trim();
  }
  return emp.email;
}

function getInitials(emp: Employee): string {
  const first = emp.first_name?.[0] ?? "";
  const last = emp.last_name?.[0] ?? "";
  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }
  return emp.email[0]?.toUpperCase() ?? "?";
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "bg-red-500/10 text-red-400",
    manager: "bg-blue-500/10 text-blue-400",
    staff: "bg-slate-500/10 text-slate-400",
    supervisor: "bg-purple-500/10 text-purple-400",
  };
  const colorClass = colors[role] ?? "bg-slate-500/10 text-slate-400";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 font-medium text-xs ${colorClass}`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 font-medium text-green-400 text-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-1 font-medium text-slate-400 text-xs">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Inactive
    </span>
  );
}

const ROLE_OPTIONS = ["admin", "manager", "supervisor", "staff"];

// ---------------------------------------------------------------------------
// Change Role Dialog
// ---------------------------------------------------------------------------

function ChangeRoleDialog({
  open,
  employee,
  onClose,
  onSaved,
}: {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && employee) {
      setRole(employee.role);
    }
  }, [open, employee]);

  if (!(open && employee)) {
    return null;
  }

  const handleSubmit = async () => {
    if (!role || role === employee.role) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      await userUpdateRole({ id: employee.id });

      toast.success(`${getDisplayName(employee)} role updated to ${role}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-md">
        <div className="dev-console-panel-header">
          <div>
            <h2>Change Role</h2>
            <p>
              {getDisplayName(employee)} — current: {employee.role}
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

        <div className="space-y-4">
          <div>
            <span className="mb-1.5 block text-slate-400 text-xs">
              New Role
            </span>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    role === r
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                  key={r}
                  onClick={() => setRole(r)}
                  type="button"
                >
                  {r}
                </button>
              ))}
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
            disabled={loading || role === employee.role}
            onClick={handleSubmit}
            type="button"
          >
            {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : null}
            Update Role
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Detail Dialog
// ---------------------------------------------------------------------------

function UserDetailDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}) {
  if (!(open && employee)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="dev-console-panel mx-4 w-full max-w-lg">
        <div className="dev-console-panel-header">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 font-semibold text-blue-400 text-sm">
              {getInitials(employee)}
            </div>
            <div>
              <h2>{getDisplayName(employee)}</h2>
              <p>{employee.email}</p>
            </div>
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
            <StatusBadge isActive={employee.is_active} />

            <span className="text-slate-500">Role</span>
            <RoleBadge role={employee.role} />

            <span className="text-slate-500">Email</span>
            <span className="text-slate-300">{employee.email}</span>

            <span className="text-slate-500">Phone</span>
            <span className="text-slate-300">
              {employee.phone ?? "Not set"}
            </span>

            <span className="text-slate-500">Employment Type</span>
            <span className="text-slate-300">
              {employee.employment_type?.replace(/_/g, " ") ?? "N/A"}
            </span>

            <span className="text-slate-500">Hourly Rate</span>
            <span className="text-slate-300">
              {employee.hourly_rate
                ? `$${Number(employee.hourly_rate).toFixed(2)}`
                : "Not set"}
            </span>

            <span className="text-slate-500">Hire Date</span>
            <span className="text-slate-300">
              {formatDate(employee.hire_date)}
            </span>

            <span className="text-slate-500">ID</span>
            <span className="font-mono text-slate-400 text-xs">
              {employee.id}
            </span>

            <span className="text-slate-500">Created</span>
            <span className="text-slate-300">
              {formatDate(employee.created_at)}
            </span>

            <span className="text-slate-500">Updated</span>
            <span className="text-slate-300">
              {formatDate(employee.updated_at)}
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
// Confirm Dialog (reused from webhooks pattern)
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
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
            className="dev-console-button !bg-red-600 hover:!bg-red-500"
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
// Main Client Component
// ---------------------------------------------------------------------------

export const UsersClient = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Dialog state
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [roleDialogEmployee, setRoleDialogEmployee] = useState<Employee | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "terminate";
    employee: Employee;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchEmployees = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filterActive === "active") {
          params.set("isActive", "true");
        }
        // Note: inactive filtering handled client-side since API only supports
        // isActive=true filter

        const res = await apiFetch(
          `/api/staff/employees${params.toString() ? `?${params}` : ""}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch employees");
        }
        const data = await res.json();
        setEmployees(data.employees ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setEmployees([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filterActive]
  );

  useEffect(() => {
    fetchEmployees().catch(() => {
      // Initial fetch error handled internally
    });
  }, [fetchEmployees]);

  // -------------------------------------------------------------------------
  // Filtered employees
  // -------------------------------------------------------------------------

  const filteredEmployees =
    filterActive === "active"
      ? employees.filter((e) => e.is_active)
      : filterActive === "inactive"
        ? employees.filter((e) => !e.is_active)
        : employees;

  const activeCount = employees.filter((e) => e.is_active).length;
  const inactiveCount = employees.filter((e) => !e.is_active).length;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleDeactivate = async () => {
    if (!confirmAction?.employee) {
      return;
    }
    setActionLoading(true);
    try {
      await userDeactivate({ userId: confirmAction.employee.id });
      toast.success(`${getDisplayName(confirmAction.employee)} deactivated`);
      setConfirmAction(null);
      await fetchEmployees(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminate = async () => {
    if (!confirmAction?.employee) {
      return;
    }
    setActionLoading(true);
    try {
      await userTerminate({ userId: confirmAction.employee.id });
      toast.success(`${getDisplayName(confirmAction.employee)} terminated`);
      setConfirmAction(null);
      await fetchEmployees(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to terminate");
    } finally {
      setActionLoading(false);
    }
  };

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
              <UserPlusIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Users</p>
              <p className="font-semibold text-slate-200 text-xl">
                {employees.length}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <UserCheckIcon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Active</p>
              <p className="font-semibold text-green-400 text-xl">
                {activeCount}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-500/10">
              <UserMinusIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Inactive</p>
              <p className="font-semibold text-slate-400 text-xl">
                {inactiveCount}
              </p>
            </div>
          </div>
        </div>
        <div className="dev-console-panel">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <ShieldIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Admins</p>
              <p className="font-semibold text-purple-400 text-xl">
                {employees.filter((e) => e.role === "admin").length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Users List Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>Employee Directory</h2>
            <p>
              {loading
                ? "Loading..."
                : error
                  ? "Failed to load"
                  : `${filteredEmployees.length} user${filteredEmployees.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="dev-console-header-actions">
            <div className="flex items-center gap-1 rounded-lg bg-slate-900/50 p-1">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button
                  className={`rounded-md px-3 py-1.5 font-medium text-xs transition-colors ${
                    filterActive === f
                      ? "bg-slate-700/50 text-slate-200"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                  key={f}
                  onClick={() => setFilterActive(f)}
                  type="button"
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              className="dev-console-button dev-console-button-ghost"
              disabled={refreshing || loading}
              onClick={() => {
                fetchEmployees(true).catch(() => {
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
          </div>
        </div>

        {loading && !refreshing && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2Icon className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-slate-400 text-sm">Loading users...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="text-center">
              <p className="text-rose-400">{error}</p>
              <button
                className="mt-4 text-blue-400 text-sm hover:underline"
                onClick={() => {
                  fetchEmployees().catch(() => {
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

        {!(loading || error) && filteredEmployees.length === 0 && (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <UserXIcon className="h-12 w-12 text-slate-600" />
              <div>
                <p className="font-medium text-slate-300">No users found</p>
                <p className="mt-1 text-slate-500 text-sm">
                  {filterActive === "all"
                    ? "Users will appear here once added to the system"
                    : `No ${filterActive} users match the filter`}
                </p>
              </div>
            </div>
          </div>
        )}

        {!(loading || error) && filteredEmployees.length > 0 && (
          <div className="-mx-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hired</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 font-semibold text-blue-400 text-xs">
                          {getInitials(emp)}
                        </div>
                        <span className="font-medium text-slate-200">
                          {getDisplayName(emp)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-400 text-sm">
                        {emp.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={emp.role} />
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-400 text-xs">
                        {emp.employment_type?.replace(/_/g, " ") ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={emp.is_active} />
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-400 text-xs">
                        {formatDate(emp.hire_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
                          onClick={() => setDetailEmployee(emp)}
                          title="View details"
                          type="button"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {emp.is_active && (
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-purple-900/30 hover:text-purple-400"
                            onClick={() => setRoleDialogEmployee(emp)}
                            title="Change role"
                            type="button"
                          >
                            <ShieldIcon className="h-4 w-4" />
                          </button>
                        )}
                        {emp.is_active && (
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-yellow-900/30 hover:text-yellow-400"
                            onClick={() =>
                              setConfirmAction({
                                type: "deactivate",
                                employee: emp,
                              })
                            }
                            title="Deactivate user"
                            type="button"
                          >
                            <UserMinusIcon className="h-4 w-4" />
                          </button>
                        )}
                        {emp.is_active && (
                          <button
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
                            onClick={() =>
                              setConfirmAction({
                                type: "terminate",
                                employee: emp,
                              })
                            }
                            title="Terminate user"
                            type="button"
                          >
                            <UserXIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="dev-console-panel">
        <div className="dev-console-panel-header">
          <div>
            <h2>About User Management</h2>
            <p>Employee directory and access controls</p>
          </div>
        </div>
        <div className="grid gap-4 text-slate-400 text-sm md:grid-cols-3">
          <div>
            <p className="mb-2 font-medium text-slate-300">Roles</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-red-400">Admin</span> - Full system access
              </li>
              <li>
                <span className="text-blue-400">Manager</span> - Operational
                management
              </li>
              <li>
                <span className="text-purple-400">Supervisor</span> - Team
                oversight
              </li>
              <li>
                <span className="text-slate-400">Staff</span> - Standard access
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Actions</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <span className="text-purple-400">Change Role</span> - Update
                access level
              </li>
              <li>
                <span className="text-yellow-400">Deactivate</span> -
                Temporarily disable access
              </li>
              <li>
                <span className="text-red-400">Terminate</span> - Permanent
                removal
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-slate-300">Notes</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>User accounts sync with Clerk authentication</li>
              <li>Deactivated users cannot log in</li>
              <li>Role changes take effect immediately</li>
              <li>Terminated users are soft-deleted</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UserDetailDialog
        employee={detailEmployee}
        onClose={() => setDetailEmployee(null)}
        open={detailEmployee !== null}
      />

      <ChangeRoleDialog
        employee={roleDialogEmployee}
        onClose={() => setRoleDialogEmployee(null)}
        onSaved={() => {
          fetchEmployees(true).catch(() => {
            // Refresh error handled internally
          });
        }}
        open={roleDialogEmployee !== null}
      />

      <ConfirmDialog
        confirmLabel={
          confirmAction?.type === "terminate"
            ? "Terminate User"
            : "Deactivate User"
        }
        description={
          confirmAction?.type === "terminate"
            ? `Permanently terminate ${getDisplayName(confirmAction.employee)}? This action cannot be easily undone.`
            : `Deactivate ${getDisplayName(confirmAction?.employee ?? ({} as Employee))}? They will lose access immediately.`
        }
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === "terminate") {
            handleTerminate().catch(() => {
              // Terminate error shown via toast
            });
          } else {
            handleDeactivate().catch(() => {
              // Deactivate error shown via toast
            });
          }
        }}
        open={confirmAction !== null}
        title={
          confirmAction?.type === "terminate"
            ? "Terminate User"
            : "Deactivate User"
        }
      />
    </div>
  );
};
