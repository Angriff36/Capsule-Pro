"use client";

import {
  KitchenDashboardFilterAside,
  KitchenOperationalCanvas,
  KitchenOperationalHero,
  KitchenOperationalMetricTile,
  KitchenOperationalMetricTiles,
  KitchenOperationalSectionLead,
} from "@repo/design-system/components/blocks/page-shell";
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
import type { DayOfWeek } from "@/app/lib/staff/availability/types";
import { getLocations } from "../../shifts/actions";
import { getAvailability, getEmployees } from "../actions";
import { AvailabilityDetailModal } from "./availability-detail-modal";
import { AvailabilityForm } from "./availability-form";

interface Availability {
  createdAt: Date;
  dayOfWeek: number;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  endTime: string;
  id: string;
  isAvailable: boolean;
  startTime: string;
  updatedAt: Date;
}

interface Employee {
  email: string;
  first_name: string | null;
  id: string;
  last_name: string | null;
  role: string;
}

interface Location {
  id: string;
  name: string;
}

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAvailability, setEditingAvailability] =
    useState<Availability | null>(null);

  // Track initial mount to avoid URL push on first render
  const isMounted = useRef(false);

  // Fetch availability entries
  const fetchAvailability = useCallback(
    async (page = 1, limit = 50) => {
      setLoading(true);
      try {
        const data = await getAvailability({
          employeeId: filters.employeeId || undefined,
          dayOfWeek: filters.dayOfWeek as DayOfWeek | undefined,
          effectiveDate: filters.effectiveDate || undefined,
          isActive: filters.isActive,
          page,
          limit,
        });
        setAvailability(data.availability || []);
        setPagination(
          data.pagination || { page, limit, total: 0, totalPages: 0 }
        );
      } catch (error) {
        toast.error("Failed to load availability entries", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch filter options
  const _fetchFilterOptions = useCallback(async () => {
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
    fetchAvailability(pagination.page, pagination.limit);
  }, [fetchAvailability, pagination.page, pagination.limit]);

  // Update URL when filters change (skip initial mount)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
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

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  // Table columns
  const columns: ColumnDef<Availability>[] = [
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
        return (
          <span className="font-medium text-ink text-sm">
            {days[row.original.dayOfWeek]}
          </span>
        );
      },
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-ink text-sm tabular-nums">
            {formatTime(new Date(`2000-01-01T${row.original.startTime}`))} –{" "}
            {formatTime(new Date(`2000-01-01T${row.original.endTime}`))}
          </div>
          <div className="text-muted-foreground text-xs">
            {row.original.isAvailable ? "Available" : "Unavailable"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "effective_from",
      header: "Effective From",
      cell: ({ row }) => (
        <span className="text-ink text-sm">
          {formatDate(row.original.effectiveFrom)}
        </span>
      ),
    },
    {
      accessorKey: "effective_until",
      header: "Effective Until",
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.effectiveUntil
            ? formatDate(row.original.effectiveUntil)
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

  let tableBody: ReactNode;
  if (loading) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell className="h-28 text-center" colSpan={columns.length}>
          <Loader2Icon className="mx-auto size-8 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  } else if (availability.length === 0) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell
          className="h-28 text-center text-muted-foreground text-sm"
          colSpan={columns.length}
        >
          No rows match. Add availability or loosen filters.
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

  const hasActiveFilters =
    Boolean(filters.employeeId) ||
    filters.dayOfWeek !== undefined ||
    Boolean(filters.effectiveDate) ||
    filters.isActive !== undefined;

  let availabilityFilterSelectValue = "__all__";
  if (filters.isActive === true) {
    availabilityFilterSelectValue = "true";
  } else if (filters.isActive === false) {
    availabilityFilterSelectValue = "false";
  }

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
            New availability
          </Button>
        }
        eyebrow="Scheduling / Availability"
        lede="Recurring weekly windows plus effective ranges. Rows open the edit drawer for overrides."
        metrics={
          <KitchenOperationalMetricTiles className="xl:grid-cols-3">
            <KitchenOperationalMetricTile
              caption="Matching filters"
              label="Entries"
              value={pagination.total}
            />
            <KitchenOperationalMetricTile
              caption="Rows on this page"
              label="Visible now"
              value={availability.length}
            />
            <KitchenOperationalMetricTile
              caption="For assignment planning"
              label="Employees"
              value={employees.length}
            />
          </KitchenOperationalMetricTiles>
        }
        title="Team availability patterns"
      />

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <KitchenDashboardFilterAside>
          <div className="space-y-4">
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
              <Label className="text-ink text-xs">Weekday</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    "dayOfWeek",
                    value && value !== "__all__"
                      ? Number.parseInt(value, 10)
                      : undefined
                  )
                }
                value={filters.dayOfWeek?.toString() || "__all__"}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="All days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All days</SelectItem>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs" htmlFor="av-eff">
                Effective on
              </Label>
              <DatePicker
                className="bg-canvas"
                id="av-eff"
                onChange={(e) =>
                  handleFilterChange("effectiveDate", e.target.value)
                }
                value={filters.effectiveDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs">Availability</Label>
              <Select
                onValueChange={(value) =>
                  handleFilterChange(
                    "isActive",
                    value === "__all__" ? undefined : value === "true"
                  )
                }
                value={availabilityFilterSelectValue}
              >
                <SelectTrigger className="w-full bg-canvas">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="true">Available</SelectItem>
                  <SelectItem value="false">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters ? (
              <Button
                className="w-full"
                onClick={() =>
                  setFilters({
                    employeeId: "",
                    dayOfWeek: undefined,
                    effectiveDate: "",
                    isActive: undefined,
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
            subtitle="Sortable grid of availability rules. Availability status is muted under the shift window."
            title="Availability ledger"
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
        onEdit={() => {
          setEditingAvailability(selectedAvailability);
          setModalOpen(false);
          setEditModalOpen(true);
        }}
        open={modalOpen}
      />

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-hairline bg-canvas p-8">
            <div className="mb-6 space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                Scheduling
              </div>
              <h2 className="font-normal text-2xl text-ink tracking-[-0.02em]">
                New availability
              </h2>
              <p className="text-muted-foreground text-sm">
                Add an availability entry for an employee.
              </p>
            </div>
            <AvailabilityForm
              employeeOptions={employees}
              onCancel={() => setCreateModalOpen(false)}
              onSuccess={() => {
                setCreateModalOpen(false);
                fetchAvailability();
              }}
            />
          </div>
        </div>
      )}

      {editModalOpen && editingAvailability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-hairline bg-canvas p-8">
            <div className="mb-6 space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                Scheduling
              </div>
              <h2 className="font-normal text-2xl text-ink tracking-[-0.02em]">
                Edit availability
              </h2>
              <p className="text-muted-foreground text-sm">
                Update this availability entry.
              </p>
            </div>
            <AvailabilityForm
              availability={editingAvailability}
              employeeOptions={employees}
              onCancel={() => {
                setEditModalOpen(false);
                setEditingAvailability(null);
              }}
              onSuccess={() => {
                setEditModalOpen(false);
                setEditingAvailability(null);
                fetchAvailability();
              }}
            />
          </div>
        </div>
      )}
    </KitchenOperationalCanvas>
  );
}
