"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TRIGGER_TYPES = [
  "task_assigned",
  "task_completed",
  "task_overdue",
  "shift_assigned",
  "shift_reminder",
  "shift_changed",
  "clock_in_reminder",
  "clock_out_reminder",
  "prep_list_published",
  "inventory_low",
  "custom_event",
] as const;

const RECIPIENT_TYPES = [
  "employee",
  "role_based",
  "custom_phone",
  "manager",
] as const;

function formatTriggerType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRecipientType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SmsRule {
  createdAt: string | null;
  customMessage: string | null;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  priority: number;
  recipientType: string;
  triggerType: string;
}

interface SmsRulesClientProps {
  rules: SmsRule[];
}

export function SmsRulesClient({ rules }: SmsRulesClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    triggerType: "task_assigned",
    recipientType: "employee",
    customMessage: "",
    priority: 100,
  });
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let result = rules;
    if (filter === "active") {
      result = result.filter((r) => r.isActive);
    }
    if (filter === "inactive") {
      result = result.filter((r) => !r.isActive);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.triggerType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rules, filter, search]);

  const handleToggle = async (rule: SmsRule) => {
    setTogglingId(rule.id);
    try {
      const endpoint = rule.isActive ? "deactivate" : "activate";
      const res = await fetch(`/api/smsautomationrule/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id }),
      });
      if (!res.ok) {
        throw new Error("Failed to update rule");
      }
      toast.success(
        rule.isActive
          ? `"${rule.name}" deactivated`
          : `"${rule.name}" activated`
      );
      router.refresh();
    } catch {
      toast.error("Failed to update rule");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/communications/sms/automation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          triggerType: createForm.triggerType,
          recipientType: createForm.recipientType,
          customMessage: createForm.customMessage || null,
          priority: createForm.priority,
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to create rule");
      }
      toast.success("SMS rule created");
      setCreateOpen(false);
      setCreateForm({
        name: "",
        triggerType: "task_assigned",
        recipientType: "employee",
        customMessage: "",
        priority: 100,
      });
      router.refresh();
    } catch {
      toast.error("Failed to create SMS rule");
    } finally {
      setCreating(false);
    }
  };

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[22px] border border-hairline border-dashed bg-soft-stone px-6 py-16 text-center">
        <MessageSquare className="mb-4 size-10 text-muted-foreground" />
        <h3 className="font-medium text-lg">No SMS rules</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Create your first SMS automation rule.
        </p>
        <Dialog onOpenChange={setCreateOpen} open={createOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4" size="sm">
              New SMS rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New SMS rule</DialogTitle>
            </DialogHeader>
            <CreateRuleForm
              creating={creating}
              form={createForm}
              onSubmit={handleCreate}
              setForm={setCreateForm}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules..."
            value={search}
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              className={`rounded-full px-3 py-1 font-medium text-xs transition-colors ${
                filter === f
                  ? "bg-ink text-white"
                  : "border border-hairline bg-canvas text-muted-foreground hover:bg-soft-stone"
              }`}
              key={f}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <Dialog onOpenChange={setCreateOpen} open={createOpen}>
            <DialogTrigger asChild>
              <Button size="sm">New SMS rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New SMS rule</DialogTitle>
              </DialogHeader>
              <CreateRuleForm
                creating={creating}
                form={createForm}
                onSubmit={handleCreate}
                setForm={setCreateForm}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Rules list */}
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
        <div className="grid grid-cols-[1fr_160px_120px_80px_100px] gap-2 border-hairline border-b px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          <span>Rule</span>
          <span>Trigger</span>
          <span>Recipient</span>
          <span>Priority</span>
          <span>Status</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm">
            No rules match your filters.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {filtered.map((rule) => (
              <div
                className="grid grid-cols-[1fr_160px_120px_80px_100px] items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-soft-stone"
                key={rule.id}
              >
                <div className="min-w-0">
                  <span className="font-medium">{rule.name}</span>
                  {rule.description && (
                    <p className="truncate text-muted-foreground text-xs">
                      {rule.description}
                    </p>
                  )}
                </div>
                <span className="text-muted-foreground text-xs">
                  {formatTriggerType(rule.triggerType)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatRecipientType(rule.recipientType)}
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  {rule.priority}
                </span>
                <button
                  className={`rounded-full px-2.5 py-0.5 font-medium text-[11px] uppercase tracking-wide transition-colors ${
                    rule.isActive
                      ? "bg-ink text-white"
                      : "border border-hairline bg-canvas text-muted-foreground"
                  } ${togglingId === rule.id ? "opacity-50" : ""}`}
                  disabled={togglingId === rule.id}
                  onClick={() => handleToggle(rule)}
                  type="button"
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateRuleForm({
  form,
  setForm,
  creating,
  onSubmit,
}: {
  form: {
    name: string;
    triggerType: string;
    recipientType: string;
    customMessage: string;
    priority: number;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      triggerType: string;
      recipientType: string;
      customMessage: string;
      priority: number;
    }>
  >;
  creating: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        placeholder="Rule name"
        value={form.name}
      />
      <Select
        onValueChange={(v) => setForm((f) => ({ ...f, triggerType: v }))}
        value={form.triggerType}
      >
        <SelectTrigger>
          <SelectValue placeholder="Trigger type" />
        </SelectTrigger>
        <SelectContent>
          {TRIGGER_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {formatTriggerType(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(v) => setForm((f) => ({ ...f, recipientType: v }))}
        value={form.recipientType}
      >
        <SelectTrigger>
          <SelectValue placeholder="Recipient type" />
        </SelectTrigger>
        <SelectContent>
          {RECIPIENT_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {formatRecipientType(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        onChange={(e) =>
          setForm((f) => ({ ...f, customMessage: e.target.value }))
        }
        placeholder="Custom message (optional)"
        value={form.customMessage}
      />
      <Input
        onChange={(e) =>
          setForm((f) => ({ ...f, priority: Number(e.target.value) || 100 }))
        }
        placeholder="Priority (default 100)"
        type="number"
        value={form.priority}
      />
      <Button className="w-full" disabled={creating} onClick={onSubmit}>
        {creating ? "Creating..." : "Create rule"}
      </Button>
    </div>
  );
}
