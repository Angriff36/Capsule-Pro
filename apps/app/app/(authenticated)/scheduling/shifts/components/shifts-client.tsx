"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2Icon, PlusIcon, FilterIcon } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { toast } from "sonner";
import { getShifts, getEmployees, getLocations } from "../actions";
import { ShiftDetailModal } from "./shift-detail-modal";
import { ShiftForm } from "./shift-form";

interface Shift {
  id: string;
  schedule_id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  location_id: string;
  location_name: string;
  shift_start: Date;
  shift_end: Date;
  role_during_shift: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

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

export function ShiftsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [shifts, setShifts] = useState<Shift[]>([]);
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
  });

  // Modal state
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch shifts
  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShifts({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setShifts(data.shifts || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load shifts", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);

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
    fetchShifts();
    fetchFilterOptions();
  }, [fetchShifts, fetchFilterOptions]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const queryString = params.toString();
    router.push(`/scheduling/shifts${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRowClick = (shift: Shift) => {
    setSelectedShift(shift);
    setModalOpen(true);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const calculateDuration = (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Table columns
  const columns: ColumnDef<Shift>[] = [
    {
      accessorKey: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.employee_first_name} {row.original.employee_last_name}
          </div>
          <div className="text-sm text-muted-foreground">{row.original.employee_email}</div>
        </div>
      ),
    },
    {
      accessorKey: "shift_start",
      header: "Date",
      cell: ({ row }) => <div>{formatDate(row.original.shift_start)}</div>,
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => (
        <div>
          <div>{formatTime(row.original.shift_start)} - {formatTime(row.original.shift_end)}</div>
          <div className="text-sm text-muted-foreground">{calculateDuration(row.original.shift_start, row.original.shift_end)}</div>
        </div>
      ),
    },
    {
      accessorKey: "location_name",
      header: "Location",
      cell: ({ row }) => row.original.location_name,
    },
    {
      accessorKey: "role_during_shift",
      header: "Role",
      cell: ({ row }) =>
        row.original.role_during_shift ? (
          <Badge variant="outline">{row.original.role_during_shift}</Badge>
        ) : (
          <Badge variant="secondary">{row.original.employee_role}</Badge>
        ),
    },
  ];

  const table = useReactTable({
    data: shifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shifts</h1>
          <p className="text-muted-foreground">
            Manage employee shifts by role, station, and event.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Shift
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <Input
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          className="max-w-[150px]"
        />
        <Input
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          className="max-w-[150px]"
        />
        <Select value={filters.employeeId} onValueChange={(value) => handleFilterChange("employeeId", value)}>
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
        <Select value={filters.locationId} onValueChange={(value) => handleFilterChange("locationId", value)}>
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
        {(filters.startDate || filters.endDate || filters.employeeId || filters.locationId) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ startDate: "", endDate: "", employeeId: "", locationId: "" })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No shifts found. Create a new shift to get started.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} shifts
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ShiftDetailModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedShift(null);
        }}
        shift={selectedShift}
        onDelete={() => {
          fetchShifts();
          setModalOpen(false);
          setSelectedShift(null);
        }}
      />

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Create New Shift</h2>
              <p className="text-muted-foreground">Add a new shift to the schedule.</p>
            </div>
            <ShiftForm
              onSuccess={() => {
                setCreateModalOpen(false);
                fetchShifts();
              }}
              onCancel={() => setCreateModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
