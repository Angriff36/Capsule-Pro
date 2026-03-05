/**
 * Invoice List Client Component
 *
 * Displays and manages invoice records with filtering and actions
 */

"use client";

import {
  Button,
  ButtonGroup,
  Card,
  DataTable,
  EmptyState,
  Progress,
  StatusBadge,
} from "@repo/design-system";
import { format } from "date-fns";
import { Download, FileText, Filter, Plus, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";

type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "OVERDUE"
  | "PARTIALLY_PAID"
  | "PAID"
  | "VOID"
  | "WRITE_OFF";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: InvoiceStatus;
  clientName: string;
  eventName: string | null;
  total: number;
  amountPaid: number;
  amountDue: number;
  dueDate: Date;
  paidAt: Date | null;
  createdAt: Date;
}

interface InvoiceListResponse {
  data: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<InvoiceStatus, string> = {
  DRAFT: "gray",
  SENT: "blue",
  VIEWED: "purple",
  OVERDUE: "red",
  PARTIALLY_PAID: "orange",
  PAID: "green",
  VOID: "gray",
  WRITE_OFF: "gray",
};

export function InvoiceListClient() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/accounting/invoices?${params}`);
      const data: InvoiceListResponse = await response.json();

      setInvoices(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchInvoices();
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/accounting/invoices/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
    } catch (error) {
      console.error("Failed to export invoices:", error);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await fetch(`/api/accounting/invoices/${invoiceId}`, {
        method: "POST",
      });
      await fetchInvoices();
    } catch (error) {
      console.error("Failed to send invoice:", error);
    }
  };

  const columns = [
    {
      key: "invoiceNumber",
      label: "Invoice",
      render: (value: string, invoice: Invoice) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: "clientName",
      label: "Client",
      render: (value: string) => value || "—",
    },
    {
      key: "eventName",
      label: "Event",
      render: (value: string | null) => value || "—",
    },
    {
      key: "total",
      label: "Total",
      render: (_: unknown, invoice: Invoice) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(invoice.total),
    },
    {
      key: "amountPaid",
      label: "Paid",
      render: (_: unknown, invoice: Invoice) => {
        const percentage = (invoice.amountPaid / invoice.total) * 100;
        return (
          <div className="flex items-center gap-2">
            <Progress className="w-16 h-2" value={percentage} />
            <span className="text-sm">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(invoice.amountPaid)}
            </span>
          </div>
        );
      },
    },
    {
      key: "dueDate",
      label: "Due Date",
      render: (value: Date, invoice: Invoice) => {
        const isOverdue =
          !invoice.paidAt &&
          new Date(value) < new Date() &&
          invoice.status !== "VOID";
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {format(new Date(value), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value: InvoiceStatus) => (
        <StatusBadge color={statusColors[value]} status={value} />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_: unknown, invoice: Invoice) => (
        <ButtonGroup>
          <Button
            onClick={() =>
              (window.location.href = `/accounting/invoices/${invoice.id}`)
            }
            size="sm"
            variant="ghost"
          >
            View
          </Button>
          {invoice.status === "DRAFT" && (
            <Button
              onClick={() => handleSendInvoice(invoice.id)}
              size="sm"
              variant="ghost"
            >
              <Send className="w-3 h-3 mr-1" />
              Send
            </Button>
          )}
          {invoice.amountDue > 0 && invoice.status !== "VOID" && (
            <Button
              onClick={() =>
                (window.location.href = `/accounting/invoices/${invoice.id}/pay`)
              }
              size="sm"
              variant="ghost"
            >
              Record Payment
            </Button>
          )}
        </ButtonGroup>
      ),
    },
  ];

  if (loading && invoices.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          action={{
            label: "Create Invoice",
            href: "/accounting/invoices/new",
            icon: Plus,
          }}
          description="Create invoices to bill your clients for events and services"
          illustration="invoice"
          title="No invoices found"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-gray-500 mt-1">
            {total} invoice{total !== 1 ? "s" : ""}
          </p>
        </div>
        <ButtonGroup>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
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
              placeholder="Search invoices..."
              type="text"
              value={searchQuery}
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg"
            onChange={(e) =>
              setStatusFilter(e.target.value as InvoiceStatus | "")
            }
            value={statusFilter}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
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
          data={invoices}
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
