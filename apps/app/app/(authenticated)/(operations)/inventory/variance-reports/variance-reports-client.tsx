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
import {
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  listVarianceReports,
  varianceReportApprove,
  varianceReportReview,
} from "@/app/lib/manifest-client.generated";
import type { VarianceReport } from "@/app/lib/manifest-types.generated";

interface InitialMetrics {
  approved: number;
  pending: number;
  reviewed: number;
  total: number;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; variant: string }
> = {
  pending: {
    label: "Pending",
    icon: <Clock className="mr-1 size-3" />,
    variant: "warning",
  },
  reviewed: {
    label: "Reviewed",
    icon: <Eye className="mr-1 size-3" />,
    variant: "info",
  },
  approved: {
    label: "Approved",
    icon: <ShieldCheck className="mr-1 size-3" />,
    variant: "success",
  },
  adjusted: {
    label: "Adjusted",
    icon: <CheckCircle className="mr-1 size-3" />,
    variant: "neutral",
  },
};

function formatDecimal(value: number | string | null | undefined): string {
  if (value == null) {
    return "0.000";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatPct(value: number | string | null | undefined): string {
  if (value == null) {
    return "0.0%";
  }
  return `${Number(value).toFixed(1)}%`;
}

interface VarianceReportsClientProps {
  initialMetrics: InitialMetrics;
}

interface ReviewForm {
  notes: string;
}

interface ApproveForm {
  adjustmentAmount: string;
  adjustmentType: string;
}

const EMPTY_REVIEW: ReviewForm = { notes: "" };
const EMPTY_APPROVE: ApproveForm = { adjustmentType: "", adjustmentAmount: "" };

export function VarianceReportsClient({
  initialMetrics,
}: VarianceReportsClientProps) {
  const [reports, setReports] = useState<VarianceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialMetrics.total);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<VarianceReport | null>(null);
  const [approveTarget, setApproveTarget] = useState<VarianceReport | null>(
    null
  );
  const [reviewForm, setReviewForm] = useState<ReviewForm>(EMPTY_REVIEW);
  const [approveForm, setApproveForm] = useState<ApproveForm>(EMPTY_APPROVE);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 25,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const result = await listVarianceReports(params);
      setReports(result.data);
      setTotalCount(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load variance reports"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const handleReview = async () => {
    if (!reviewTarget) {
      return;
    }
    setActioning(reviewTarget.id);
    try {
      await varianceReportReview({
        id: reviewTarget.id,
        notes: reviewForm.notes,
      });
      toast.success("Report reviewed");
      setReviewTarget(null);
      setReviewForm(EMPTY_REVIEW);
      await loadReports();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to review report"
      );
    } finally {
      setActioning(null);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) {
      return;
    }
    setActioning(approveTarget.id);
    try {
      await varianceReportApprove({
        id: approveTarget.id,
        adjustmentType: approveForm.adjustmentType || undefined,
        adjustmentAmount: approveForm.adjustmentAmount
          ? Number(approveForm.adjustmentAmount)
          : undefined,
      });
      toast.success("Report approved");
      setApproveTarget(null);
      setApproveForm(EMPTY_APPROVE);
      await loadReports();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve report"
      );
    } finally {
      setActioning(null);
    }
  };

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
              placeholder="Search by item name or number..."
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="adjusted">Adjusted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadReports} size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && reports.length === 0 && (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
          No variance reports found. Reports are generated when cycle count
          sessions are finalized.
        </div>
      )}

      {!isLoading && reports.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          <div className="grid grid-cols-[1fr_100px_100px_100px_90px_90px_90px_100px_130px] gap-3 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <span>Item</span>
            <span className="text-right">Expected</span>
            <span className="text-right">Counted</span>
            <span className="text-right">Variance</span>
            <span className="text-right">Var %</span>
            <span className="text-right">Accuracy</span>
            <span>Status</span>
            <span>Type</span>
            <span className="text-right">Actions</span>
          </div>
          {reports.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status ?? ""] ?? {
              label: report.status,
              icon: null,
              variant: "neutral",
            };
            const isHighVariance =
              Number(report.variancePct) > 10 ||
              Number(report.variancePct) < -10;
            return (
              <div
                className="grid grid-cols-[1fr_100px_100px_100px_90px_90px_90px_100px_130px] gap-3 border-hairline border-b px-5 py-4 text-sm last:border-b-0"
                key={report.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{report.itemName}</p>
                  <p className="truncate text-muted-foreground text-xs">
                    {report.itemNumber}
                  </p>
                </div>
                <span className="text-right font-mono">
                  {formatDecimal(report.expectedQuantity)}
                </span>
                <span className="text-right font-mono">
                  {formatDecimal(report.countedQuantity)}
                </span>
                <span
                  className={`text-right font-mono ${isHighVariance ? "font-semibold text-red-600" : ""}`}
                >
                  {formatDecimal(report.variance)}
                </span>
                <span
                  className={`text-right font-mono ${isHighVariance ? "font-semibold text-red-600" : ""}`}
                >
                  {formatPct(report.variancePct)}
                </span>
                <span className="text-right font-mono">
                  {formatPct(report.accuracyScore)}
                </span>
                <StatusPill>
                  {statusCfg.icon}
                  {statusCfg.label}
                </StatusPill>
                <span className="text-muted-foreground">
                  {report.reportType}
                </span>
                <div className="flex items-center justify-end gap-1">
                  {report.status === "pending" && (
                    <Button
                      disabled={actioning === report.id}
                      onClick={() => {
                        setReviewTarget(report);
                        setReviewForm(EMPTY_REVIEW);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Eye className="mr-1 size-3" />
                      Review
                    </Button>
                  )}
                  {report.status === "reviewed" && (
                    <Button
                      disabled={actioning === report.id}
                      onClick={() => {
                        setApproveTarget(report);
                        setApproveForm(EMPTY_APPROVE);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <ShieldCheck className="mr-1 size-3" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, totalCount)} of{" "}
            {totalCount}
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

      {/* Review Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setReviewForm(EMPTY_REVIEW);
          }
        }}
        open={!!reviewTarget}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Variance Report</DialogTitle>
            <DialogDescription>
              Review the variance for {reviewTarget?.itemName ?? "this item"}.
            </DialogDescription>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-3 rounded-lg border border-hairline bg-muted/30 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Expected:</span>
                <span className="font-mono">
                  {formatDecimal(reviewTarget.expectedQuantity)}
                </span>
                <span className="text-muted-foreground">Counted:</span>
                <span className="font-mono">
                  {formatDecimal(reviewTarget.countedQuantity)}
                </span>
                <span className="text-muted-foreground">Variance:</span>
                <span className="font-mono">
                  {formatDecimal(reviewTarget.variance)} (
                  {formatPct(reviewTarget.variancePct)})
                </span>
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-mono">
                  {formatPct(reviewTarget.accuracyScore)}
                </span>
              </div>
            </div>
          )}
          <div className="py-2">
            <label className="font-medium text-sm">Review Notes</label>
            <textarea
              className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onChange={(e) =>
                setReviewForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Add notes about this variance..."
              value={reviewForm.notes}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setReviewTarget(null);
                setReviewForm(EMPTY_REVIEW);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={actioning === reviewTarget?.id}
              onClick={handleReview}
            >
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setApproveForm(EMPTY_APPROVE);
          }
        }}
        open={!!approveTarget}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Variance Report</DialogTitle>
            <DialogDescription>
              Approve the variance adjustment for{" "}
              {approveTarget?.itemName ?? "this item"}.
            </DialogDescription>
          </DialogHeader>
          {approveTarget && (
            <div className="space-y-3 rounded-lg border border-hairline bg-muted/30 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Variance:</span>
                <span className="font-mono">
                  {formatDecimal(approveTarget.variance)} (
                  {formatPct(approveTarget.variancePct)})
                </span>
                <span className="text-muted-foreground">Accuracy:</span>
                <span className="font-mono">
                  {formatPct(approveTarget.accuracyScore)}
                </span>
              </div>
            </div>
          )}
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label className="font-medium text-sm">Adjustment Type</label>
              <Select
                onValueChange={(v) =>
                  setApproveForm((f) => ({ ...f, adjustmentType: v }))
                }
                value={approveForm.adjustmentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select adjustment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity_adjustment">
                    Quantity Adjustment
                  </SelectItem>
                  <SelectItem value="write_off">Write Off</SelectItem>
                  <SelectItem value="recount">Recount Required</SelectItem>
                  <SelectItem value="none">No Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm">Adjustment Amount</label>
              <Input
                onChange={(e) =>
                  setApproveForm((f) => ({
                    ...f,
                    adjustmentAmount: e.target.value,
                  }))
                }
                placeholder="0.000"
                step="0.001"
                type="number"
                value={approveForm.adjustmentAmount}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setApproveTarget(null);
                setApproveForm(EMPTY_APPROVE);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={actioning === approveTarget?.id}
              onClick={handleApprove}
            >
              Approve Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
