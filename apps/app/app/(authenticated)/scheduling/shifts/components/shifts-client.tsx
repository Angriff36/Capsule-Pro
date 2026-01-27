"use client";

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
  FilterIcon,
  Loader2Icon,
  PlusIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getEmployees, getLocations, getShifts } from "../actions";
import { AutoAssignmentModal } from "./auto-assignment-modal";
import { BulkAssignmentModal } from "./bulk-assignment-modal";
import { ShiftDetailModal } from "./shift-detail-modal";
import { ShiftForm } from "./shift-form";

type Shift = {
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
};

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
};

type Location = {
  id: string;
  name: string;
};

export function ShiftsClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

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
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);

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
    fetchShifts();
    fetchFilterOptions();
  }, [fetchShifts, fetchFilterOptions]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
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

  const handleAutoAssignClick = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShift(shift);
    setAssignmentModalOpen(true);
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
          <div className="text-sm text-muted-foreground">
            {row.original.employee_email}
          </div>
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
          <div>
            {formatTime(row.original.shift_start)} -{" "}
            {formatTime(row.original.shift_end)}
          </div>
          <div className="text-sm text-muted-foreground">
            {calculateDuration(
              row.original.shift_start,
              row.original.shift_end
            )}
          </div>
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          className="text-primary hover:text-primary"
          onClick={(e) => handleAutoAssignClick(row.original, e)}
          size="sm"
          variant="ghost"
        >
          <UserCheckIcon className="h-4 w-4 mr-1" />
          Assign
        </Button>
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setBulkAssignmentModalOpen(true)}
            variant="outline"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Shift
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
        <Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          type="date"
          value={filters.startDate}
        />
        <Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
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
        {(filters.startDate ||
          filters.endDate ||
          filters.employeeId ||
          filters.locationId) && (
          <Button
            onClick={() =>
              setFilters({
                startDate: "",
                endDate: "",
                employeeId: "",
                locationId: "",
              })
            }
            size="sm"
            variant="ghost"
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
                  <Loader2Icon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : shifts.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No shifts found. Create a new shift to get started.
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} shifts
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
      <ShiftDetailModal
        onClose={() => {
          setModalOpen(false);
          setSelectedShift(null);
        }}
        onDelete={() => {
          fetchShifts();
          setModalOpen(false);
          setSelectedShift(null);
        }}
        open={modalOpen}
        shift={selectedShift}
      />

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Create New Shift</h2>
              <p className="text-muted-foreground">
                Add a new shift to the schedule.
              </p>
            </div>
            <ShiftForm
              onCancel={() => setCreateModalOpen(false)}
              onSuccess={() => {
                setCreateModalOpen(false);
                fetchShifts();
              }}
            />
          </div>
        </div>
      )}

      {/* Auto-Assignment Modal */}
      <AutoAssignmentModal
        onClose={() => {
          setAssignmentModalOpen(false);
          setSelectedShift(null);
        }}
        open={assignmentModalOpen}
        shiftDetails={
          selectedShift
            ? {
                title: `Shift for ${selectedShift.employee_first_name} ${selectedShift.employee_last_name}`,
                startTime: selectedShift.shift_start,
                endTime: selectedShift.shift_end,
                locationName: selectedShift.location_name,
                role: selectedShift.role_during_shift || undefined,
              }
            : undefined
        }
        shiftId={selectedShift?.id || ""}
      />

      {/* Bulk Assignment Modal */}
      <BulkAssignmentModal
        filters={{
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          locationId: filters.locationId || undefined,
        }}
        onClose={() => {
          setBulkAssignmentModalOpen(false);
        }}
        open={bulkAssignmentModalOpen}
      />
    </div>
  );
}
