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
import { Mail, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const TRIGGER_TYPES = [
  "event_confirmed",
  "event_canceled",
  "event_completed",
  "task_assigned",
  "task_completed",
  "task_reminder",
  "shift_reminder",
  "proposal_sent",
  "contract_signed",
  "contract_expiration",
  "custom",
] as const;

function formatTriggerType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface WorkflowTemplate {
  deletedAt: string | null;
  id: string;
  name: string;
}

interface Workflow {
  createdAt: string;
  emailTemplate: WorkflowTemplate | null;
  id: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  name: string;
  triggerType: string;
}

// Props type for the client component

interface EmailWorkflowsClientProps {
  workflows: Workflow[];
}

export function EmailWorkflowsClient({ workflows }: EmailWorkflowsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    triggerType: "event_confirmed",
  });
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    let result = workflows;
    if (filter === "active") {
      result = result.filter((w) => w.isActive);
    }
    if (filter === "inactive") {
      result = result.filter((w) => !w.isActive);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.triggerType.toLowerCase().includes(q)
      );
    }
    return result;
  }, [workflows, filter, search]);

  const handleToggle = async (workflow: Workflow) => {
    setTogglingId(workflow.id);
    try {
      const res = await fetch(
        `/api/collaboration/notifications/email/workflows/${workflow.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !workflow.isActive }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to update workflow");
      }
      toast.success(
        workflow.isActive
          ? `"${workflow.name}" deactivated`
          : `"${workflow.name}" activated`
      );
      router.refresh();
    } catch {
      toast.error("Failed to update workflow");
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
      const res = await fetch(
        "/api/collaboration/notifications/email/workflows",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: createForm.name.trim(),
            triggerType: createForm.triggerType,
            isActive: true,
          }),
        }
      );
      if (!res.ok) {
        throw new Error("Failed to create workflow");
      }
      toast.success("Workflow created");
      setCreateOpen(false);
      setCreateForm({ name: "", triggerType: "event_confirmed" });
      router.refresh();
    } catch {
      toast.error("Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[22px] border border-hairline border-dashed bg-soft-stone px-6 py-16 text-center">
        <Mail className="mb-4 size-10 text-muted-foreground" />
        <h3 className="font-medium text-lg">No email workflows</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Create your first automated email workflow.
        </p>
        <Dialog onOpenChange={setCreateOpen} open={createOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4" size="sm">
              New workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New email workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Workflow name"
                value={createForm.name}
              />
              <Select
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, triggerType: v }))
                }
                value={createForm.triggerType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {formatTriggerType(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                disabled={creating}
                onClick={handleCreate}
              >
                {creating ? "Creating..." : "Create workflow"}
              </Button>
            </div>
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
            placeholder="Search workflows..."
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
              <Button size="sm">New workflow</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New email workflow</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Workflow name"
                  value={createForm.name}
                />
                <Select
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, triggerType: v }))
                  }
                  value={createForm.triggerType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {formatTriggerType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={creating}
                  onClick={handleCreate}
                >
                  {creating ? "Creating..." : "Create workflow"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Workflow list */}
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
        <div className="grid grid-cols-[1fr_180px_120px_120px_100px] gap-2 border-hairline border-b px-4 py-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          <span>Name</span>
          <span>Trigger</span>
          <span>Template</span>
          <span>Status</span>
          <span>Last triggered</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted-foreground text-sm">
            No workflows match your filters.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {filtered.map((workflow) => (
              <div
                className="grid grid-cols-[1fr_180px_120px_120px_100px] items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-soft-stone"
                key={workflow.id}
              >
                <span className="font-medium">{workflow.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatTriggerType(workflow.triggerType)}
                </span>
                <span className="text-xs">
                  {workflow.emailTemplate ? (
                    workflow.emailTemplate.deletedAt ? (
                      <span className="text-coral">Template missing</span>
                    ) : (
                      workflow.emailTemplate.name
                    )
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </span>
                <button
                  className={`rounded-full px-2.5 py-0.5 font-medium text-[11px] uppercase tracking-wide transition-colors ${
                    workflow.isActive
                      ? "bg-ink text-white"
                      : "border border-hairline bg-canvas text-muted-foreground"
                  } ${togglingId === workflow.id ? "opacity-50" : ""}`}
                  disabled={togglingId === workflow.id}
                  onClick={() => handleToggle(workflow)}
                  type="button"
                >
                  {workflow.isActive ? "Active" : "Inactive"}
                </button>
                <span className="text-muted-foreground text-xs">
                  {workflow.lastTriggeredAt
                    ? new Date(workflow.lastTriggeredAt).toLocaleDateString()
                    : "\u2014"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
