/**
 * Payment List Client Component
 *
 * Displays and manages payment records with filtering and actions
 */

"use client";

import {
  Button,
  ButtonGroup,
  Card,
  DataTable,
  EmptyState,
  StatusBadge,
} from "@repo/design-system";
import { format } from "date-fns";
import { Download, Filter, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "">("");

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

      const response = await fetch(`/api/accounting/payments?${params}`);
      const data: PaymentListResponse = await response.json();

      setPayments(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
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
      const response = await fetch("/api/accounting/payments/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
    } catch (error) {
      console.error("Failed to export payments:", error);
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
        <StatusBadge color={statusColors[value]} status={value} />
      ),
    },
    {
      key: "fraudStatus",
      label: "Fraud Check",
      render: (value: FraudStatus) => (
        <StatusBadge
          color={fraudStatusColors[value]}
          status={value.replace(/_/g, " ")}
        />
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
            <Button size="sm" variant="ghost">
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
        <EmptyState
          action={{
            label: "Create Payment",
            href: "/accounting/payments/new",
            icon: Plus,
          }}
          description="Get started by processing your first payment"
          illustration="payment"
          title="No payments found"
        />
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
          <Button>
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
        <DataTable
          columns={columns}
          data={payments}
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      </Card>
    </div>
  );
}
