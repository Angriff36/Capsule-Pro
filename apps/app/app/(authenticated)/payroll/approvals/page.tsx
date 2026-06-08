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
import {
  Card,
  CardContent,
} from "@repo/design-system/components/ui/card";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  EyeIcon,
  Loader2Icon,
  ShieldCheckIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
// NOTE: Keeping apiFetch for all calls — approvals/history endpoints return enriched data with joins
// (performerFirstName, performerLastName, performerEmail) not available in generated list functions;
// approve/reject use custom PUT endpoint, not Manifest commands

// --- Types ---

type ApprovalStatus = "pending" | "completed" | "approved";

interface PayrollRunApproval {
  id: string;
  tenantId: string;
  payrollPeriodId: string;
  runDate: string;
  status: ApprovalStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  employeeCount: number;
}

interface ApprovalHistoryEntry {
  id: string;
  tenantId: string;
  payrollRunId: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  performedBy: string | null;
  performerFirstName: string | null;
  performerLastName: string | null;
  performerEmail: string | null;
  performedAt: string;
  reason: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Helpers ---

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function getStatusBadge(status: string) {
  const variants: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    pending: { variant: "outline", label: "Pending" },
    completed: { variant: "secondary", label: "Completed" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    finalized: { variant: "default", label: "Finalized" },
    paid: { variant: "default", label: "Paid" },
    processing: { variant: "secondary", label: "Processing" },
    failed: { variant: "destructive", label: "Failed" },
  };
  const config = variants[status] || {
    variant: "outline" as const,
    label: status,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getActionBadge(action: string) {
  const variants: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: typeof CheckCircleIcon;
    }
  > = {
    approved: { variant: "default", icon: ThumbsUpIcon },
    rejected: { variant: "destructive", icon: ThumbsDownIcon },
    approval_requested: { variant: "secondary", icon: ClockIcon },
    finalized: { variant: "default", icon: ShieldCheckIcon },
  };
  const config = variants[action] || {
    variant: "outline" as const,
    icon: CheckCircleIcon,
  };
  const IconComp = config.icon;
  return (
    <Badge className="gap-1" variant={config.variant}>
      <IconComp className="h-3 w-3" />
      {action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </Badge>
  );
}

// --- Component ---

export default function PayrollApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue");

  // Queue state
  const [approvals, setApprovals] = useState<PayrollRunApproval[]>([]);
  const [queuePagination, setQueuePagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // History state
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRunIdFilter, setHistoryRunIdFilter] = useState("");

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailRun, setDetailRun] = useState<PayrollRunApproval | null>(null);
  const [detailHistory, setDetailHistory] = useState<ApprovalHistoryEntry[]>(
    []
  );
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    id: string;
    type: "single" | "bulk";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // --- Data fetching ---

  const fetchApprovals = useCallback(
    async (page = 1) => {
      setQueueLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (queueStatusFilter !== "all") {
          params.set("status", queueStatusFilter);
        }
        const res = await apiFetch(`/api/payroll/approvals?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch approvals");
        }
        const json = await res.json();
        setApprovals(json.data || []);
        setQueuePagination(
          json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
        );
        setSelectedIds(new Set());
      } catch (err) {
        toast.error("Failed to load approval queue");
        console.error(err);
      } finally {
        setQueueLoading(false);
      }
    },
    [queueStatusFilter]
  );

  const fetchHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (historyRunIdFilter) {
          params.set("payrollRunId", historyRunIdFilter);
        } else {
          // History endpoint requires at least one filter - use a broad one
          params.set("entityId", "all");
        }
        const res = await apiFetch(`/api/payroll/approvals/history?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch history");
        }
        const json = await res.json();
        setHistory(json.data || []);
        setHistoryPagination(
          json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
        );
      } catch {
        // History may return 400 if no filter - that's ok, show empty
        setHistory([]);
        setHistoryPagination({ page: 1, limit: 20, total: 0, totalPages: 0 });
      } finally {
        setHistoryLoading(false);
      }
    },
    [historyRunIdFilter]
  );

  const fetchDetailHistory = useCallback(async (runId: string) => {
    setDetailHistoryLoading(true);
    try {
      const params = new URLSearchParams({ payrollRunId: runId, limit: "50" });
      const res = await apiFetch(`/api/payroll/approvals/history?${params}`);
      if (!res.ok) {
        return;
      }
      const json = await res.json();
      setDetailHistory(json.data || []);
    } catch {
      setDetailHistory([]);
    } finally {
      setDetailHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "queue") {
      fetchApprovals(1);
    }
  }, [activeTab, fetchApprovals]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory(1);
    }
  }, [activeTab, fetchHistory]);

  // --- Actions ---

  const handleApprove = async (runId: string) => {
    setActionLoading(runId);
    try {
      const res = await apiFetch(`/api/payroll/approvals/${runId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to approve");
      }
      toast.success("Payroll run approved");
      fetchApprovals(queuePagination.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) {
      return;
    }
    setActionLoading(rejectDialog.id);
    try {
      const res = await apiFetch(`/api/payroll/approvals/${rejectDialog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejectReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to reject");
      }
      toast.success("Payroll run rejected");
      fetchApprovals(queuePagination.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
      setRejectDialog(null);
      setRejectReason("");
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    setActionLoading("bulk-approve");
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) =>
          apiFetch(`/api/payroll/approvals/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) {
        toast.success(`${succeeded} run(s) approved`);
      }
      if (failed > 0) {
        toast.error(`${failed} run(s) failed to approve`);
      }
      fetchApprovals(queuePagination.page);
    } catch {
      toast.error("Bulk approval failed");
    } finally {
      setActionLoading(null);
      setSelectedIds(new Set());
    }
  };

  const handleBulkReject = async () => {
    if (!rejectDialog || selectedIds.size === 0) {
      return;
    }
    setActionLoading("bulk-reject");
    try {
      const results = await Promise.allSettled(
        [...selectedIds].map((id) =>
          apiFetch(`/api/payroll/approvals/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "rejected", rejectReason }),
          })
        )
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0) {
        toast.success(`${succeeded} run(s) rejected`);
      }
      if (failed > 0) {
        toast.error(`${failed} run(s) failed to reject`);
      }
      fetchApprovals(queuePagination.page);
    } catch {
      toast.error("Bulk rejection failed");
    } finally {
      setActionLoading(null);
      setRejectDialog(null);
      setRejectReason("");
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === approvals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvals.map((a) => a.id)));
    }
  };

  const openDetail = (run: PayrollRunApproval) => {
    setDetailRun(run);
    fetchDetailHistory(run.id);
  };

  // --- Stats ---

  const pendingCount = approvals.filter(
    (a) => a.status === "pending" || a.status === "completed"
  ).length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;

  // --- Render ---

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Payroll approvals</DisplayHeading>
            <CommandBandLede>Review, approve, or reject payroll runs before payout.</CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={4}>
            <MetricCell>
              <MetricLabel>Pending Review</MetricLabel>
              <MetricValue>{pendingCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Approved</MetricLabel>
              <MetricValue>{approvedCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total Gross</MetricLabel>
              <MetricValue>{formatCurrency(approvals.reduce((s, a) => s + a.totalGross, 0))}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total Net</MetricLabel>
              <MetricValue>{formatCurrency(approvals.reduce((s, a) => s + a.totalNet, 0))}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
      {/* Tab Switcher */}
      <div className="flex gap-1">
        <button
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "queue"
              ? "bg-ink text-white"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          onClick={() => setActiveTab("queue")}
          type="button"
        >
          Approval Queue
        </button>
        <button
          className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-ink text-white"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
          onClick={() => setActiveTab("history")}
          type="button"
        >
          Approval History
        </button>
      </div>

      {/* Approval Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Filters + Bulk Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select
                onValueChange={setQueueStatusFilter}
                value={queueStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  disabled={actionLoading !== null}
                  onClick={handleBulkApprove}
                  size="sm"
                >
                  {actionLoading === "bulk-approve" ? (
                    <Loader2Icon className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <ThumbsUpIcon className="mr-1 h-3 w-3" />
                  )}
                  Bulk Approve
                </Button>
                <Button
                  disabled={actionLoading !== null}
                  onClick={() => setRejectDialog({ id: "bulk", type: "bulk" })}
                  size="sm"
                  variant="destructive"
                >
                  <ThumbsDownIcon className="mr-1 h-3 w-3" />
                  Bulk Reject
                </Button>
              </div>
            )}
          </div>

          {/* Table */}
          {queueLoading ? (
            <div className="flex justify-center py-12">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : approvals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No payroll runs pending approval.
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-hidden rounded-[22px] border border-hairline">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <input
                          checked={
                            selectedIds.size === approvals.length &&
                            approvals.length > 0
                          }
                          className="h-4 w-4"
                          onChange={toggleSelectAll}
                          type="checkbox"
                        />
                      </TableHead>
                      <TableHead>Run Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Employees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <input
                            checked={selectedIds.has(run.id)}
                            className="h-4 w-4"
                            onChange={() => toggleSelect(run.id)}
                            type="checkbox"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(run.runDate)}
                        </TableCell>
                        <TableCell>
                          {run.periodStart && run.periodEnd
                            ? `${formatDate(run.periodStart)} – ${formatDate(run.periodEnd)}`
                            : "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(run.totalGross)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(run.totalDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(run.totalNet)}
                        </TableCell>
                        <TableCell className="text-right">
                          {run.employeeCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              onClick={() => openDetail(run)}
                              size="icon"
                              title="View details"
                              variant="ghost"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            {(run.status === "pending" ||
                              run.status === "completed") && (
                              <>
                                <Button
                                  disabled={actionLoading !== null}
                                  onClick={() => handleApprove(run.id)}
                                  size="icon"
                                  title="Approve"
                                  variant="ghost"
                                >
                                  {actionLoading === run.id ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button
                                  disabled={actionLoading !== null}
                                  onClick={() =>
                                    setRejectDialog({
                                      id: run.id,
                                      type: "single",
                                    })
                                  }
                                  size="icon"
                                  title="Reject"
                                  variant="ghost"
                                >
                                  <XCircleIcon className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {queuePagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    {(queuePagination.page - 1) * queuePagination.limit + 1}–
                    {Math.min(
                      queuePagination.page * queuePagination.limit,
                      queuePagination.total
                    )}{" "}
                    of {queuePagination.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={queuePagination.page <= 1 || queueLoading}
                      onClick={() => fetchApprovals(queuePagination.page - 1)}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      disabled={
                        queuePagination.page >= queuePagination.totalPages ||
                        queueLoading
                      }
                      onClick={() => fetchApprovals(queuePagination.page + 1)}
                      size="sm"
                      variant="outline"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Approval History Tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              className="max-w-xs"
              onChange={(e) => setHistoryRunIdFilter(e.target.value)}
              placeholder="Filter by Run ID (UUID)"
              value={historyRunIdFilter}
            />
            <Button
              disabled={historyLoading}
              onClick={() => fetchHistory(1)}
              size="sm"
              variant="outline"
            >
              Search
            </Button>
            {historyRunIdFilter && (
              <Button
                onClick={() => {
                  setHistoryRunIdFilter("");
                  setHistory([]);
                }}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            )}
          </div>

          {historyRunIdFilter ? (
            historyLoading ? (
              <div className="flex justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approval history found for this run.
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="overflow-hidden rounded-[22px] border border-hairline">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status Change</TableHead>
                        <TableHead>Performed By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDateTime(entry.performedAt)}
                          </TableCell>
                          <TableCell>{getActionBadge(entry.action)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {entry.previousStatus || "—"} → {entry.newStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            {entry.performerFirstName || entry.performerLastName
                              ? [
                                  entry.performerFirstName,
                                  entry.performerLastName,
                                ]
                                  .filter(Boolean)
                                  .join(" ")
                              : entry.performerEmail || "System"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {entry.reason || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {historyPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing{" "}
                      {(historyPagination.page - 1) * historyPagination.limit +
                        1}
                      –
                      {Math.min(
                        historyPagination.page * historyPagination.limit,
                        historyPagination.total
                      )}{" "}
                      of {historyPagination.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        disabled={historyPagination.page <= 1 || historyLoading}
                        onClick={() => fetchHistory(historyPagination.page - 1)}
                        size="sm"
                        variant="outline"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        disabled={
                          historyPagination.page >=
                            historyPagination.totalPages || historyLoading
                        }
                        onClick={() => fetchHistory(historyPagination.page + 1)}
                        size="sm"
                        variant="outline"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Enter a Payroll Run ID to view its approval history.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDetailRun(null);
          }
        }}
        open={detailRun !== null}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payroll Run Details</DialogTitle>
            <DialogDescription>
              Run from {formatDate(detailRun?.runDate ?? null)}
            </DialogDescription>
          </DialogHeader>

          {detailRun && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(detailRun.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employees</p>
                  <p className="font-medium">{detailRun.employeeCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gross</p>
                  <p className="font-medium">
                    {formatCurrency(detailRun.totalGross)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Deductions
                  </p>
                  <p className="font-medium">
                    {formatCurrency(detailRun.totalDeductions)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Net</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(detailRun.totalNet)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="font-medium">
                    {detailRun.periodStart && detailRun.periodEnd
                      ? `${formatDate(detailRun.periodStart)} – ${formatDate(detailRun.periodEnd)}`
                      : "—"}
                  </p>
                </div>
              </div>

              {detailRun.approvedBy && (
                <div className="text-sm text-muted-foreground">
                  Approved on {formatDateTime(detailRun.approvedAt)}
                  {detailRun.rejectReason && (
                    <span className="block mt-1 text-destructive">
                      Reject reason: {detailRun.rejectReason}
                    </span>
                  )}
                </div>
              )}

              {/* Approval History Timeline */}
              <div>
                <h4 className="font-medium text-sm mb-3">Approval History</h4>
                {detailHistoryLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : detailHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No history recorded for this run.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {detailHistory.map((entry, index) => (
                      <div className="flex items-start gap-3" key={entry.id}>
                        <div
                          className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${
                            entry.action === "approved"
                              ? "bg-primary/10 text-primary"
                              : entry.action === "rejected"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.action === "approved" ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : entry.action === "rejected" ? (
                            <XCircleIcon className="h-4 w-4" />
                          ) : (
                            <ClockIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {getActionBadge(entry.action)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {formatDateTime(entry.performedAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            by{" "}
                            {entry.performerFirstName || entry.performerLastName
                              ? [
                                  entry.performerFirstName,
                                  entry.performerLastName,
                                ]
                                  .filter(Boolean)
                                  .join(" ")
                              : "System"}
                          </p>
                          {entry.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Reason: {entry.reason}
                            </p>
                          )}
                        </div>
                        {index < detailHistory.length - 1 && (
                          <div className="absolute ml-[7px] mt-8 border-l-2 border-dashed border-muted" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {(detailRun.status === "pending" ||
                detailRun.status === "completed") && (
                <>
                  <div className="border-t border-hairline pt-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      disabled={actionLoading !== null}
                      onClick={() => {
                        setRejectDialog({ id: detailRun.id, type: "single" });
                      }}
                      variant="destructive"
                    >
                      <ThumbsDownIcon className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      disabled={actionLoading !== null}
                      onClick={() => {
                        handleApprove(detailRun.id);
                        setDetailRun(null);
                      }}
                    >
                      <ThumbsUpIcon className="mr-2 h-4 w-4" />
                      Approve Payroll Run
                    </Button>
                  </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog(null);
            setRejectReason("");
          }
        }}
        open={rejectDialog !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payroll Run</AlertDialogTitle>
            <AlertDialogDescription>
              {rejectDialog?.type === "bulk"
                ? `Reject ${selectedIds.size} selected payroll run(s)? This will notify affected employees.`
                : "Reject this payroll run? The employee will be notified."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium" htmlFor="reject-reason">
              Reason (required)
            </label>
            <Input
              className="mt-1"
              id="reject-reason"
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              value={rejectReason}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectReason.trim() || actionLoading !== null}
              onClick={
                rejectDialog?.type === "bulk" ? handleBulkReject : handleReject
              }
            >
              {actionLoading !== null ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </OperationalColumn>
    </PageCanvas>
  );
}
