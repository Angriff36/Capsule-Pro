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
import { Separator } from "@repo/design-system/components/ui/separator";
import { Switch } from "@repo/design-system/components/ui/switch";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertCircle,
  Bell,
  BellRing,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MailCheck,
  MailOpen,
  MailX,
  MessageSquare,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  templateId: string | null;
  customMessage: string | null;
  recipientType: string;
  recipientConfig: Record<string, unknown>;
  isActive: boolean;
  priority: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SmsLog {
  id: string;
  employee_id: string | null;
  phone_number: string;
  message: string;
  notification_type: string;
  status: "pending" | "sent" | "delivered" | "failed";
  twilio_sid: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  created_at: string;
}

interface EmailLog {
  id: string;
  tenantId: string;
  workflowId?: string;
  recipientEmail: string;
  recipientId?: string;
  recipientType?: string;
  subject: string;
  notificationType: string;
  status: "pending" | "sent" | "delivered" | "opened" | "failed" | "bounced";
  resendId?: string;
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedAt?: string;
  createdAt: string;
}

interface EmailPreference {
  notificationType: string;
  isEnabled: boolean;
  channel: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGER_TYPES = [
  { value: "task_assigned", label: "Task Assigned" },
  { value: "task_completed", label: "Task Completed" },
  { value: "task_overdue", label: "Task Overdue" },
  { value: "shift_assigned", label: "Shift Assigned" },
  { value: "shift_reminder", label: "Shift Reminder" },
  { value: "shift_changed", label: "Shift Changed" },
  { value: "clock_in_reminder", label: "Clock In Reminder" },
  { value: "clock_out_reminder", label: "Clock Out Reminder" },
  { value: "prep_list_published", label: "Prep List Published" },
  { value: "inventory_low", label: "Inventory Low" },
  { value: "custom_event", label: "Custom Event" },
] as const;

const RECIPIENT_TYPES = [
  { value: "employee", label: "Employee" },
  { value: "role_based", label: "Role Based" },
  { value: "manager", label: "Manager" },
  { value: "custom_phone", label: "Custom Phone" },
] as const;

const NOTIFICATION_CATEGORIES = [
  {
    label: "Tasks",
    types: [
      { value: "task_assigned", label: "Task Assigned" },
      { value: "task_completed", label: "Task Completed" },
      { value: "task_overdue", label: "Task Overdue" },
    ],
  },
  {
    label: "Scheduling",
    types: [
      { value: "shift_assigned", label: "Shift Assigned" },
      { value: "shift_reminder", label: "Shift Reminder" },
      { value: "shift_changed", label: "Shift Changed" },
    ],
  },
  {
    label: "Time Tracking",
    types: [
      { value: "clock_in_reminder", label: "Clock In Reminder" },
      { value: "clock_out_reminder", label: "Clock Out Reminder" },
    ],
  },
  {
    label: "Kitchen",
    types: [{ value: "prep_list_published", label: "Prep List Published" }],
  },
  {
    label: "Inventory",
    types: [{ value: "inventory_low", label: "Inventory Low" }],
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return "—";
  }
  return new Date(dateStr).toLocaleString();
}

function triggerLabel(triggerType: string): string {
  const found = TRIGGER_TYPES.find((t) => t.value === triggerType);
  return found ? found.label : triggerType;
}

function recipientLabel(recipientType: string): string {
  const found = RECIPIENT_TYPES.find((t) => t.value === recipientType);
  return found ? found.label : recipientType;
}

function smsStatusBadge(status: string) {
  switch (status) {
    case "delivered":
      return (
        <Badge className="gap-1" variant="default">
          <CheckCircle className="h-3 w-3" />
          Delivered
        </Badge>
      );
    case "sent":
      return (
        <Badge className="gap-1 bg-blue-600">
          <MessageSquare className="h-3 w-3" />
          Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge className="gap-1" variant="destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "pending":
      return (
        <Badge className="gap-1" variant="secondary">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function emailStatusBadge(status: string) {
  switch (status) {
    case "delivered":
      return (
        <Badge className="gap-1" variant="default">
          <MailCheck className="h-3 w-3" />
          Delivered
        </Badge>
      );
    case "sent":
      return (
        <Badge className="gap-1 bg-blue-600">
          <Mail className="h-3 w-3" />
          Sent
        </Badge>
      );
    case "opened":
      return (
        <Badge className="gap-1 bg-purple-600">
          <MailOpen className="h-3 w-3" />
          Opened
        </Badge>
      );
    case "bounced":
      return (
        <Badge className="gap-1" variant="destructive">
          <MailX className="h-3 w-3" />
          Bounced
        </Badge>
      );
    case "failed":
      return (
        <Badge className="gap-1" variant="destructive">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    case "pending":
      return (
        <Badge className="gap-1" variant="secondary">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  variant,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant: "destructive" | "default";
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
          <Button disabled={loading} onClick={onConfirm} variant={variant}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Rule Form Dialog
// ---------------------------------------------------------------------------

function RuleFormDialog({
  open,
  onOpenChange,
  editing,
  formName,
  formDescription,
  formTriggerType,
  formCustomMessage,
  formRecipientType,
  formIsActive,
  formPriority,
  setFormName,
  setFormDescription,
  setFormTriggerType,
  setFormCustomMessage,
  setFormRecipientType,
  setFormIsActive,
  setFormPriority,
  handleSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  formName: string;
  formDescription: string;
  formTriggerType: string;
  formCustomMessage: string;
  formRecipientType: string;
  formIsActive: string;
  formPriority: string;
  setFormName: (v: string) => void;
  setFormDescription: (v: string) => void;
  setFormTriggerType: (v: string) => void;
  setFormCustomMessage: (v: string) => void;
  setFormRecipientType: (v: string) => void;
  setFormIsActive: (v: string) => void;
  setFormPriority: (v: string) => void;
  handleSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Automation Rule" : "Create Automation Rule"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the automation rule settings."
              : "Define a new SMS automation rule for your organization."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Rule Name *</Label>
            <Input
              id="rule-name"
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Shift Reminder"
              value={formName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-description">Description</Label>
            <Input
              id="rule-description"
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description"
              value={formDescription}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-trigger">Trigger Type *</Label>
              <Select
                onValueChange={setFormTriggerType}
                value={formTriggerType}
              >
                <SelectTrigger id="rule-trigger">
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-recipient">Recipient Type</Label>
              <Select
                onValueChange={setFormRecipientType}
                value={formRecipientType}
              >
                <SelectTrigger id="rule-recipient">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-message">Custom Message *</Label>
            <Textarea
              id="rule-message"
              onChange={(e) => setFormCustomMessage(e.target.value)}
              placeholder="Enter SMS message text. Use {{name}} for dynamic fields."
              rows={3}
              value={formCustomMessage}
            />
            <p className="text-xs text-muted-foreground">
              Template merge fields: {"{{name}}"}, {"{{event}}"}, {"{{date}}"},{" "}
              {"{{time}}"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rule-active">Status</Label>
              <Select onValueChange={setFormIsActive} value={formIsActive}>
                <SelectTrigger id="rule-active">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-priority">Priority</Label>
              <Input
                id="rule-priority"
                max={1000}
                min={1}
                onChange={(e) => setFormPriority(e.target.value)}
                placeholder="100"
                type="number"
                value={formPriority}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={submitting} onClick={handleSubmit}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Automation Rules Tab
// ---------------------------------------------------------------------------

function AutomationRulesTab() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("task_assigned");
  const [formCustomMessage, setFormCustomMessage] = useState("");
  const [formRecipientType, setFormRecipientType] = useState("employee");
  const [formIsActive, setFormIsActive] = useState("true");
  const [formPriority, setFormPriority] = useState("100");

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/communications/sms/automation-rules");
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to load automation rules");
        return;
      }
      setRules(data.rules ?? []);
    } catch {
      toast.error("Failed to load automation rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const resetForm = useCallback(() => {
    setFormName("");
    setFormDescription("");
    setFormTriggerType("task_assigned");
    setFormCustomMessage("");
    setFormRecipientType("employee");
    setFormIsActive("true");
    setFormPriority("100");
    setEditing(false);
    setEditingId(null);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((rule: AutomationRule) => {
    setEditing(true);
    setEditingId(rule.id);
    setFormName(rule.name);
    setFormDescription(rule.description ?? "");
    setFormTriggerType(rule.triggerType);
    setFormCustomMessage(rule.customMessage ?? "");
    setFormRecipientType(rule.recipientType);
    setFormIsActive(String(rule.isActive));
    setFormPriority(String(rule.priority));
    setFormOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formName.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!formTriggerType) {
      toast.error("Trigger type is required");
      return;
    }
    if (!formCustomMessage.trim()) {
      toast.error("Custom message is required");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        triggerType: formTriggerType,
        triggerConfig: {},
        customMessage: formCustomMessage.trim(),
        recipientType: formRecipientType,
        recipientConfig: {},
        isActive: formIsActive === "true",
        priority: Number(formPriority) || 100,
      };

      if (editing && editingId) {
        const res = await apiFetch(
          `/api/communications/sms/automation-rules/${editingId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to update rule", {
            description: data.error || "Unknown error",
          });
          return;
        }
        toast.success("Rule updated successfully");
      } else {
        const res = await apiFetch("/api/communications/sms/automation-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to create rule", {
            description: data.error || "Unknown error",
          });
          return;
        }
        toast.success("Rule created successfully");
      }

      setFormOpen(false);
      resetForm();
      loadRules();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  }, [
    editing,
    editingId,
    formName,
    formDescription,
    formTriggerType,
    formCustomMessage,
    formRecipientType,
    formIsActive,
    formPriority,
    resetForm,
    loadRules,
  ]);

  const handleToggle = useCallback(
    async (rule: AutomationRule) => {
      setTogglingId(rule.id);
      try {
        const res = await apiFetch(
          `/api/communications/sms/automation-rules/${rule.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !rule.isActive }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to toggle rule", {
            description: data.error || "Unknown error",
          });
          return;
        }
        toast.success(rule.isActive ? "Rule deactivated" : "Rule activated");
        loadRules();
      } catch {
        toast.error("Failed to toggle rule");
      } finally {
        setTogglingId(null);
      }
    },
    [loadRules]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteId) {
      return;
    }
    setDeleting(true);
    try {
      const res = await apiFetch(
        `/api/communications/sms/automation-rules/${deleteId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to delete rule", {
          description: data.error || "Unknown error",
        });
        return;
      }
      toast.success("Rule deleted");
      setDeleteId(null);
      loadRules();
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setDeleting(false);
    }
  }, [deleteId, loadRules]);

  // Summary stats
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.isActive).length;
  const inactiveRules = totalRules - activeRules;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Total Rules</CardDescription>
            <CardTitle className="text-2xl">{totalRules}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {activeRules}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Inactive</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {inactiveRules}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Rules Table */}
      {rules.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No automation rules yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first SMS automation rule to send notifications
              automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card tone="canvas">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-48">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {triggerLabel(rule.triggerType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {recipientLabel(rule.recipientType)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.isActive ? (
                        <Badge className="gap-1" variant="default">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          disabled={togglingId === rule.id}
                          onClick={() => handleToggle(rule)}
                          size="sm"
                          variant="ghost"
                        >
                          {togglingId === rule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : rule.isActive ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => openEditForm(rule)}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteId(rule.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rule Form Dialog */}
      <RuleFormDialog
        editing={editing}
        formCustomMessage={formCustomMessage}
        formDescription={formDescription}
        formIsActive={formIsActive}
        formName={formName}
        formPriority={formPriority}
        formRecipientType={formRecipientType}
        formTriggerType={formTriggerType}
        handleSubmit={handleSubmit}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setFormOpen(open);
        }}
        open={formOpen}
        setFormCustomMessage={setFormCustomMessage}
        setFormDescription={setFormDescription}
        setFormIsActive={setFormIsActive}
        setFormName={setFormName}
        setFormPriority={setFormPriority}
        setFormRecipientType={setFormRecipientType}
        setFormTriggerType={setFormTriggerType}
        submitting={submitting}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        confirmLabel="Delete Rule"
        description="This will permanently delete this automation rule. This action cannot be undone."
        loading={deleting}
        onConfirm={handleDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
        open={deleteId !== null}
        title="Delete Automation Rule"
        variant="destructive"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SMS History Tab
// ---------------------------------------------------------------------------

function SmsHistoryTab() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");
      const res = await apiFetch(
        `/api/collaboration/notifications/sms/history?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to load SMS history");
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      toast.error("Failed to load SMS history");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Summary stats
  const totalSent = logs.length;
  const delivered = logs.filter((l) => l.status === "delivered").length;
  const failed = logs.filter((l) => l.status === "failed").length;
  const pending = logs.filter((l) => l.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{totalSent}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Delivered</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {delivered}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Failed</CardDescription>
            <CardTitle className="text-2xl text-red-600">{failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {pending}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadHistory} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* History Table */}
      {logs.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No SMS history</p>
            <p className="text-sm text-muted-foreground">
              SMS messages will appear here once automation rules begin sending
              notifications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card tone="canvas">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.phone_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.notification_type}</Badge>
                    </TableCell>
                    <TableCell>{smsStatusBadge(log.status)}</TableCell>
                    <TableCell className="max-w-64">
                      <p className="text-sm truncate">{log.message}</p>
                      {log.error_message && (
                        <p className="text-xs text-destructive truncate">
                          {log.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(log.sent_at ?? log.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SMS Preferences Tab
// ---------------------------------------------------------------------------

interface SmsPreference {
  notificationType: string;
  isEnabled: boolean;
  channel: string;
}

function SmsPreferencesTab({ employeeId }: { employeeId: string }) {
  const [preferences, setPreferences] = useState<Map<string, boolean>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [togglingType, setTogglingType] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/collaboration/notifications/sms/preferences?employeeId=${employeeId}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to load SMS preferences");
        return;
      }
      const map = new Map<string, boolean>();
      for (const pref of data.preferences as SmsPreference[]) {
        map.set(pref.notificationType, pref.isEnabled);
      }
      setPreferences(map);
    } catch {
      toast.error("Failed to load SMS preferences");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = useCallback(
    async (notificationType: string, currentEnabled: boolean) => {
      setTogglingType(notificationType);
      try {
        const res = await apiFetch(
          "/api/collaboration/notifications/sms/preferences",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId,
              notificationType,
              isEnabled: !currentEnabled,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to update preference", {
            description: data.error || "Unknown error",
          });
          return;
        }
        setPreferences((prev) => {
          const next = new Map(prev);
          next.set(notificationType, !currentEnabled);
          return next;
        });
        toast.success(
          currentEnabled
            ? `Disabled SMS for ${notificationType.replace(/_/g, " ")}`
            : `Enabled SMS for ${notificationType.replace(/_/g, " ")}`
        );
      } catch {
        toast.error("Failed to update preference");
      } finally {
        setTogglingType(null);
      }
    },
    [employeeId]
  );

  const totalTypes = NOTIFICATION_CATEGORIES.reduce(
    (sum, cat) => sum + cat.types.length,
    0
  );
  const enabledCount = Array.from(preferences.values()).filter(Boolean).length;
  const disabledCount = totalTypes - enabledCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Notification Types</CardDescription>
            <CardTitle className="text-2xl">{totalTypes}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Enabled</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {enabledCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Disabled</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {disabledCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            const allTypes = NOTIFICATION_CATEGORIES.flatMap((c) =>
              c.types.map((t) => t.value)
            );
            for (const type of allTypes) {
              if (!preferences.get(type)) {
                handleToggle(type, false);
              }
            }
          }}
          size="sm"
          variant="outline"
        >
          Enable All
        </Button>
        <Button
          onClick={() => {
            const allTypes = NOTIFICATION_CATEGORIES.flatMap((c) =>
              c.types.map((t) => t.value)
            );
            for (const type of allTypes) {
              if (preferences.get(type)) {
                handleToggle(type, true);
              }
            }
          }}
          size="sm"
          variant="outline"
        >
          Disable All
        </Button>
      </div>

      {/* Preference Groups */}
      <div className="space-y-4">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Card key={category.label} tone="canvas">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.types.map((type) => {
                const isEnabled = preferences.get(type.value) ?? true;
                return (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={type.value}
                  >
                    <div className="flex items-center gap-3">
                      <BellRing className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Receive SMS when{" "}
                          {type.label
                            .toLowerCase()
                            .replace(/^(a|an|the)\s/i, "")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={togglingType === type.value}
                      onCheckedChange={() =>
                        handleToggle(type.value, isEnabled)
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email History Tab
// ---------------------------------------------------------------------------

function EmailHistoryTab() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      params.set("limit", "100");
      const res = await apiFetch(
        `/api/collaboration/notifications/email/history?${params.toString()}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to load email history");
        return;
      }
      setLogs(data.logs ?? []);
    } catch {
      toast.error("Failed to load email history");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Summary stats
  const totalSent = logs.length;
  const delivered = logs.filter((l) => l.status === "delivered").length;
  const bounced = logs.filter((l) => l.status === "bounced").length;
  const opened = logs.filter((l) => l.status === "opened").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{totalSent}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Delivered</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {delivered}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Opened</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{opened}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Bounced</CardDescription>
            <CardTitle className="text-2xl text-red-600">{bounced}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="opened">Opened</SelectItem>
            <SelectItem value="bounced">Bounced</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadHistory} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* History Table */}
      {logs.length === 0 ? (
        <Card tone="canvas">
          <CardContent className="py-12 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No email history</p>
            <p className="text-sm text-muted-foreground">
              Email delivery logs will appear here once email notifications are
              sent.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card tone="canvas">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.recipientEmail}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="text-sm truncate">{log.subject}</p>
                      {log.errorMessage && (
                        <p className="text-xs text-destructive truncate">
                          {log.errorMessage}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.notificationType}</Badge>
                    </TableCell>
                    <TableCell>{emailStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(log.sentAt ?? log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Preferences Tab
// ---------------------------------------------------------------------------

function EmailPreferencesTab({ employeeId }: { employeeId: string }) {
  const [preferences, setPreferences] = useState<Map<string, boolean>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [togglingType, setTogglingType] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(
        `/api/collaboration/notifications/email/preferences?employeeId=${employeeId}`
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error("Failed to load email preferences");
        return;
      }
      const map = new Map<string, boolean>();
      for (const pref of data.preferences as EmailPreference[]) {
        map.set(pref.notificationType, pref.isEnabled);
      }
      setPreferences(map);
    } catch {
      toast.error("Failed to load email preferences");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = useCallback(
    async (notificationType: string, currentEnabled: boolean) => {
      setTogglingType(notificationType);
      try {
        const res = await apiFetch(
          "/api/collaboration/notifications/email/preferences",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId,
              notificationType,
              isEnabled: !currentEnabled,
            }),
          }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error("Failed to update email preference", {
            description: data.error || "Unknown error",
          });
          return;
        }
        setPreferences((prev) => {
          const next = new Map(prev);
          next.set(notificationType, !currentEnabled);
          return next;
        });
        toast.success(
          currentEnabled
            ? `Disabled email for ${notificationType.replace(/_/g, " ")}`
            : `Enabled email for ${notificationType.replace(/_/g, " ")}`
        );
      } catch {
        toast.error("Failed to update email preference");
      } finally {
        setTogglingType(null);
      }
    },
    [employeeId]
  );

  const totalTypes = NOTIFICATION_CATEGORIES.reduce(
    (sum, cat) => sum + cat.types.length,
    0
  );
  const enabledCount = Array.from(preferences.values()).filter(Boolean).length;
  const disabledCount = totalTypes - enabledCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Notification Types</CardDescription>
            <CardTitle className="text-2xl">{totalTypes}</CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Enabled</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {enabledCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card tone="canvas">
          <CardHeader className="pb-2">
            <CardDescription>Disabled</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">
              {disabledCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            const allTypes = NOTIFICATION_CATEGORIES.flatMap((c) =>
              c.types.map((t) => t.value)
            );
            for (const type of allTypes) {
              if (!preferences.get(type)) {
                handleToggle(type, false);
              }
            }
          }}
          size="sm"
          variant="outline"
        >
          Enable All
        </Button>
        <Button
          onClick={() => {
            const allTypes = NOTIFICATION_CATEGORIES.flatMap((c) =>
              c.types.map((t) => t.value)
            );
            for (const type of allTypes) {
              if (preferences.get(type)) {
                handleToggle(type, true);
              }
            }
          }}
          size="sm"
          variant="outline"
        >
          Disable All
        </Button>
      </div>

      {/* Preference Groups */}
      <div className="space-y-4">
        {NOTIFICATION_CATEGORIES.map((category) => (
          <Card key={category.label} tone="canvas">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.types.map((type) => {
                const isEnabled = preferences.get(type.value) ?? true;
                return (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={type.value}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Receive email when{" "}
                          {type.label
                            .toLowerCase()
                            .replace(/^(a|an|the)\s/i, "")}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      disabled={togglingType === type.value}
                      onCheckedChange={() =>
                        handleToggle(type.value, isEnabled)
                      }
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function NotificationsClient({ employeeId }: { employeeId: string }) {
  return (
    <>
      <Separator />
      <Tabs defaultValue="automation">
        <TabsList>
          <TabsTrigger className="gap-2" value="automation">
            <Zap className="h-4 w-4" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="preferences">
            <BellRing className="h-4 w-4" />
            SMS Preferences
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="history">
            <MessageSquare className="h-4 w-4" />
            SMS History
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="email-history">
            <Mail className="h-4 w-4" />
            Email History
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="email-preferences">
            <MailCheck className="h-4 w-4" />
            Email Preferences
          </TabsTrigger>
        </TabsList>
        <TabsContent value="automation">
          <AutomationRulesTab />
        </TabsContent>
        <TabsContent value="preferences">
          <SmsPreferencesTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="history">
          <SmsHistoryTab />
        </TabsContent>
        <TabsContent value="email-history">
          <EmailHistoryTab />
        </TabsContent>
        <TabsContent value="email-preferences">
          <EmailPreferencesTab employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </>
  );
}
