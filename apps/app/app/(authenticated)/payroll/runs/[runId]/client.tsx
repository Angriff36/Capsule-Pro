"use client";

import { PageCanvas } from "@repo/design-system/components/blocks/page-shell";
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
import { Label } from "@repo/design-system/components/ui/label";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  Loader2Icon,
  XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { payrollRunMarkPaid } from "@/app/lib/manifest-client.generated";
import ApprovalHistoryTimeline from "./components/approval-history-timeline";
import ApprovalWorkflowPanel from "./components/approval-workflow-panel";
import PayrollLineItemsTable from "./components/payroll-line-items-table";
import PayrollRunDetails from "./components/payroll-run-details";

type PayrollRunStatus =
  | "pending"
  | "processing"
  | "completed"
  | "approved"
  | "paid"
  | "failed";

interface PayrollRun {
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
  employeeCount: number;
  id: string;
  paidAt: Date | null;
  payrollPeriodId: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  runDate: Date;
  status: PayrollRunStatus;
  tenantId: string;
  totalDeductions: number;
  totalGross: number;
  totalNet: number;
  updatedAt: Date;
}

interface PayrollLineItem {
  createdAt: Date;
  deductions: Record<string, number>;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  grossPay: number;
  hoursOvertime: number;
  hoursRegular: number;
  id: string;
  netPay: number;
  payrollRunId: string;
  rateOvertime: number;
  rateRegular: number;
  updatedAt: Date;
}

interface ApprovalHistoryEntry {
  action: string;
  createdAt: Date;
  id: string;
  newValues: Record<string, unknown> | null;
  oldValues: Record<string, unknown> | null;
  performedBy: string | null;
  performerFirstName: string | null;
  performerLastName: string | null;
}

interface PayrollRunDetailResponse {
  approvalHistory: ApprovalHistoryEntry[];
  data: PayrollRun;
  lineItems: PayrollLineItem[];
}

interface PayrollRunDetailClientProps {
  runId: string;
}

function getStatusBadge(status: PayrollRunStatus) {
  const variants: Record<
    PayrollRunStatus,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    pending: "secondary",
    processing: "default",
    completed: "outline",
    approved: "default",
    paid: "outline",
    failed: "destructive",
  };

  const icons: Record<PayrollRunStatus, React.ReactNode> = {
    pending: <ClockIcon className="h-3 w-3" />,
    processing: <Loader2Icon className="h-3 w-3 animate-spin" />,
    completed: <CheckCircleIcon className="h-3 w-3" />,
    approved: <CheckCircleIcon className="h-3 w-3" />,
    paid: <CheckCircleIcon className="h-3 w-3" />,
    failed: <AlertTriangleIcon className="h-3 w-3" />,
  };

  const labels: Record<PayrollRunStatus, string> = {
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

export default function PayrollRunDetailClient({
  runId,
}: PayrollRunDetailClientProps) {
  const router = useRouter();
  const [runData, setRunData] = useState<PayrollRun | null>(null);
  const [lineItems, setLineItems] = useState<PayrollLineItem[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<
    ApprovalHistoryEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const fetchRunDetails = useCallback(async () => {
    setLoading(true);
    try {
      // TODO(convex): composite/custom — joins PayrollRun + lineItems + approvalHistory
      // with employee/period/performer fields (employeeCount, periodStart/End, employeeEmail,
      // employeeFirstName/LastName/Role, deductions, performerFirstName/LastName) not on the
      // generated PayrollRun/PayrollLineItem types; no generated joined query.
      const response = await apiFetch(`/api/payroll/runs/${runId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch payroll run details");
      }

      const data: PayrollRunDetailResponse = await response.json();
      setRunData(data.data);
      setLineItems(data.lineItems);
      setApprovalHistory(data.approvalHistory);
    } catch (error) {
      console.error("Error fetching payroll run details:", error);
      toast.error("Failed to load payroll run details");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    fetchRunDetails();
  }, [fetchRunDetails]);

  // Poll for status updates every 10 seconds if status is processing
  useEffect(() => {
    if (runData?.status === "processing") {
      const interval = setInterval(() => {
        fetchRunDetails();
      }, 10_000);

      return () => clearInterval(interval);
    }
  }, [runData?.status, fetchRunDetails]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      // TODO(convex): PayrollRun.approve requires an approvedBy actor param (guarded +
      // written) that must be server-injected from auth; keep apiFetch until Phase-5.
      const response = await apiFetch(`/api/payroll/runs/${runId}`, {
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
      fetchRunDetails();
    } catch (error) {
      console.error("Error approving payroll run:", error);
      toast.error("Failed to approve payroll run");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      // TODO(convex): PayrollRun.reject requires a rejectedBy actor param that must be
      // server-injected from auth; keep apiFetch until Phase-5.
      const response = await apiFetch(`/api/payroll/runs/${runId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "failed",
          rejectionReason: rejectReason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject payroll run");
      }

      toast.success("Payroll run rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      fetchRunDetails();
    } catch (error) {
      console.error("Error rejecting payroll run:", error);
      toast.error("Failed to reject payroll run");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    setActionLoading(true);
    try {
      await payrollRunMarkPaid({ id: runId });

      toast.success("Payroll run finalized successfully");
      fetchRunDetails();
    } catch (error) {
      console.error("Error finalizing payroll run:", error);
      toast.error("Failed to finalize payroll run");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const params = new URLSearchParams({
        format: "csv",
      });

      // TODO(convex): composite/custom — report file (CSV) generation/blob download, no generated fn.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!runData) {
    return (
      <Card className="p-12 text-center">
        <AlertTriangleIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Payroll run not found</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/payroll/runs")}
          variant="outline"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Payroll Runs
        </Button>
      </Card>
    );
  }

  const canApprove = runData.status === "completed";
  const canReject = ["completed", "approved"].includes(runData.status);
  const canFinalize = runData.status === "approved";

  return (
    <PageCanvas>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/payroll/runs")}
              size="sm"
              variant="ghost"
            >
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-normal text-3xl text-foreground leading-[1.05] tracking-[-0.02em] sm:text-4xl">
                  Payroll Run Details
                </h1>
                {getStatusBadge(runData.status)}
              </div>
              <p className="text-muted-foreground text-sm">
                Run ID: {runId.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["completed", "approved", "paid"].includes(runData.status) && (
              <Button onClick={handleExportReport} size="sm" variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            )}
          </div>
        </div>

        {/* Payroll Run Details */}
        <PayrollRunDetails run={runData} />

        {/* Approval Workflow Panel */}
        <ApprovalWorkflowPanel
          actionLoading={actionLoading}
          canApprove={canApprove}
          canFinalize={canFinalize}
          canReject={canReject}
          onApprove={handleApprove}
          onFinalize={handleFinalize}
          onReject={() => setRejectDialogOpen(true)}
          run={runData}
        />

        {/* Payroll Line Items Table */}
        <PayrollLineItemsTable lineItems={lineItems} runId={runId} />

        {/* Approval History Timeline */}
        {approvalHistory.length > 0 && (
          <ApprovalHistoryTimeline approvalHistory={approvalHistory} />
        )}

        {/* Reject Dialog */}
        <Dialog onOpenChange={setRejectDialogOpen} open={rejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircleIcon className="h-5 w-5 text-destructive" />
                Reject Payroll Run
              </DialogTitle>
              <DialogDescription>
                This action will reject the payroll run and prevent payment
                processing. Please provide a reason for the rejection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejectReason">Reason for Rejection</Label>
                <Input
                  id="rejectReason"
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Describe the issue with this payroll run..."
                  value={rejectReason}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={actionLoading}
                onClick={() => setRejectDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleReject}
                variant="destructive"
              >
                {actionLoading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Reject Payroll Run
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageCanvas>
  );
}
