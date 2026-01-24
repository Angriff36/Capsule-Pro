"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftsClient = ShiftsClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const react_table_1 = require("@tanstack/react-table");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
const auto_assignment_modal_1 = require("./auto-assignment-modal");
const bulk_assignment_modal_1 = require("./bulk-assignment-modal");
const shift_detail_modal_1 = require("./shift-detail-modal");
const shift_form_1 = require("./shift-form");
function ShiftsClient() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  // State
  const [shifts, setShifts] = (0, react_1.useState)([]);
  const [employees, setEmployees] = (0, react_1.useState)([]);
  const [locations, setLocations] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [pagination, setPagination] = (0, react_1.useState)({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  // Filters
  const [filters, setFilters] = (0, react_1.useState)({
    startDate: searchParams.get("startDate") || "",
    endDate: searchParams.get("endDate") || "",
    employeeId: searchParams.get("employeeId") || "",
    locationId: searchParams.get("locationId") || "",
  });
  // Modal state
  const [selectedShift, setSelectedShift] = (0, react_1.useState)(null);
  const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
  const [createModalOpen, setCreateModalOpen] = (0, react_1.useState)(false);
  const [assignmentModalOpen, setAssignmentModalOpen] = (0, react_1.useState)(
    false
  );
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = (0,
  react_1.useState)(false);
  // Fetch shifts
  const fetchShifts = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, actions_1.getShifts)({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setShifts(data.shifts || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      sonner_1.toast.error("Failed to load shifts", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page]);
  // Fetch filter options
  const fetchFilterOptions = (0, react_1.useCallback)(async () => {
    try {
      const [employeesData, locationsData] = await Promise.all([
        (0, actions_1.getEmployees)(),
        (0, actions_1.getLocations)(),
      ]);
      setEmployees(employeesData.employees || []);
      setLocations(locationsData.locations || []);
    } catch (error) {
      console.error("Failed to load filter options:", error);
    }
  }, []);
  // Initial load
  (0, react_1.useEffect)(() => {
    fetchShifts();
    fetchFilterOptions();
  }, [fetchShifts, fetchFilterOptions]);
  // Update URL when filters change
  (0, react_1.useEffect)(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const queryString = params.toString();
    router.push(`/scheduling/shifts${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handleRowClick = (shift) => {
    setSelectedShift(shift);
    setModalOpen(true);
  };
  const handleAutoAssignClick = (shift, e) => {
    e.stopPropagation();
    setSelectedShift(shift);
    setAssignmentModalOpen(true);
  };
  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const calculateDuration = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };
  // Table columns
  const columns = [
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
          <badge_1.Badge variant="outline">
            {row.original.role_during_shift}
          </badge_1.Badge>
        ) : (
          <badge_1.Badge variant="secondary">
            {row.original.employee_role}
          </badge_1.Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <button_1.Button
          className="text-primary hover:text-primary"
          onClick={(e) => handleAutoAssignClick(row.original, e)}
          size="sm"
          variant="ghost"
        >
          <lucide_react_1.UserCheckIcon className="h-4 w-4 mr-1" />
          Assign
        </button_1.Button>
      ),
    },
  ];
  const table = (0, react_table_1.useReactTable)({
    data: shifts,
    columns,
    getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
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
          <button_1.Button
            onClick={() => setBulkAssignmentModalOpen(true)}
            variant="outline"
          >
            <lucide_react_1.UsersIcon className="h-4 w-4 mr-2" />
            Bulk Assign
          </button_1.Button>
          <button_1.Button onClick={() => setCreateModalOpen(true)}>
            <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
            New Shift
          </button_1.Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <lucide_react_1.FilterIcon className="h-4 w-4 text-muted-foreground" />
        <input_1.Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          type="date"
          value={filters.startDate}
        />
        <input_1.Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          type="date"
          value={filters.endDate}
        />
        <select_1.Select
          onValueChange={(value) => handleFilterChange("employeeId", value)}
          value={filters.employeeId}
        >
          <select_1.SelectTrigger className="w-[200px]">
            <select_1.SelectValue placeholder="Filter by employee" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All employees</select_1.SelectItem>
            {employees.map((emp) => (
              <select_1.SelectItem key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
              </select_1.SelectItem>
            ))}
          </select_1.SelectContent>
        </select_1.Select>
        <select_1.Select
          onValueChange={(value) => handleFilterChange("locationId", value)}
          value={filters.locationId}
        >
          <select_1.SelectTrigger className="w-[200px]">
            <select_1.SelectValue placeholder="Filter by location" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All locations</select_1.SelectItem>
            {locations.map((loc) => (
              <select_1.SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </select_1.SelectItem>
            ))}
          </select_1.SelectContent>
        </select_1.Select>
        {(filters.startDate ||
          filters.endDate ||
          filters.employeeId ||
          filters.locationId) && (
          <button_1.Button
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
          </button_1.Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <table_1.Table>
          <table_1.TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <table_1.TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <table_1.TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : (0, react_table_1.flexRender)(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </table_1.TableHead>
                ))}
              </table_1.TableRow>
            ))}
          </table_1.TableHeader>
          <table_1.TableBody>
            {loading ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="h-24 text-center"
                  colSpan={columns.length}
                >
                  <lucide_react_1.Loader2Icon className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </table_1.TableCell>
              </table_1.TableRow>
            ) : shifts.length === 0 ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No shifts found. Create a new shift to get started.
                </table_1.TableCell>
              </table_1.TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <table_1.TableRow
                  className="cursor-pointer hover:bg-muted/50"
                  key={row.id}
                  onClick={() => handleRowClick(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <table_1.TableCell key={cell.id}>
                      {(0, react_table_1.flexRender)(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </table_1.TableCell>
                  ))}
                </table_1.TableRow>
              ))
            )}
          </table_1.TableBody>
        </table_1.Table>
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
            <button_1.Button
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              size="sm"
              variant="outline"
            >
              Previous
            </button_1.Button>
            <button_1.Button
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              size="sm"
              variant="outline"
            >
              Next
            </button_1.Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <shift_detail_modal_1.ShiftDetailModal
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
            <shift_form_1.ShiftForm
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
      <auto_assignment_modal_1.AutoAssignmentModal
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
      <bulk_assignment_modal_1.BulkAssignmentModal
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
