"use client";

import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { executeCommand } from "@/app/lib/manifest-client";
import {
  listPrepTaskPlanWorkflows,
  prepTaskPlanWorkflowCreate,
} from "@/app/lib/manifest-client.generated";

interface Workflow {
  approvedAt: string | null;
  approvedBy: string | null;
  approvedCount: number;
  approvedTaskIds: string | null;
  completedAt: string | null;
  constraintOutcomes: string | null;
  createdAt: string;
  currentStep: number;
  errors: string | null;
  eventId: string;
  generatedCount: number;
  generatedTasks: string | null;
  generationOptions: string | null;
  id: string;
  idempotencyKey: string;
  instantiatedCount: number;
  instantiatedTaskIds: string | null;
  rejectedTaskIds: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewedTasks: string | null;
  scheduledWindows: string | null;
  startedAt: string | null;
  status: string;
  tenantId: string;
  totalSteps: number;
  updatedAt: string;
  warnings: string | null;
}

interface InitialMetrics {
  approved: number;
  approving: number;
  avgTasks: number;
  cancelled: number;
  completed: number;
  created: number;
  failed: number;
  generating: number;
  reviewing: number;
  total: number;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode }> =
  {
    created: {
      label: "Created",
      icon: <Clock className="mr-1 size-3" />,
    },
    generating: {
      label: "Generating",
      icon: <Loader2 className="mr-1 size-3 animate-spin" />,
    },
    generation_completed: {
      label: "Generation Complete",
      icon: <CheckCircle className="mr-1 size-3 text-cyan-600" />,
    },
    reviewing: {
      label: "Reviewing",
      icon: <Eye className="mr-1 size-3" />,
    },
    review_completed: {
      label: "Review Complete",
      icon: <CheckCircle className="mr-1 size-3 text-cyan-600" />,
    },
    approving: {
      label: "Approving",
      icon: <ShieldCheck className="mr-1 size-3" />,
    },
    approved: {
      label: "Approved",
      icon: <CheckCircle className="mr-1 size-3 text-green-600" />,
    },
    rejected: {
      label: "Rejected",
      icon: <XCircle className="mr-1 size-3 text-red-600" />,
    },
    instantiating: {
      label: "Instantiating",
      icon: <Loader2 className="mr-1 size-3 animate-spin" />,
    },
    instantiation_completed: {
      label: "Instantiated",
      icon: <CheckCircle className="mr-1 size-3 text-cyan-600" />,
    },
    scheduling: {
      label: "Scheduling",
      icon: <Loader2 className="mr-1 size-3 animate-spin" />,
    },
    completed: {
      label: "Completed",
      icon: <CheckCircle className="mr-1 size-3 text-green-600" />,
    },
    failed: {
      label: "Failed",
      icon: <AlertTriangle className="mr-1 size-3 text-red-600" />,
    },
    cancelled: {
      label: "Cancelled",
      icon: <XCircle className="mr-1 size-3 text-muted-foreground" />,
    },
  };

const STATUS_ORDER = [
  "created",
  "generating",
  "reviewing",
  "approving",
  "instantiating",
  "scheduling",
  "completed",
] as const;

function getStepIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number]);
  return idx === -1 ? 0 : idx;
}

function truncateUuid(uuid: string): string {
  if (uuid.length <= 12) {
    return uuid;
  }
  return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "--";
  }
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface WorkflowsClientProps {
  initialMetrics: InitialMetrics;
}

export function WorkflowsClient({ initialMetrics }: WorkflowsClientProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialMetrics.total);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    workflow: Workflow;
    action: string;
    label: string;
  } | null>(null);

  const [form, setForm] = useState({
    eventId: "",
    idempotencyKey: "",
    generationOptions: "",
  });

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Record<string, string | number> = {
        page,
        limit: 25,
      };
      if (statusFilter !== "all") {
        query.status = statusFilter;
      }
      if (searchQuery) {
        query.search = searchQuery;
      }

      const result = await listPrepTaskPlanWorkflows(query);
      setWorkflows(result.data as unknown as Workflow[]);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load workflows"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleCreate = async () => {
    try {
      const body: Record<string, unknown> = {
        eventId: form.eventId,
        idempotencyKey: form.idempotencyKey,
      };
      if (form.generationOptions.trim()) {
        try {
          body.generationOptions = JSON.parse(form.generationOptions);
        } catch {
          toast.error("Generation options must be valid JSON");
          return;
        }
      }

      await prepTaskPlanWorkflowCreate(body);
      toast.success("Workflow created");
      setCreateOpen(false);
      setForm({ eventId: "", idempotencyKey: "", generationOptions: "" });
      await loadWorkflows();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create workflow"
      );
    }
  };

  const executeAction = async (
    workflowId: string,
    command: string,
    successLabel: string
  ) => {
    setActioning(workflowId);
    try {
      await executeCommand("PrepTaskPlanWorkflow", command, { id: workflowId });
      toast.success(successLabel);
      setConfirmAction(null);
      await loadWorkflows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioning(null);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmAction) {
      return;
    }
    executeAction(
      confirmAction.workflow.id,
      confirmAction.action,
      confirmAction.label
    );
  };

  const isTerminal = (status: string) =>
    ["completed", "failed", "cancelled", "rejected"].includes(status);

  const getAvailableActions = (workflow: Workflow) => {
    const actions: { action: string; label: string; variant: string }[] = [];

    if (
      workflow.status === "reviewing" ||
      workflow.status === "review_completed"
    ) {
      actions.push({
        action: "approve-plan",
        label: "Approve Plan",
        variant: "default",
      });
      actions.push({
        action: "reject-plan",
        label: "Reject Plan",
        variant: "destructive",
      });
      actions.push({
        action: "quick-approve",
        label: "Quick Approve",
        variant: "outline",
      });
    }

    if (workflow.status === "failed") {
      actions.push({
        action: "retry",
        label: "Retry",
        variant: "default",
      });
    }

    if (!isTerminal(workflow.status) && workflow.status !== "created") {
      actions.push({
        action: "cancel",
        label: "Cancel",
        variant: "destructive",
      });
    }

    return actions;
  };

  const PAGE_SIZE = 25;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-10"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by event ID..."
              value={searchInput}
            />
          </div>
          <Select
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="reviewing">Reviewing</SelectItem>
              <SelectItem value="approving">Approving</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadWorkflows} size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 size-4" />
            New Workflow
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
          No prep task plan workflows found. Create your first workflow to get
          started.
        </div>
      )}

      {!isLoading && workflows.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid grid-cols-[1fr_130px_120px_80px_80px_110px_80px] gap-3 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <span>Event</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Tasks</span>
            <span>Approved</span>
            <span>Created</span>
            <span className="text-right">Expand</span>
          </div>
          {workflows.map((workflow) => {
            const statusCfg = STATUS_CONFIG[workflow.status] ?? {
              label: workflow.status,
              icon: null,
            };
            const isExpanded = expandedId === workflow.id;
            const progress =
              workflow.totalSteps > 0
                ? Math.round((workflow.currentStep / workflow.totalSteps) * 100)
                : 0;

            return (
              <div key={workflow.id}>
                <button
                  className="grid w-full grid-cols-[1fr_130px_120px_80px_80px_110px_80px] gap-3 border-hairline border-b px-5 py-4 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/30"
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium font-mono text-xs">
                      {truncateUuid(workflow.eventId)}
                    </p>
                    <p className="truncate text-muted-foreground text-xs">
                      {workflow.idempotencyKey}
                    </p>
                  </div>
                  <StatusPill>
                    {statusCfg.icon}
                    {statusCfg.label}
                  </StatusPill>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="whitespace-nowrap text-muted-foreground text-xs">
                      {workflow.currentStep}/{workflow.totalSteps}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {workflow.generatedCount}
                  </span>
                  <span className="text-muted-foreground">
                    {workflow.approvedCount}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(workflow.createdAt)}
                  </span>
                  <div className="flex items-center justify-end">
                    {isExpanded ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-5 border-hairline border-b bg-muted/20 px-5 py-5">
                    {/* Step progress */}
                    <div>
                      <h4 className="mb-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                        Workflow Progress
                      </h4>
                      <div className="flex items-center gap-1">
                        {STATUS_ORDER.map((step, idx) => {
                          const currentIdx = getStepIndex(workflow.status);
                          const isComplete = idx < currentIdx;
                          const isCurrent = step === workflow.status;
                          const isFailed =
                            workflow.status === "failed" && isCurrent;
                          const isCancelled =
                            workflow.status === "cancelled" && isCurrent;

                          return (
                            <div className="flex items-center gap-1" key={step}>
                              <div
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs ${
                                  isComplete
                                    ? "bg-primary/10 text-primary"
                                    : isCurrent && isFailed
                                      ? "bg-destructive/10 text-destructive"
                                      : isCurrent && isCancelled
                                        ? "bg-muted text-muted-foreground"
                                        : isCurrent
                                          ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                                          : "bg-muted/50 text-muted-foreground"
                                }`}
                              >
                                {isComplete ? (
                                  <CheckCircle className="size-3" />
                                ) : isCurrent && isFailed ? (
                                  <XCircle className="size-3" />
                                ) : isCurrent && isCancelled ? (
                                  <XCircle className="size-3" />
                                ) : isCurrent ? (
                                  <CircleDot className="size-3" />
                                ) : (
                                  <CircleDot className="size-3 opacity-30" />
                                )}
                                {STATUS_CONFIG[step]?.label ?? step}
                              </div>
                              {idx < STATUS_ORDER.length - 1 && (
                                <div className="h-px w-4 bg-muted-foreground/20" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Counts row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-[14px] border border-hairline bg-canvas p-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                          Generated
                        </p>
                        <p className="mt-1 font-semibold text-lg">
                          {workflow.generatedCount}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-hairline bg-canvas p-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                          Approved
                        </p>
                        <p className="mt-1 font-semibold text-lg">
                          {workflow.approvedCount}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-hairline bg-canvas p-3">
                        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                          Instantiated
                        </p>
                        <p className="mt-1 font-semibold text-lg">
                          {workflow.instantiatedCount}
                        </p>
                      </div>
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Started: </span>
                        <span>{formatDateTime(workflow.startedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Completed:{" "}
                        </span>
                        <span>{formatDateTime(workflow.completedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Reviewed:{" "}
                        </span>
                        <span>{formatDateTime(workflow.reviewedAt)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Approved:{" "}
                        </span>
                        <span>{formatDateTime(workflow.approvedAt)}</span>
                      </div>
                    </div>

                    {/* Errors */}
                    {workflow.errors && (
                      <div className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <AlertTriangle className="size-4 text-destructive" />
                          <span className="font-mono text-[10px] text-destructive uppercase tracking-[0.18em]">
                            Errors
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-destructive/90 text-sm">
                          {workflow.errors}
                        </p>
                      </div>
                    )}

                    {/* Warnings */}
                    {workflow.warnings && (
                      <div className="rounded-[14px] border border-yellow-500/30 bg-yellow-500/5 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <AlertTriangle className="size-4 text-yellow-600" />
                          <span className="font-mono text-[10px] text-yellow-600 uppercase tracking-[0.18em]">
                            Warnings
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-yellow-700/90">
                          {workflow.warnings}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    {getAvailableActions(workflow).length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="mr-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                          Actions
                        </span>
                        {getAvailableActions(workflow).map((act) => (
                          <Button
                            disabled={actioning === workflow.id}
                            key={act.action}
                            onClick={() =>
                              setConfirmAction({
                                workflow,
                                action: act.action,
                                label: act.label,
                              })
                            }
                            size="sm"
                            variant={
                              act.variant as
                                | "default"
                                | "destructive"
                                | "outline"
                            }
                          >
                            {act.action === "approve-plan" && (
                              <CheckCircle className="mr-1.5 size-3.5" />
                            )}
                            {act.action === "reject-plan" && (
                              <XCircle className="mr-1.5 size-3.5" />
                            )}
                            {act.action === "quick-approve" && (
                              <Zap className="mr-1.5 size-3.5" />
                            )}
                            {act.action === "retry" && (
                              <RefreshCw className="mr-1.5 size-3.5" />
                            )}
                            {act.action === "cancel" && (
                              <XCircle className="mr-1.5 size-3.5" />
                            )}
                            {act.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Prep Task Plan Workflow</DialogTitle>
            <DialogDescription>
              Create a new workflow to generate and manage prep tasks for an
              event. The workflow will start in "created" status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="font-medium text-sm">Event ID</label>
              <Input
                onChange={(e) =>
                  setForm((f) => ({ ...f, eventId: e.target.value }))
                }
                placeholder="Event UUID"
                value={form.eventId}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm">Idempotency Key</label>
              <Input
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    idempotencyKey: e.target.value,
                  }))
                }
                placeholder="Unique key for idempotency"
                value={form.idempotencyKey}
              />
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm">
                Generation Options (JSON)
              </label>
              <Textarea
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    generationOptions: e.target.value,
                  }))
                }
                placeholder='{"includeAllergens": true, "maxTasks": 20}'
                rows={4}
                value={form.generationOptions}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!(form.eventId && form.idempotencyKey)}
              onClick={handleCreate}
            >
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm action dialog */}
      <Dialog
        onOpenChange={(open) => !open && setConfirmAction(null)}
        open={!!confirmAction}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {confirmAction?.label.toLowerCase()} this
              workflow for event{" "}
              <span className="font-mono">
                {confirmAction
                  ? truncateUuid(confirmAction.workflow.eventId)
                  : ""}
              </span>
              ?{" "}
              {confirmAction?.action === "cancel" &&
                "This action cannot be undone."}
              {confirmAction?.action === "reject-plan" &&
                "This will reject the generated plan."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setConfirmAction(null)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={actioning === confirmAction?.workflow.id}
              onClick={handleConfirmAction}
              variant={
                confirmAction?.action === "reject-plan" ||
                confirmAction?.action === "cancel"
                  ? "destructive"
                  : "default"
              }
            >
              {actioning === confirmAction?.workflow.id && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {confirmAction?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
