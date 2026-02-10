"use client";

import type { TimeOffRequest, TimeOffType } from "@/app/lib/staff/time-off/types";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { FilterIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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

  // Fetch time off requests
  const fetchTimeOffRequests = useCallback(async () => {
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
        page: pagination.page,
        limit: pagination.limit,
      });
      setTimeOffRequests(data.requests || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load time off requests", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination]);

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
      console.error("Failed to load filter options:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTimeOffRequests();
    fetchFilterOptions();
  }, [fetchTimeOffRequests, fetchFilterOptions]);

  // Update URL when filters change
  useEffect(() => {
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
        <div>
          <div className="font-medium">
            {row.original.employee_first_name} {row.original.employee_last_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.employee_email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "date_range",
      header: "Date Range",
      cell: ({ row }) => (
        <div>
          <div>{formatDate(row.original.start_date)}</div>
          <div className="text-sm text-muted-foreground">
            to {formatDate(row.original.end_date)}
          </div>
          <div className="text-sm text-muted-foreground">
            ({calculateDuration(row.original.start_date, row.original.end_date)}
            )
          </div>
        </div>
      ),
    },
    {
      accessorKey: "request_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
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
        <div className="text-sm">
          {formatDate(new Date(row.original.created_at))}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: timeOffRequests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Time Off Requests
          </h1>
          <p className="text-muted-foreground">
            Manage employee time off requests, vacations, and absences.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <PlusIcon className="size-4 mr-2" />
          New Request
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Filters
        </h2>
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Input
            className="max-w-[150px]"
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            placeholder="Start date"
            type="date"
            value={filters.startDate}
          />
          <Input
            className="max-w-[150px]"
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            placeholder="End date"
            type="date"
            value={filters.endDate}
          />
          <Select
            onValueChange={(value) => handleFilterChange("employeeId", value)}
            value={filters.employeeId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => handleFilterChange("locationId", value)}
            value={filters.locationId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => handleFilterChange("status", value)}
            value={filters.status}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => handleFilterChange("type", value)}
            value={filters.type}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All types</SelectItem>
              <SelectItem value="VACATION">Vacation</SelectItem>
              <SelectItem value="SICK_LEAVE">Sick Leave</SelectItem>
              <SelectItem value="PERSONAL_DAY">Personal Day</SelectItem>
              <SelectItem value="BEREAVEMENT">Bereavement</SelectItem>
              <SelectItem value="MATERNITY_LEAVE">Maternity Leave</SelectItem>
              <SelectItem value="PATERNITY_LEAVE">Paternity Leave</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          {(filters.startDate ||
            filters.endDate ||
            filters.employeeId ||
            filters.locationId ||
            filters.status ||
            filters.type) && (
            <Button
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
              variant="ghost"
            >
              Clear filters
            </Button>
          )}
        </div>
      </section>

      {/* Table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            Time Off Requests ({pagination.total})
          </h2>
        </div>
        <div className="border rounded-lg">
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
              {loading ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center"
                    colSpan={columns.length}
                  >
                    <Loader2Icon className="size-8 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : timeOffRequests.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={columns.length}
                  >
                    No time off requests found. Create a new request to get
                    started.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    key={row.id}
                    onClick={() => handleRowClick(row.original)}
                  >
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
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} time off requests
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
      )}

      {/* Detail Modal */}
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

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">
                Create New Time Off Request
              </h2>
              <p className="text-muted-foreground">
                Submit a new time off request.
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
    </div>
  );
}
