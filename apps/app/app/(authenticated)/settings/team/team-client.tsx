/**
 * @module TeamClient
 * @intent Interactive team member management with role changes and deactivation
 * @responsibility Client component for the Settings/Team page with search, role management, and member details
 * @domain Settings
 * @tags team, settings, user-management, client-component
 * @canonical true
 */

"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Eye,
  Loader2,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
// NOTE: Keeping apiFetch for custom user management endpoints: update-role, deactivate (no generated client equivalent)
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamMemberRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = ["admin", "manager", "supervisor", "staff"] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  staff: "Staff",
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatName(member: TeamMemberRow): string {
  const name = `${member.firstName} ${member.lastName}`.trim();
  return name.length > 0 ? name : member.email;
}

function formatRole(value: string): string {
  if (ROLE_LABELS[value]) {
    return ROLE_LABELS[value];
  }
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(member: TeamMemberRow): string {
  const first = member.firstName?.[0] ?? "";
  const last = member.lastName?.[0] ?? "";
  if (first || last) {
    return `${first}${last}`.toUpperCase();
  }
  return member.email[0]?.toUpperCase() ?? "?";
}

function roleBadgeVariant(
  role: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "admin":
      return "destructive";
    case "manager":
      return "default";
    case "supervisor":
      return "secondary";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Confirm Dialog (reuses shadcn Dialog)
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
// Change Role Dialog
// ---------------------------------------------------------------------------

function ChangeRoleDialog({
  open,
  onOpenChange,
  member,
  loading,
  onConfirm,
  selectedRole,
  onRoleChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRow | null;
  loading: boolean;
  onConfirm: () => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
}) {
  if (!member) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the access level for {formatName(member)}. Current role:{" "}
            <span className="font-medium">{formatRole(member.role)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="role-select">New Role</Label>
            <Select onValueChange={onRoleChange} value={selectedRole}>
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={loading || selectedRole === member.role}
            onClick={onConfirm}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Member Detail Dialog
// ---------------------------------------------------------------------------

function MemberDetailDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRow | null;
}) {
  if (!member) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(member)}
            </div>
            <div>
              <DialogTitle>{formatName(member)}</DialogTitle>
              <DialogDescription>{member.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-[140px_1fr] gap-y-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={member.isActive ? "default" : "secondary"}>
              {member.isActive ? "Active" : "Inactive"}
            </Badge>

            <span className="text-muted-foreground">Role</span>
            <Badge variant={roleBadgeVariant(member.role)}>
              {formatRole(member.role)}
            </Badge>

            <span className="text-muted-foreground">Email</span>
            <span>{member.email}</span>

            <span className="text-muted-foreground">Joined</span>
            <span>{dateFormatter.format(new Date(member.createdAt))}</span>

            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs text-muted-foreground">
              {member.id}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

export function TeamClient({
  members: initialMembers,
}: {
  members: TeamMemberRow[];
}) {
  const [members, setMembers] = useState<TeamMemberRow[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Dialog state
  const [detailMember, setDetailMember] = useState<TeamMemberRow | null>(null);
  const [roleDialogMember, setRoleDialogMember] =
    useState<TeamMemberRow | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);

  const [deactivateMember, setDeactivateMember] =
    useState<TeamMemberRow | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Filtered members
  // -------------------------------------------------------------------------

  const filteredMembers = useMemo(() => {
    let result = members;

    if (statusFilter === "active") {
      result = result.filter((m) => m.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((m) => !m.isActive);
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.email.toLowerCase().includes(query) ||
          m.firstName.toLowerCase().includes(query) ||
          m.lastName.toLowerCase().includes(query) ||
          formatName(m).toLowerCase().includes(query) ||
          formatRole(m.role).toLowerCase().includes(query)
      );
    }

    return result;
  }, [members, search, statusFilter]);

  // -------------------------------------------------------------------------
  // Summary counts
  // -------------------------------------------------------------------------

  const totalMembers = members.length;
  const activeCount = members.filter((m) => m.isActive).length;
  const inactiveCount = members.filter((m) => !m.isActive).length;
  const adminCount = members.filter((m) => m.role === "admin").length;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleOpenRoleDialog = useCallback((member: TeamMemberRow) => {
    setRoleDialogMember(member);
    setSelectedRole(member.role);
  }, []);

  const handleChangeRole = useCallback(async () => {
    if (!roleDialogMember || selectedRole === roleDialogMember.role) {
      return;
    }

    setRoleLoading(true);
    try {
      const res = await apiFetch("/api/user/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: roleDialogMember.id,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update role");
      }

      toast.success(
        `${formatName(roleDialogMember)} role updated to ${formatRole(selectedRole)}`
      );

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.id === roleDialogMember.id ? { ...m, role: selectedRole } : m
        )
      );

      setRoleDialogMember(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setRoleLoading(false);
    }
  }, [roleDialogMember, selectedRole]);

  const handleDeactivate = useCallback(async () => {
    if (!deactivateMember) {
      return;
    }

    setDeactivateLoading(true);
    try {
      const res = await apiFetch("/api/user/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deactivateMember.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to deactivate user");
      }

      toast.success(`${formatName(deactivateMember)} has been deactivated`);

      // Optimistic update
      setMembers((prev) =>
        prev.map((m) =>
          m.id === deactivateMember.id ? { ...m, isActive: false } : m
        )
      );

      setDeactivateMember(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deactivate user"
      );
    } finally {
      setDeactivateLoading(false);
    }
  }, [deactivateMember]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Total Members</CardDescription>
            </div>
            <CardTitle className="text-2xl">{totalMembers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <CardDescription>Active</CardDescription>
            </div>
            <CardTitle className="text-2xl text-green-600">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <CardDescription>Inactive</CardDescription>
            </div>
            <CardTitle className="text-2xl text-muted-foreground">
              {inactiveCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <CardDescription>Admins</CardDescription>
            </div>
            <CardTitle className="text-2xl text-destructive">
              {adminCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            value={search}
          />
        </div>
        <Select
          onValueChange={(v) =>
            setStatusFilter(v as "all" | "active" | "inactive")
          }
          value={statusFilter}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Member Table */}
      {filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Team members will appear here once they are added."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {filteredMembers.length}{" "}
              {filteredMembers.length === 1 ? "member" : "members"}
              {search || statusFilter !== "all"
                ? " matching filters"
                : " on this account"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {getInitials(member)}
                        </div>
                        <span className="font-medium">
                          {formatName(member)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(member.role)}>
                        {formatRole(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.isActive ? "default" : "secondary"}
                      >
                        {member.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dateFormatter.format(new Date(member.createdAt))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          onClick={() => setDetailMember(member)}
                          size="sm"
                          title="View details"
                          variant="ghost"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {member.isActive && (
                          <Button
                            onClick={() => handleOpenRoleDialog(member)}
                            size="sm"
                            title="Change role"
                            variant="ghost"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                        )}
                        {member.isActive && (
                          <Button
                            onClick={() => setDeactivateMember(member)}
                            size="sm"
                            title="Deactivate member"
                            variant="ghost"
                          >
                            <UserMinus className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <MemberDetailDialog
        member={detailMember}
        onOpenChange={(open) => {
          if (!open) setDetailMember(null);
        }}
        open={detailMember !== null}
      />

      <ChangeRoleDialog
        loading={roleLoading}
        member={roleDialogMember}
        onConfirm={handleChangeRole}
        onOpenChange={(open) => {
          if (!open) setRoleDialogMember(null);
        }}
        onRoleChange={setSelectedRole}
        open={roleDialogMember !== null}
        selectedRole={selectedRole}
      />

      <ConfirmDialog
        confirmLabel="Deactivate Member"
        description={`Are you sure you want to deactivate ${deactivateMember ? formatName(deactivateMember) : "this member"}? They will lose access immediately. This action can be reversed by an admin.`}
        loading={deactivateLoading}
        onConfirm={handleDeactivate}
        onOpenChange={(open) => {
          if (!open) setDeactivateMember(null);
        }}
        open={deactivateMember !== null}
        title="Deactivate Team Member"
      />
    </div>
  );
}
