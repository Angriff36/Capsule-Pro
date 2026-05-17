"use client";

import {
  KitchenDashboardFilterAside,
  KitchenOperationalCanvas,
  KitchenOperationalHero,
  KitchenOperationalMetricTile,
  KitchenOperationalMetricTiles,
  KitchenOperationalSectionLead,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Label } from "@repo/design-system/components/ui/label";
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
import { cn } from "@repo/design-system/lib/utils";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  TimeOffRequest,
  TimeOffType,
} from "@/app/lib/staff/time-off/types";
import { getLocations } from "../../shifts/actions";
import { getEmployees, getTimeOffRequests } from "../actions";
import { calculateDuration, formatDate } from "../utils";
import { TimeOffDetailModal } from "./time-off-detail-modal";
import { TimeOffForm } from "./time-off-form";

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

interface Location {
  id: string;
  name: string;
}

export function TimeOffClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // State
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    employeeId: searchParams.get("employeeId") || "",
    locationId: searchParams.get("locationId") || "",
    status: searchParams.get("status") || "",
    type: searchParams.get("type") || "",
  });

  // Modal state
  const [selectedTimeOff, setSelectedTimeOff] = useState<TimeOffRequest | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Track initial mount to avoid URL push on first render
  const isMounted = useRef(false);

  // Fetch time off requests
  const fetchTimeOffRequests = useCallback(
    async (page = 1, limit = 50) => {
      setLoading(true);
      try {
        const data = await getTimeOffRequests({
          employeeId: filters.employeeId || undefined,
          status:
            (filters.status as
              | "PENDING"
              | "APPROVED"
              | "REJECTED"
              | "CANCELLED") || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          requestType: (filters.type as TimeOffType) || undefined,
          page,
          limit,
        });
        setTimeOffRequests(data.requests || []);
        setPagination(
          data.pagination || { page, limit, total: 0, totalPages: 0 }
        );
      } catch (error) {
        toast.error("Failed to load time off requests", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [employeesData, locationsData] = await Promise.all([
        getEmployees(),
        getLocations(),
      ]);
      setEmployees(employeesData.employees || []);
      setLocations(locationsData.locations || []);
    } catch (error) {
      console.warn("Failed to load filter options:", error);
    }
  }, []);

  // Fetch when filters or pagination change
  useEffect(() => {
    fetchTimeOffRequests(pagination.page, pagination.limit);
    fetchFilterOptions();
  }, [fetchTimeOffRequests, pagination.page, pagination.limit, fetchFilterOptions]);

  // Update URL when filters change (skip initial mount)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.push(`/scheduling/time-off${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRowClick = (timeOff: TimeOffRequest) => {
    setSelectedTimeOff(timeOff);
    setModalOpen(true);
  };

  // Table columns
  const columns: ColumnDef<TimeOffRequest>[] = [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">
            {row.original.employeeFirstName} {row.original.employeeLastName}
          </div>
          <div className="truncate text-muted-foreground text-xs">
            {row.original.employeeEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "date_range",
      header: "Date Range",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-ink text-sm">
            {formatDate(row.original.start_date)}
          </div>
          <div className="text-muted-foreground text-xs">
            through {formatDate(row.original.end_date)}
          </div>
          <div className="text-muted-foreground text-xs tabular-nums">
            {calculateDuration(row.original.start_date, row.original.end_date)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "request_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge className="font-normal" variant="secondary">
          {row.original.request_type
            .replace("_", " ")
            .replace("LEAVE", " Leave")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        let variant: "default" | "secondary" | "destructive" | "outline" =
          "secondary";
        const label = row.original.status;

        if (row.original.status === "APPROVED") {
          variant = "default";
        }
        if (row.original.status === "REJECTED") {
          variant = "destructive";
        }
        if (row.original.status === "PENDING") {
          variant = "outline";
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Requested",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatDate(new Date(row.original.created_at))}
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: timeOffRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  let tableBody: ReactNode;
  if (loading) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell className="h-28 text-center" colSpan={columns.length}>
          <Loader2Icon className="mx-auto size-8 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  } else if (timeOffRequests.length === 0) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell
          className="h-28 text-center text-muted-foreground text-sm"
          colSpan={columns.length}
        >
          No requests match filters. Submit a{" "}
          <span className="text-ink">new request</span> or clear filters.
        </TableCell>
      </TableRow>
    );
  } else {
    tableBody = table.getRowModel().rows.map((row) => (
      <TableRow
        className={cn(
          "cursor-pointer border-hairline border-b transition-colors",
          "hover:bg-soft-stone/40"
        )}
        key={row.id}
        onClick={() => handleRowClick(row.original)}
      >
        {row.getVisibleCells().map((cell) => (
          <TableCell className="align-middle" key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  const pendingOnPage = timeOffRequests.filter(
    (r) => r.status === "PENDING"
  ).length;

  const hasActiveFilters =
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.employeeId) ||
    Boolean(filters.locationId) ||
    Boolean(filters.status) ||
    Boolean(filters.type);

  return (
    <KitchenOperationalCanvas>
      <KitchenOperationalHero
        actions={
          <Button
            className="rounded-full bg-white px-5 font-medium text-[13px] text-primary hover:bg-white/90"
            onClick={() => setCreateModalOpen(true)}
            size="sm"
          >
            <PlusIcon className="mr-2 size-4" />
            New request
          </Button>
        }
        eyebrow="Scheduling / Time off"
        lede="Vacation, sick, and other leave flows. Filter by teammate, status, or window—the row opens approvals and notes."
        metrics={
          <KitchenOperationalMetricTiles className="xl:grid-cols-3">
            <KitchenOperationalMetricTile
              caption="Across filters"
              label="Total requests"
              value={pagination.total}
            />
            <KitchenOperationalMetricTile
              accent="coral"
              caption="Need review soon"
              label="Pending (this page)"
              value={pendingOnPage}
            />
            <KitchenOperationalMetricTile
              caption="For coverage planning"
              label="Employees"
              value={employees.length}
            />
          </KitchenOperationalMetricTiles>
        }
        title="Absence ledger"
      />

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <KitchenDashboardFilterAside>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-ink text-xs" htmlFor="to-start">
                Start
              </Label>
              <DatePicker
                className="bg-canvas"
                id="to-start"
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                value={filters.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs" htmlFor="to-end">
                End
              </Label>
              <DatePicker
                className="bg-canvas"
                id="to-end"
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                value={filters.endDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs">Employee</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    "employeeId",
                    value === "__all__" ? "" : value
                  )
                }
                value={filters.employeeId || "__all__"}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs">Location</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    "locationId",
                    value === "__all__" ? "" : value
                  )
                }
                value={filters.locationId || "__all__"}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs">Status</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange("status", value === "__all__" ? "" : value)
                }
                value={filters.status || "__all__"}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs">Type</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange("type", value === "__all__" ? "" : value)
                }
                value={filters.type || "__all__"}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  <SelectItem value="VACATION">Vacation</SelectItem>
                  <SelectItem value="SICK_LEAVE">Sick Leave</SelectItem>
                  <SelectItem value="PERSONAL_DAY">Personal Day</SelectItem>
                  <SelectItem value="BEREAVEMENT">Bereavement</SelectItem>
                  <SelectItem value="MATERNITY_LEAVE">
                    Maternity Leave
                  </SelectItem>
                  <SelectItem value="PATERNITY_LEAVE">
                    Paternity Leave
                  </SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters ? (
              <Button
                className="w-full"
                onClick={() =>
                  setFilters({
                    startDate: "",
                    endDate: "",
                    employeeId: "",
                    locationId: "",
                    status: "",
                    type: "",
                  })
                }
                size="sm"
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </KitchenDashboardFilterAside>

        <div className="min-w-0 space-y-10">
          <KitchenOperationalSectionLead
            countBadge={`${pagination.total} rows · page ${pagination.page} / ${Math.max(pagination.totalPages, 1)}`}
            eyebrow="Operations"
            subtitle="Statuses stay secondary to the teammate name—open a row for the full timeline."
            title="Time-off queue"
          />
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    className="border-hairline bg-soft-stone/50 hover:bg-soft-stone/50"
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]"
                        key={header.id}
                      >
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
              <TableBody>{tableBody}</TableBody>
            </Table>
          </div>

          {pagination.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-hairline border-t pt-4">
              <p className="text-muted-foreground text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  size="sm"
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <TimeOffDetailModal
        onClose={() => {
          setModalOpen(false);
          setSelectedTimeOff(null);
        }}
        onDelete={() => {
          fetchTimeOffRequests();
          setModalOpen(false);
          setSelectedTimeOff(null);
        }}
        open={modalOpen}
        timeOffRequest={selectedTimeOff}
      />

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-hairline bg-canvas p-8">
            <div className="mb-6 space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                Scheduling
              </div>
              <h2 className="font-normal text-2xl text-ink tracking-[-0.02em]">
                New time-off request
              </h2>
              <p className="text-muted-foreground text-sm">
                Submit a new time-off request for approval.
              </p>
            </div>
            <TimeOffForm
              onCancel={() => setCreateModalOpen(false)}
              onSuccess={() => {
                setCreateModalOpen(false);
                fetchTimeOffRequests();
              }}
            />
          </div>
        </div>
      )}
    </KitchenOperationalCanvas>
  );
}
