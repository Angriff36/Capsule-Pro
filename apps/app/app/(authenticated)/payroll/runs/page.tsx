"use client";

import {
  CommandBand,
  CommandBandActions,
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
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
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
  AlertTriangleIcon,
  CheckCircleIcon,
  CircleDollarSignIcon,
  ClockIcon,
  DownloadIcon,
  EyeIcon,
  Loader2Icon,
  PlayIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface PayrollRun {
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  id: string;
  paidAt: Date | null;
  payrollPeriodId: string;
  runDate: Date;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "approved"
    | "paid"
    | "failed";
  tenantId: string;
  totalDeductions: number;
  totalGross: number;
  totalNet: number;
  updatedAt: Date;
}

interface PaginationInfo {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusBadge(status: PayrollRun["status"]) {
  const variants: Record<
    PayrollRun["status"],
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "secondary",
    processing: "default",
    completed: "outline",
    approved: "default",
    paid: "outline",
    failed: "destructive",
  };

  const icons: Record<PayrollRun["status"], React.ReactNode> = {
    pending: <ClockIcon className="h-3 w-3" />,
    processing: <Loader2Icon className="h-3 w-3 animate-spin" />,
    completed: <CheckCircleIcon className="h-3 w-3" />,
    approved: <CheckCircleIcon className="h-3 w-3" />,
    paid: <CheckCircleIcon className="h-3 w-3" />,
    failed: <AlertTriangleIcon className="h-3 w-3" />,
  };

  const labels: Record<PayrollRun["status"], string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    approved: "Approved",
    paid: "Paid",
    failed: "Failed",
  };

  return (
    <Badge className="flex items-center gap-1" variant={variants[status]}>
      {icons[status]}
      {labels[status]}
    </Badge>
  );
}

export default function PayrollRunsPage() {
  const _router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState(false);

  // Approval dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await apiFetch(`/api/payroll/runs?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch payroll runs");
      }

      const data = await response.json();
      setRuns(data.data || []);
      setPagination((previous) => data.pagination ?? previous);
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
      toast.error("Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleGeneratePayroll = async () => {
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Default to current period
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate payroll");
      }

      toast.success("Payroll generation started");
      fetchRuns();
    } catch (error) {
      console.error("Error generating payroll:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate payroll"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRun = async () => {
    if (!selectedRun) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await apiFetch(`/api/payroll/runs/${selectedRun.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve payroll run");
      }

      toast.success("Payroll run approved successfully");
      setApproveDialogOpen(false);
      setSelectedRun(null);
      fetchRuns();
    } catch (error) {
      console.error("Error approving payroll run:", error);
      toast.error("Failed to approve payroll run");
    } finally {
      setActionLoading(false);
    }
  };

  const openApproveDialog = (run: PayrollRun) => {
    setSelectedRun(run);
    setApproveDialogOpen(true);
  };

  const handleExportReport = async (runId: string) => {
    try {
      const params = new URLSearchParams({
        format: "csv",
      });

      const response = await apiFetch(
        `/api/payroll/reports/${runId}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to export report");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-report-${runId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const canApprove = (run: PayrollRun) => run.status === "completed";

  const canExport = (run: PayrollRun) =>
    ["completed", "approved", "paid"].includes(run.status);

  // Computed metric counts from runs
  const pendingCount = runs.filter((r) => r.status === "pending").length;
  const processingCount = runs.filter((r) => r.status === "processing").length;
  const completedCount = runs.filter(
    (r) => r.status === "completed" || r.status === "approved"
  ).length;
  const failedCount = runs.filter((r) => r.status === "failed").length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Payroll runs</DisplayHeading>
            <CommandBandLede>
              Review, approve, and manage payroll runs.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button
              disabled={actionLoading}
              onClick={handleGeneratePayroll}
              variant="on-dark"
            >
              {actionLoading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="mr-2 h-4 w-4" />
              )}
              Generate Payroll
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Pending</MetricLabel>
              <MetricValue>{pendingCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Processing</MetricLabel>
              <MetricValue>{processingCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Completed</MetricLabel>
              <MetricValue>{completedCount}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Failed</MetricLabel>
              <MetricValue>{failedCount}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader count={`${pagination.total} runs`} title="Runs" />

        <div className="rounded-[22px] border border-hairline bg-soft-stone p-6 sm:p-8">
          <Select onValueChange={handleStatusChange} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Runs</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-24">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
            <CircleDollarSignIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg text-muted-foreground">
              No payroll runs found
            </p>
            <p className="text-muted-foreground text-sm">
              Generate your first payroll to get started
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gross Pay</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {formatDate(run.runDate)}
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(run.totalGross)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(run.totalDeductions)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(run.totalNet)}
                      </TableCell>
                      <TableCell>
                        {run.approvedAt ? (
                          <div className="text-xs">
                            <div className="font-medium text-green-600">
                              Approved
                            </div>
                            <div className="text-muted-foreground">
                              {formatDate(run.approvedAt)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Not approved
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/payroll/runs/${run.id}`}>
                              <EyeIcon className="h-4 w-4" />
                              <span className="sr-only">View payroll run</span>
                            </Link>
                          </Button>
                          {canApprove(run) && (
                            <Button
                              onClick={() => openApproveDialog(run)}
                              size="sm"
                              variant="default"
                            >
                              Approve
                            </Button>
                          )}
                          {canExport(run) && (
                            <Button
                              onClick={() => handleExportReport(run.id)}
                              size="sm"
                              variant="outline"
                            >
                              <DownloadIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Showing {runs.length} of {pagination.total} runs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </OperationalColumn>

      {/* Approval Dialog */}
      <Dialog onOpenChange={setApproveDialogOpen} open={approveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payroll Run</DialogTitle>
            <DialogDescription>
              Review the payroll details before approving. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Gross Pay</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedRun.totalGross)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Deductions</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedRun.totalDeductions)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-sm">Net Pay</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedRun.totalNet)}
                  </p>
                </div>
              </div>
              <div className="rounded-md bg-muted p-3">
                <p className="mb-1 text-muted-foreground text-sm">Run Date</p>
                <p className="font-medium">{formatDate(selectedRun.runDate)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              disabled={actionLoading}
              onClick={handleApproveRun}
              variant="default"
            >
              {actionLoading && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Approve Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageCanvas>
  );
}
