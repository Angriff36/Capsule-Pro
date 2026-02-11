"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

interface PayrollPeriod {
  id: string;
  tenantId: string;
  periodStart: Date;
  periodEnd: Date;
  status: "open" | "closed" | "processing";
  createdAt: Date;
  updatedAt: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
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

function getStatusBadge(status: PayrollPeriod["status"]) {
  const variants: Record<
    PayrollPeriod["status"],
    "default" | "secondary" | "outline"
  > = {
    open: "default",
    processing: "secondary",
    closed: "outline",
  };

  const icons: Record<PayrollPeriod["status"], React.ReactNode> = {
    open: <ClockIcon className="h-3 w-3" />,
    processing: <Loader2Icon className="h-3 w-3 animate-spin" />,
    closed: <CheckCircleIcon className="h-3 w-3" />,
  };

  const labels: Record<PayrollPeriod["status"], string> = {
    open: "Open",
    processing: "Processing",
    closed: "Closed",
  };

  return (
    <Badge className="flex items-center gap-1" variant={variants[status]}>
      {icons[status]}
      {labels[status]}
    </Badge>
  );
}

export default function PayrollPeriodsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const response = await apiFetch(
        `/api/payroll/periods?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch payroll periods");
      }

      const data = await response.json();
      setPeriods(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      toast.error("Failed to load payroll periods");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreatePeriod = async () => {
    setActionLoading(true);
    try {
      const response = await apiFetch("/api/payroll/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payroll period");
      }

      toast.success("Payroll period created successfully");
      setCreateDialogOpen(false);
      setPeriodStart("");
      setPeriodEnd("");
      fetchPeriods();
    } catch (error) {
      console.error("Error creating payroll period:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create payroll period"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const isFormValid = periodStart && periodEnd;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">
            Payroll Periods
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage pay periods for payroll processing
          </p>
        </div>
        <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Period
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payroll Period</DialogTitle>
              <DialogDescription>
                Define the start and end dates for a new payroll period. Periods
                cannot exceed 31 days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Period Start Date</Label>
                <Input
                  id="periodStart"
                  onChange={(e) => setPeriodStart(e.target.value)}
                  type="date"
                  value={periodStart}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodEnd">Period End Date</Label>
                <Input
                  id="periodEnd"
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  type="date"
                  value={periodEnd}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={!isFormValid || actionLoading}
                onClick={handleCreatePeriod}
              >
                {actionLoading && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Period
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-4">
          Filters
        </h2>
        <Card className="bg-card/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select onValueChange={handleStatusChange} value={statusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Periods</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      ) : periods.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-lg mb-2">
            No payroll periods found
          </p>
          <p className="text-muted-foreground text-sm">
            Create your first payroll period to get started
          </p>
        </Card>
      ) : (
        <section>
          <h2 className="font-medium text-sm text-muted-foreground mb-4">
            Periods ({pagination.total})
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period, index) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">
                          Period {pagination.total - index}
                        </TableCell>
                        <TableCell>{formatDate(period.periodStart)}</TableCell>
                        <TableCell>{formatDate(period.periodEnd)}</TableCell>
                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(period.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing {periods.length} of {pagination.total} periods
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
        </section>
      )}
    </div>
  );
}
