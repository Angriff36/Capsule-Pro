"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityClient = AvailabilityClient;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const react_table_1 = require("@tanstack/react-table");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../../shifts/actions");
const actions_2 = require("../actions");
const availability_detail_modal_1 = require("./availability-detail-modal");
const availability_form_1 = require("./availability-form");
function AvailabilityClient() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  // State
  const [availability, setAvailability] = (0, react_1.useState)([]);
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
    employeeId: searchParams.get("employeeId") || "",
    dayOfWeek: searchParams.get("dayOfWeek")
      ? Number.parseInt(searchParams.get("dayOfWeek"))
      : undefined,
    effectiveDate: searchParams.get("effectiveDate") || "",
    isActive: searchParams.get("isActive") === "true" ? true : undefined,
  });
  // Modal state
  const [selectedAvailability, setSelectedAvailability] = (0, react_1.useState)(
    null
  );
  const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
  const [createModalOpen, setCreateModalOpen] = (0, react_1.useState)(false);
  // Fetch availability entries
  const fetchAvailability = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, actions_2.getAvailability)({
        employeeId: filters.employeeId || undefined,
        dayOfWeek: filters.dayOfWeek,
        effectiveDate: filters.effectiveDate || undefined,
        isActive: filters.isActive,
        page: pagination.page,
        limit: pagination.limit,
      });
      setAvailability(data.availability || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      sonner_1.toast.error("Failed to load availability entries", {
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
        (0, actions_2.getEmployees)(),
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
    fetchAvailability();
    fetchFilterOptions();
  }, [fetchAvailability, fetchFilterOptions]);
  // Update URL when filters change
  (0, react_1.useEffect)(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "")
        params.set(key, value.toString());
    });
    const queryString = params.toString();
    router.push(
      `/scheduling/availability${queryString ? `?${queryString}` : ""}`
    );
  }, [filters, router]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handleRowClick = (entry) => {
    setSelectedAvailability(entry);
    setModalOpen(true);
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
  const table = (0, react_table_1.useReactTable)({
    data: availability,
    columns,
    getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
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
        <button_1.Button onClick={() => setCreateModalOpen(true)}>
          <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
          New Availability
        </button_1.Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <lucide_react_1.FilterIcon className="h-4 w-4 text-muted-foreground" />
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
          onValueChange={(value) =>
            handleFilterChange(
              "dayOfWeek",
              value ? Number.parseInt(value) : undefined
            )
          }
          value={filters.dayOfWeek?.toString() || ""}
        >
          <select_1.SelectTrigger className="w-[200px]">
            <select_1.SelectValue placeholder="Filter by day" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All days</select_1.SelectItem>
            <select_1.SelectItem value="0">Sunday</select_1.SelectItem>
            <select_1.SelectItem value="1">Monday</select_1.SelectItem>
            <select_1.SelectItem value="2">Tuesday</select_1.SelectItem>
            <select_1.SelectItem value="3">Wednesday</select_1.SelectItem>
            <select_1.SelectItem value="4">Thursday</select_1.SelectItem>
            <select_1.SelectItem value="5">Friday</select_1.SelectItem>
            <select_1.SelectItem value="6">Saturday</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <input_1.Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("effectiveDate", e.target.value)}
          type="date"
          value={filters.effectiveDate}
        />
        <select_1.Select
          onValueChange={(value) =>
            handleFilterChange("isActive", value === "true")
          }
        >
          <select_1.SelectTrigger className="w-[150px]">
            <select_1.SelectValue placeholder="Status" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All</select_1.SelectItem>
            <select_1.SelectItem value="true">Available</select_1.SelectItem>
            <select_1.SelectItem value="false">Unavailable</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        {(filters.employeeId ||
          filters.dayOfWeek !== undefined ||
          filters.effectiveDate ||
          filters.isActive !== undefined) && (
          <button_1.Button
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
            ) : availability.length === 0 ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No availability entries found. Create a new availability entry
                  to get started.
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
            {pagination.total} availability records
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
      <availability_detail_modal_1.AvailabilityDetailModal
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
            <availability_form_1.AvailabilityForm
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
