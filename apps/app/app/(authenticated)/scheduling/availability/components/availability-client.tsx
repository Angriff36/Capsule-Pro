"use client";

import type { DayOfWeek } from "@api/staff/availability/types";
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
import { FilterIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getLocations } from "../../shifts/actions";
import { getAvailability, getEmployees } from "../actions";
import { AvailabilityDetailModal } from "./availability-detail-modal";
import { AvailabilityForm } from "./availability-form";

type Availability = {
  id: string;
  employee_id: string;
  employee_first_name: string | null;
  employee_last_name: string | null;
  employee_email: string;
  employee_role: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  effective_from: Date;
  effective_until: Date | null;
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

export function AvailabilityClient() {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // State
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [_locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    employeeId: searchParams.get("employeeId") || "",
    dayOfWeek: searchParams.get("dayOfWeek")
      ? Number.parseInt(searchParams.get("dayOfWeek")!, 10)
      : undefined,
    effectiveDate: searchParams.get("effectiveDate") || "",
    isActive: searchParams.get("isActive") === "true" ? true : undefined,
  });

  // Modal state
  const [selectedAvailability, setSelectedAvailability] =
    useState<Availability | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch availability entries
  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAvailability({
        employeeId: filters.employeeId || undefined,
        dayOfWeek: filters.dayOfWeek as DayOfWeek | undefined,
        effectiveDate: filters.effectiveDate || undefined,
        isActive: filters.isActive,
        page: pagination.page,
        limit: pagination.limit,
      });
      setAvailability(data.availability || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      toast.error("Failed to load availability entries", {
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
    fetchAvailability();
    fetchFilterOptions();
  }, [fetchAvailability, fetchFilterOptions]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        params.set(key, value.toString());
      }
    });
    const queryString = params.toString();
    router.push(
      `/scheduling/availability${queryString ? `?${queryString}` : ""}`
    );
  }, [filters, router]);

  const handleFilterChange = (
    key: string,
    value: string | number | boolean | undefined
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleRowClick = (entry: Availability) => {
    setSelectedAvailability(entry);
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

  // Table columns
  const columns: ColumnDef<Availability>[] = [
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
      accessorKey: "day_of_week",
      header: "Day",
      cell: ({ row }) => {
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return <div>{days[row.original.day_of_week]}</div>;
      },
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => (
        <div>
          <div>
            {formatTime(new Date(`2000-01-01T${row.original.start_time}`))} -{" "}
            {formatTime(new Date(`2000-01-01T${row.original.end_time}`))}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.is_available ? "Available" : "Unavailable"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "effective_from",
      header: "Effective From",
      cell: ({ row }) => <div>{formatDate(row.original.effective_from)}</div>,
    },
    {
      accessorKey: "effective_until",
      header: "Effective Until",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.effective_until
            ? formatDate(row.original.effective_until)
            : "Ongoing"}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: availability,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Availability</h1>
          <p className="text-muted-foreground">
            Manage employee availability and time-off requests.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Availability
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <FilterIcon className="h-4 w-4 text-muted-foreground" />
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
          onValueChange={(value) =>
            handleFilterChange(
              "dayOfWeek",
              value ? Number.parseInt(value, 10) : undefined
            )
          }
          value={filters.dayOfWeek?.toString() || ""}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All days</SelectItem>
            <SelectItem value="0">Sunday</SelectItem>
            <SelectItem value="1">Monday</SelectItem>
            <SelectItem value="2">Tuesday</SelectItem>
            <SelectItem value="3">Wednesday</SelectItem>
            <SelectItem value="4">Thursday</SelectItem>
            <SelectItem value="5">Friday</SelectItem>
            <SelectItem value="6">Saturday</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("effectiveDate", e.target.value)}
          type="date"
          value={filters.effectiveDate}
        />
        <Select
          onValueChange={(value) =>
            handleFilterChange("isActive", value === "true")
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="true">Available</SelectItem>
            <SelectItem value="false">Unavailable</SelectItem>
          </SelectContent>
        </Select>
        {(filters.employeeId ||
          filters.dayOfWeek !== undefined ||
          filters.effectiveDate ||
          filters.isActive !== undefined) && (
          <Button
            onClick={() =>
              setFilters({
                employeeId: "",
                dayOfWeek: undefined,
                effectiveDate: "",
                isActive: undefined,
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
            ) : availability.length === 0 ? (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No availability entries found. Create a new availability entry
                  to get started.
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
            {pagination.total} availability records
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
      <AvailabilityDetailModal
        availability={selectedAvailability}
        onClose={() => {
          setModalOpen(false);
          setSelectedAvailability(null);
        }}
        onDelete={() => {
          fetchAvailability();
          setModalOpen(false);
          setSelectedAvailability(null);
        }}
        open={modalOpen}
      />

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Create New Availability</h2>
              <p className="text-muted-foreground">
                Add an availability entry for an employee.
              </p>
            </div>
            <AvailabilityForm
              onCancel={() => setCreateModalOpen(false)}
              onSuccess={() => {
                setCreateModalOpen(false);
                fetchAvailability();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
