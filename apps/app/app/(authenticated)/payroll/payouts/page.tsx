"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
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

interface PayrollRun {
  id: string;
  payrollPeriodId: string;
  runDate: string;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "approved"
    | "paid"
    | "failed";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

type StatusFilter = "all" | "pending" | "processing" | "approved" | "paid";

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  processing: "secondary",
  completed: "secondary",
  approved: "default",
  paid: "default",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  approved: "Approved",
  paid: "Paid",
  failed: "Failed",
};

import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const PayrollPayoutsPage = () => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const response = await apiFetch(`/api/payroll/runs?${params}`);
      if (!response.ok) {
        toast.error("Failed to load payout runs");
        return;
      }
      const result = await response.json();
      setRuns(result.data ?? []);
    } catch {
      toast.error("Failed to load payout runs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const totalPaid = runs
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.totalNet, 0);
  const totalPending = runs
    .filter((r) => r.status === "pending" || r.status === "processing")
    .reduce((sum, r) => sum + r.totalNet, 0);
  const totalApproved = runs
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.totalNet, 0);

  if (loading) {
    return (
      <PageCanvas>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageCanvas>
    );
  }

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Payouts</DisplayHeading>
            <CommandBandLede>
              Manage payout channels and statuses for payroll runs.
            </CommandBandLede>
          </div>
          <CommandBandActions>
            <Button onClick={loadRuns} size="sm" variant="on-dark">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CommandBandActions>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand>
            <MetricCell>
              <MetricLabel>Total Paid</MetricLabel>
              <MetricValue>{formatCurrency(totalPaid)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Awaiting Payment</MetricLabel>
              <MetricValue>{formatCurrency(totalApproved)}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Processing</MetricLabel>
              <MetricValue>{formatCurrency(totalPending)}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          title="Payroll Runs"
          description="All payroll runs with payout status and amounts."
          count={`${runs.length} run${runs.length !== 1 ? "s" : ""}`}
        />

        <div className="rounded-[22px] border border-hairline bg-soft-stone p-6 sm:p-8">
          <Select
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            value={statusFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {runs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <DollarSign />
              </EmptyMedia>
              <EmptyTitle>No payroll runs found</EmptyTitle>
              <EmptyDescription>
                {statusFilter !== "all"
                  ? "No runs match the selected filter. Try changing the status filter."
                  : "Runs will appear here once payroll periods are processed."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <p className="text-muted-foreground text-xs">
                Process a payroll period to generate a payout run.
              </p>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run Date</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{formatDate(run.runDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(run.totalGross)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ({formatCurrency(run.totalDeductions)})
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(run.totalNet)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          STATUS_BADGE_VARIANT[run.status] ?? "outline"
                        }
                      >
                        {STATUS_LABEL[run.status] ?? run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {run.paidAt ? formatDate(run.paidAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </OperationalColumn>
    </PageCanvas>
  );
};

export default PayrollPayoutsPage;
