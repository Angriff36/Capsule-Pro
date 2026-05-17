"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
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
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeft,
  FileText,
  FilterIcon,
  Loader2Icon,
  PackageIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ---------- Types ----------

interface ReceivingRecord {
  id: string;
  poNumber: string;
  vendorName: string | null;
  status: string;
  receivedAt: string | null;
  receivedBy: string | null;
  totalItems: number;
  receivedItems: number;
  completionPercentage: number;
}

interface ReceivingHistoryResponse {
  records: ReceivingRecord[];
  total: number;
  page: number;
  totalPages: number;
}

interface HistoryFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

// ---------- Helpers ----------

const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  const normalized = status.toLowerCase();
  if (normalized === "received" || normalized === "completed") {
    return "default";
  }
  if (normalized === "partial") {
    return "secondary";
  }
  if (
    normalized === "cancelled" ||
    normalized === "rejected" ||
    normalized === "void"
  ) {
    return "destructive";
  }
  return "outline";
};

const STATUS_SEPARATOR_RE = /[_\s]+/;

const formatStatus = (status: string): string => {
  return status
    .split(STATUS_SEPARATOR_RE)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const getCompletionColor = (pct: number): string => {
  if (pct >= 100) return "bg-emerald-600";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
};

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) {
    return "—";
  }
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ---------- Component ----------

export function ReceivingHistoryClient() {
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState<HistoryFilters>({
    search: "",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const [searchInput, setSearchInput] = useState("");

  // ---------- Data fetching ----------

  const buildQueryParams = useCallback(
    (page: number, limit: number) => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (filters.search) params.set("search", filters.search);
      if (filters.status && filters.status !== "all")
        params.set("status", filters.status);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      return params;
    },
    [filters]
  );

  const fetchHistory = useCallback(
    async (page = 1, limit = 25) => {
      setLoading(true);
      try {
        const params = buildQueryParams(page, limit);
        const response = await fetch(
          `/api/warehouse/receiving/history?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        const data: ReceivingHistoryResponse = await response.json();
        setRecords(data.records ?? []);
        setPagination({
          page: data.page ?? page,
          limit,
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 0,
        });
      } catch (error) {
        toast.error("Failed to load receiving history", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        setRecords([]);
      } finally {
        setLoading(false);
      }
    },
    [buildQueryParams]
  );

  // Re-fetch when filters or page change
  useEffect(() => {
    fetchHistory(pagination.page, pagination.limit);
  }, [fetchHistory, pagination.page, pagination.limit]);

  // ---------- Filter handlers ----------

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDateChange = (key: "dateFrom" | "dateTo", value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ search: "", status: "all", dateFrom: "", dateTo: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasFilters =
    filters.search ||
    (filters.status && filters.status !== "all") ||
    filters.dateFrom ||
    filters.dateTo;

  // ---------- Table definition ----------

  const columns: ColumnDef<ReceivingRecord>[] = [
    {
      accessorKey: "poNumber",
      header: "PO Number",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.poNumber}</span>
      ),
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      cell: ({ row }) =>
        row.original.vendorName || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)}>
          {formatStatus(row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: "receivedAt",
      header: "Received Date",
      cell: ({ row }) => formatDate(row.original.receivedAt),
    },
    {
      accessorKey: "receivedBy",
      header: "Received By",
      cell: ({ row }) =>
        row.original.receivedBy || (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ row }) => (
        <span>
          {row.original.receivedItems} / {row.original.totalItems}
        </span>
      ),
    },
    {
      accessorKey: "completionPercentage",
      header: "Completion",
      cell: ({ row }) => {
        const pct = row.original.completionPercentage;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${getCompletionColor(pct)}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <span className="text-sm tabular-nums">{pct.toFixed(0)}%</span>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // ---------- Render ----------

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link
              className="flex items-center gap-1 text-sm transition-colors hover:text-foreground"
              href="/warehouse/receiving"
            >
              <ArrowLeft className="size-4" />
              Receiving
            </Link>
          </div>
          <h1 className="font-semibold text-2xl tracking-tight">
            Receiving History
          </h1>
          <p className="text-muted-foreground">
            View all receiving records with details
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2" variant="outline">
            <Link href="/warehouse/receiving/reports">
              <FileText className="size-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
        <FilterIcon className="size-4 shrink-0 text-muted-foreground" />

        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={handleSearchSubmit}
        >
          <Input
            className="max-w-[200px]"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search PO number..."
            type="text"
            value={searchInput}
          />
          <Button size="sm" type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Separator className="h-6 shrink-0" orientation="vertical" />

        <Select
          onValueChange={handleStatusChange}
          value={filters.status || "all"}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>

        <Separator className="h-6 shrink-0" orientation="vertical" />

        <Input
          className="w-[150px]"
          onChange={(e) => handleDateChange("dateFrom", e.target.value)}
          placeholder="From date"
          type="date"
          value={filters.dateFrom}
        />
        <Input
          className="w-[150px]"
          onChange={(e) => handleDateChange("dateTo", e.target.value)}
          placeholder="To date"
          type="date"
          value={filters.dateTo}
        />

        {hasFilters && (
          <>
            <Separator className="h-6 shrink-0" orientation="vertical" />
            <Button onClick={clearFilters} size="sm" variant="ghost">
              <XIcon className="mr-2 size-4" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : undefined}

      {!loading && records.length === 0 ? (
        <Card tone="canvas">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
              <PackageIcon className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">
              No receiving records found
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Receiving history will appear once purchase orders have been received."}
          </CardContent>
        </Card>
      ) : undefined}

      {!loading && records.length > 0 ? (
        <>
          {/* Results count */}
          <div className="font-medium text-muted-foreground text-sm">
            Showing {records.length} of {pagination.total} records
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-24 text-center"
                      colSpan={columns.length}
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-muted-foreground text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page - 1,
                    }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: prev.page + 1,
                    }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      ) : undefined}
    </div>
  );
}
