/**
 * Payment List Client Component
 *
 * Displays and manages payment records with filtering and actions
 */

"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { ButtonGroup } from "@repo/design-system/components/ui/button-group";
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
import { format } from "date-fns";
import { Download, Filter, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGEBACK"
  | "VOID";

type FraudStatus =
  | "NOT_CHECKED"
  | "PASSED"
  | "FAILED"
  | "REVIEW_NEEDED"
  | "MANUAL_REVIEW";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodType: string;
  invoiceId: string;
  eventId: string;
  clientName: string | null;
  eventName: string | null;
  processedAt: Date;
  completedAt: Date | null;
  fraudStatus: FraudStatus;
}

interface PaymentListResponse {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<PaymentStatus, string> = {
  PENDING: "yellow",
  PROCESSING: "blue",
  COMPLETED: "green",
  FAILED: "red",
  REFUNDED: "gray",
  PARTIALLY_REFUNDED: "orange",
  CHARGEBACK: "red",
  VOID: "gray",
};

const fraudStatusColors: Record<FraudStatus, string> = {
  NOT_CHECKED: "gray",
  PASSED: "green",
  FAILED: "red",
  REVIEW_NEEDED: "yellow",
  MANUAL_REVIEW: "orange",
};

export function PaymentListClient() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");

  // Refund dialog state
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmountStr, setRefundAmountStr] = useState("");

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await apiFetch(`/api/accounting/payments?${params}`);
      const data: PaymentListResponse = await response.json();

      setPayments(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPayments();
  };

  const handleExport = async () => {
    try {
      const response = await apiFetch("/api/accounting/payments/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
    } catch (error) {
      toast.error("Failed to export payments");
    }
  };

  const handleRefund = (payment: Payment) => {
    setRefundPayment(payment);
    setRefundReason("");
    setRefundAmountStr("");
    setRefundDialogOpen(true);
  };

  const handleRefundSubmit = async () => {
    if (!refundPayment || !refundReason.trim()) return;

    const refundAmount = refundAmountStr
      ? Number.parseFloat(refundAmountStr)
      : undefined;

    try {
      const response = await apiFetch(
        `/api/accounting/payments/${refundPayment.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: refundReason, amount: refundAmount }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Refund failed");
      }

      toast.success("Refund processed successfully");
      setRefundDialogOpen(false);
      fetchPayments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process refund"
      );
    }
  };

  const columns = [
    {
      key: "invoiceId",
      label: "Invoice",
      render: (value: string) => `#${value.slice(0, 8)}...`,
    },
    {
      key: "clientName",
      label: "Client",
      render: (value: string | null) => value || "—",
    },
    {
      key: "amount",
      label: "Amount",
      render: (_: unknown, payment: Payment) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: payment.currency,
        }).format(payment.amount),
    },
    {
      key: "methodType",
      label: "Method",
      render: (value: string) => value.replace(/_/g, " "),
    },
    {
      key: "status",
      label: "Status",
      render: (value: PaymentStatus) => (
        <Badge variant="outline">{value}</Badge>
      ),
    },
    {
      key: "fraudStatus",
      label: "Fraud Check",
      render: (value: FraudStatus) => (
        <Badge variant="outline">{value.replace(/_/g, " ")}</Badge>
      ),
    },
    {
      key: "processedAt",
      label: "Date",
      render: (value: Date) => format(new Date(value), "MMM d, yyyy"),
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, payment: Payment) => (
        <ButtonGroup>
          <Button
            onClick={() =>
              (window.location.href = `/accounting/payments/${payment.id}`)
            }
            size="sm"
            variant="ghost"
          >
            View
          </Button>
          {payment.status === "COMPLETED" && (
            <Button
              onClick={() => handleRefund(payment)}
              size="sm"
              variant="ghost"
            >
              Refund
            </Button>
          )}
        </ButtonGroup>
      ),
    },
  ];

  if (loading && payments.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
            <p className="text-gray-500">Loading payments...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No payments found</p>
          <p className="text-sm text-gray-400 mb-4">
            Get started by processing your first payment
          </p>
          <Button asChild>
            <a href="/accounting/payments/new">
              <Plus className="w-4 h-4 mr-2" />
              Create Payment
            </a>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-gray-500 mt-1">
            {total} payment{total !== 1 ? "s" : ""}
          </p>
        </div>
        <ButtonGroup>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => router.push("/accounting/payments/new")}>
            <Plus className="w-4 h-4 mr-2" />
            New Payment
          </Button>
        </ButtonGroup>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search payments..."
              type="text"
              value={searchQuery}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg"
            onChange={(e) =>
              setStatusFilter(e.target.value as PaymentStatus | "")
            }
            value={statusFilter}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <Button onClick={handleSearch} variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/20">
              <tr>
                {columns.map((col) => (
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600"
                    key={col.key}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr className="border-b hover:bg-muted/20" key={payment.id}>
                  {columns.map((col) => (
                    <td className="px-4 py-3" key={col.key}>
                      {col.render
                        ? col.render(
                            payment[col.key as keyof Payment] as never,
                            payment
                          )
                        : String(payment[col.key as keyof Payment] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <Button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Refund Dialog */}
      <Dialog onOpenChange={setRefundDialogOpen} open={refundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Enter the reason and optional amount for refunding payment{" "}
              {refundPayment?.invoiceId?.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Input
                id="refund-reason"
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter refund reason"
                value={refundReason}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Amount (leave blank for full refund)
              </Label>
              <Input
                id="refund-amount"
                onChange={(e) => setRefundAmountStr(e.target.value)}
                placeholder="Enter refund amount"
                type="number"
                value={refundAmountStr}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setRefundDialogOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!refundReason.trim()}
              onClick={handleRefundSubmit}
            >
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
