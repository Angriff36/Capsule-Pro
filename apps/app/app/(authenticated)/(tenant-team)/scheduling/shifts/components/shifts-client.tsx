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
import { EmptyListState } from "@repo/design-system/components/blocks/illustrated-empty-states";
import { cn } from "@repo/design-system/lib/utils";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2Icon, PlusIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SampleDataImportButton } from "../../../../components/sample-data-import-button";
import { getEmployees, getLocations, getShifts } from "../actions";
import { AutoAssignmentModal } from "./auto-assignment-modal";
import { BulkAssignmentModal } from "./bulk-assignment-modal";
import { ShiftDetailModal } from "./shift-detail-modal";
import { ShiftForm } from "./shift-form";

interface Shift {
  created_at: Date;
  employeeEmail: string;
  employeeFirstName: string | null;
  employeeId: string;
  employeeLastName: string | null;
  employeeRole: string;
  id: string;
  location_id: string;
  location_name: string;
  notes: string | null;
  role_during_shift: string | null;
  schedule_id: string;
  shift_end: Date;
  shift_start: Date;
  updated_at: Date;
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
    startDate: searchParams?.get("startDate") || "",
    endDate: searchParams?.get("endDate") || "",
    employeeId: searchParams?.get("employeeId") || "",
    locationId: searchParams?.get("locationId") || "",
  });

  // Modal state
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);

  // Track initial mount to avoid URL push on first render
  const isMounted = useRef(false);

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
      setPagination((previous) => data.pagination ?? previous);
    } catch (error) {
      toast.error("Failed to load shifts", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

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

  // Initial load
  useEffect(() => {
    fetchShifts();
    fetchFilterOptions();
  }, [fetchShifts, fetchFilterOptions]);

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
      accessorKey: "shift_start",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-ink text-sm">
          {formatDate(row.original.shift_start)}
        </div>
      ),
    },
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-ink text-sm tabular-nums">
            {formatTime(row.original.shift_start)} –{" "}
            {formatTime(row.original.shift_end)}
          </div>
          <div className="text-muted-foreground text-xs tabular-nums">
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
      cell: ({ row }) => (
        <span className="text-ink text-sm">{row.original.location_name}</span>
      ),
    },
    {
      accessorKey: "role_during_shift",
      header: "Role",
      cell: ({ row }) =>
        row.original.role_during_shift ? (
          <Badge variant="outline">{row.original.role_during_shift}</Badge>
        ) : (
          <Badge variant="secondary">{row.original.employeeRole}</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          className="text-ink hover:bg-soft-stone/60"
          onClick={(e) => handleAutoAssignClick(row.original, e)}
          size="sm"
          variant="ghost"
        >
          <UserCheckIcon className="mr-1 size-4" />
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

  let tableBody: ReactNode;
  if (loading) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell className="h-28 text-center" colSpan={columns.length}>
          <Loader2Icon className="mx-auto size-8 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  } else if (shifts.length === 0) {
    const noFiltersApplied = !(
      filters.startDate ||
      filters.endDate ||
      filters.employeeId ||
      filters.locationId
    );
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell className="p-0" colSpan={columns.length}>
          {noFiltersApplied ? (
            <EmptyListState
              createButtonText="New shift"
              description="Shifts are the scheduled work blocks you assign to staff. Create shifts to build out the roster, then assign teammates, set call times, and publish the schedule."
              itemName="shifts"
              onCreate={() => setCreateModalOpen(true)}
              secondaryAction={
                <SampleDataImportButton onSeeded={fetchShifts} />
              }
              userRole="admin"
            />
          ) : (
            <div className="h-28 px-6 py-10 text-center text-muted-foreground text-sm">
              No shifts match these filters. Open{" "}
              <span className="text-ink">New shift</span> or widen the date
              range.
            </div>
          )}
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

  const hasActiveFilters = Boolean(
    filters.startDate ||
      filters.endDate ||
      filters.employeeId ||
      filters.locationId
  );

  return (
    <KitchenOperationalCanvas>
      <KitchenOperationalHero
        actions={
          <>
            <Button
              className="rounded-full border border-white/30 bg-transparent px-5 font-medium text-[13px] text-white hover:bg-white/10 hover:text-white"
              onClick={() => setBulkAssignmentModalOpen(true)}
              size="sm"
              variant="outline"
            >
              <UsersIcon className="mr-2 size-4" />
              Bulk assign
            </Button>
            <Button
              className="rounded-full bg-white px-5 font-medium text-[13px] text-primary hover:bg-white/90"
              onClick={() => setCreateModalOpen(true)}
              size="sm"
            >
              <PlusIcon className="mr-2 size-4" />
              New shift
            </Button>
          </>
        }
        eyebrow="Scheduling / Shifts"
        lede="Filter by window, teammate, or site. Click a row for detail, overrides, or auto-assignment."
        metrics={
          <KitchenOperationalMetricTiles>
            <KitchenOperationalMetricTile
              caption="In database for this query"
              label="Total shifts"
              value={pagination.total}
            />
            <KitchenOperationalMetricTile
              caption="Rows on this page"
              label="Visible now"
              value={shifts.length}
            />
            <KitchenOperationalMetricTile
              caption="Eligible roster"
              label="Employees"
              value={employees.length}
            />
            <KitchenOperationalMetricTile
              caption="Sites in filter list"
              label="Locations"
              value={locations.length}
            />
          </KitchenOperationalMetricTiles>
        }
        title="Shift roster"
      />

      <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
        <KitchenDashboardFilterAside>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-ink text-xs" htmlFor="flt-start">
                Start date
              </Label>
              <DatePicker
                className="bg-canvas"
                id="flt-start"
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
                value={filters.startDate}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-ink text-xs" htmlFor="flt-end">
                End date
              </Label>
              <DatePicker
                className="bg-canvas"
                id="flt-end"
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
            {hasActiveFilters ? (
              <Button
                className="w-full"
                onClick={() =>
                  setFilters({
                    startDate: "",
                    endDate: "",
                    employeeId: "",
                    locationId: "",
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
            countBadge={`${pagination.total} shifts · page ${pagination.page} / ${Math.max(pagination.totalPages, 1)}`}
            eyebrow="Operations"
            subtitle="Shift placements with role context. Select a row to open the detail drawer."
            title="Scheduled shifts"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] border border-hairline bg-canvas p-8">
            <div className="mb-6 space-y-2">
              <div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                Scheduling
              </div>
              <h2 className="font-normal text-2xl text-ink tracking-[-0.02em]">
                Create shift
              </h2>
              <p className="text-muted-foreground text-sm">
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
                title: `Shift for ${selectedShift.employeeFirstName} ${selectedShift.employeeLastName}`,
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
    </KitchenOperationalCanvas>
  );
}
