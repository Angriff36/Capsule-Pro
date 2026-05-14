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
import { useQuery } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, UserCheckIcon, UsersIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getEmployees, getLocations, getShifts } from "../actions";
import { AutoAssignmentModal } from "./auto-assignment-modal";
import { BulkAssignmentModal } from "./bulk-assignment-modal";
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

  // Filters (UI state — not server state)
  const [filters, setFilters] = useState({
    startDate: searchParams?.get("startDate") || "",
    endDate: searchParams?.get("endDate") || "",
    employeeId: searchParams?.get("employeeId") || "",
    locationId: searchParams?.get("locationId") || "",
  });

  // Track initial mount to avoid URL push on first render
  const isMounted = useRef(false);

  // =========================================================================
  // TanStack Query: shifts (replaces manual useState + useEffect + useCallback)
  // =========================================================================
  const {
    data: shiftsData,
    isLoading: shiftsLoading,
  } = useQuery({
    queryKey: ["scheduling", "shifts", filters],
    queryFn: () =>
      getShifts({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        employeeId: filters.employeeId || undefined,
        locationId: filters.locationId || undefined,
        page: 1,
        limit: 50,
      }),
    staleTime: 30_000,
  });

  const shifts = shiftsData?.shifts ?? [];
  const pagination = shiftsData?.pagination ?? {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  };

  // =========================================================================
  // TanStack Query: filter options (employees + locations)
  // Shared across all scheduling views — cache automatically deduplicates
  // =========================================================================
  const { data: employeesData } = useQuery({
    queryKey: ["scheduling", "employees"],
    queryFn: async () => getEmployees(),
    staleTime: 5 * 60_000,
  });

  const { data: locationsData } = useQuery({
    queryKey: ["scheduling", "locations"],
    queryFn: async () => getLocations(),
    staleTime: 5 * 60_000,
  });

  const employees: Employee[] = employeesData?.employees ?? [];
  const locations: Location[] = locationsData?.locations ?? [];

  // Modal state (UI state)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);

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
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">
            {row.original.employee_first_name} {row.original.employee_last_name}
          </div>
          <div className="truncate text-muted-foreground text-xs">
            {row.original.employee_email}
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
          <Badge variant="secondary">{row.original.employee_role}</Badge>
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
  if (shiftsLoading) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell className="h-28 text-center" colSpan={columns.length}>
          <Loader2Icon className="mx-auto size-8 animate-spin text-muted-foreground" />
        </TableCell>
      </TableRow>
    );
  } else if (shifts.length === 0) {
    tableBody = (
      <TableRow className="hover:bg-transparent">
        <TableCell
          className="h-28 text-center text-muted-foreground text-sm"
          colSpan={columns.length}
        >
          No shifts match these filters. Open{" "}
          <span className="text-ink">New shift</span> or widen the date range.
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
              className="rounded-full border border-white/30 bg-transparent px-5 text-[13px] font-medium text-white hover:bg-white/10 hover:text-white"
              onClick={() => setBulkAssignmentModalOpen(true)}
              size="sm"
              variant="outline"
            >
              <UsersIcon className="mr-2 size-4" />
              Bulk assign
            </Button>
            <Button
              className="rounded-full bg-white px-5 text-[13px] font-medium text-primary hover:bg-white/90"
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
                <SelectTrigger className="bg-canvas w-full">
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
                <SelectTrigger className="bg-canvas w-full">
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
                      <TableHead className="text-ink/60 text-sm" key={header.id}>
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
        </div>
      </div>

      {/* Modals */}
      {selectedShift && (
        <ShiftDetailModal
          onClose={() => {
            setModalOpen(false);
            setSelectedShift(null);
          }}
          onDelete={() => {
            setModalOpen(false);
            setSelectedShift(null);
          }}
          open={modalOpen}
          shift={selectedShift}
        />
      )}
      {createModalOpen && (
        <ShiftForm
          onCancel={() => setCreateModalOpen(false)}
          onSuccess={() => setCreateModalOpen(false)}
          scheduleId={undefined}
        />
      )}
      {selectedShift && (
        <AutoAssignmentModal
          onClose={() => {
            setAssignmentModalOpen(false);
            setSelectedShift(null);
          }}
          open={assignmentModalOpen}
          shiftId={selectedShift.id}
        />
      )}
      <BulkAssignmentModal
        onClose={() => setBulkAssignmentModalOpen(false)}
        open={bulkAssignmentModalOpen}
      />
    </KitchenOperationalCanvas>
  );
}
