"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
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
  FilterIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  TrashIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { EmailTriggerType, EmailWorkflowRow } from "../actions";
import {
  deleteEmailWorkflow,
  getEmailWorkflows,
  TRIGGER_TYPE_LABELS,
  toggleEmailWorkflow,
} from "../actions";

export function EmailWorkflowsClient() {
  const [workflows, setWorkflows] = useState<EmailWorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<EmailWorkflowRow | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Parameters<typeof getEmailWorkflows>[0] = {};
      if (search) filters.search = search;
      if (triggerFilter !== "all")
        filters.triggerType = triggerFilter as EmailTriggerType;
      if (statusFilter === "active") filters.isActive = true;
      if (statusFilter === "inactive") filters.isActive = false;

      const data = await getEmailWorkflows(filters);
      setWorkflows(data);
    } catch (error) {
      toast.error("Failed to load email workflows", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [search, triggerFilter, statusFilter]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleToggle = async (workflow: EmailWorkflowRow) => {
    setTogglingId(workflow.id);
    try {
      await toggleEmailWorkflow(workflow.id, !workflow.isActive);
      toast.success(
        workflow.isActive ? "Workflow disabled" : "Workflow enabled"
      );
      await loadWorkflows();
    } catch (error) {
      toast.error("Failed to toggle workflow", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteEmailWorkflow(deleteTarget.id);
      toast.success("Workflow deleted");
      setDeleteTarget(null);
      await loadWorkflows();
    } catch (error) {
      toast.error("Failed to delete workflow", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = workflows.filter((w) => w.isActive).length;
  const inactiveCount = workflows.length - activeCount;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Automate email notifications based on event triggers
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/email-workflows/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-blue-100 p-2 dark:bg-blue-900/30">
              <MailIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Workflows</p>
              <p className="text-2xl font-semibold">{workflows.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-green-100 p-2 dark:bg-green-900/30">
              <ZapIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-semibold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-800/30">
              <PowerIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-2xl font-semibold">{inactiveCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows..."
            value={search}
          />
        </div>
        <Select onValueChange={setTriggerFilter} value={triggerFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Trigger Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value="event_confirmed">Event Confirmed</SelectItem>
            <SelectItem value="event_canceled">Event Canceled</SelectItem>
            <SelectItem value="event_completed">Event Completed</SelectItem>
            <SelectItem value="task_assigned">Task Assigned</SelectItem>
            <SelectItem value="task_completed">Task Completed</SelectItem>
            <SelectItem value="task_reminder">Task Reminder</SelectItem>
            <SelectItem value="shift_reminder">Shift Reminder</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="contract_signed">Contract Signed</SelectItem>
            <SelectItem value="contract_expiration">
              Contract Expiration
            </SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MailIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No email workflows</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Create automated email workflows to send notifications when events
            are confirmed, tasks completed, or on custom schedules.
          </p>
          <Button asChild className="mt-4">
            <Link href="/settings/email-workflows/new">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Workflow
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {workflows.length} workflow{workflows.length !== 1 ? "s" : ""} found
          </p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow
                    className="cursor-pointer"
                    key={workflow.id}
                    onClick={() =>
                      (window.location.href = `/settings/email-workflows/${workflow.id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        window.location.href = `/settings/email-workflows/${workflow.id}`;
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <TableCell className="font-medium">
                      {workflow.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TRIGGER_TYPE_LABELS[workflow.triggerType] ??
                          workflow.triggerType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {workflow.templateName ?? "No template"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={workflow.isActive ? "default" : "secondary"}
                      >
                        {workflow.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {workflow.lastTriggeredAt
                        ? new Date(
                            workflow.lastTriggeredAt
                          ).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          disabled={togglingId === workflow.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggle(workflow);
                          }}
                          size="sm"
                          title={workflow.isActive ? "Disable" : "Enable"}
                          variant="ghost"
                        >
                          <PowerIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          asChild
                          onClick={(e) => e.stopPropagation()}
                          size="sm"
                          variant="ghost"
                        >
                          <Link
                            href={`/settings/email-workflows/${workflow.id}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          disabled={deleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(workflow);
                          }}
                          size="sm"
                          variant="ghost"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={!!deleteTarget}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workflow?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This
              action cannot be undone. The workflow will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteTarget(null)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleting}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleting && (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
