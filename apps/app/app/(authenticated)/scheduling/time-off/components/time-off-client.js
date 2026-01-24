"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffClient = TimeOffClient;
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
const actions_1 = require("../../shifts/actions");
const actions_2 = require("../actions");
const utils_1 = require("../utils");
const time_off_detail_modal_1 = require("./time-off-detail-modal");
const time_off_form_1 = require("./time-off-form");
function TimeOffClient() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  // State
  const [timeOffRequests, setTimeOffRequests] = (0, react_1.useState)([]);
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
    status: searchParams.get("status") || "",
    type: searchParams.get("type") || "",
  });
  // Modal state
  const [selectedTimeOff, setSelectedTimeOff] = (0, react_1.useState)(null);
  const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
  const [createModalOpen, setCreateModalOpen] = (0, react_1.useState)(false);
  // Fetch time off requests
  const fetchTimeOffRequests = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, actions_2.getTimeOffRequests)({
        employeeId: filters.employeeId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        requestType: filters.type || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setTimeOffRequests(data.requests || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      sonner_1.toast.error("Failed to load time off requests", {
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
    fetchTimeOffRequests();
    fetchFilterOptions();
  }, [fetchTimeOffRequests, fetchFilterOptions]);
  // Update URL when filters change
  (0, react_1.useEffect)(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const queryString = params.toString();
    router.push(`/scheduling/time-off${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handleRowClick = (timeOff) => {
    setSelectedTimeOff(timeOff);
    setModalOpen(true);
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
      accessorKey: "date_range",
      header: "Date Range",
      cell: ({ row }) => (
        <div>
          <div>{(0, utils_1.formatDate)(row.original.start_date)}</div>
          <div className="text-sm text-muted-foreground">
            to {(0, utils_1.formatDate)(row.original.end_date)}
          </div>
          <div className="text-sm text-muted-foreground">
            (
            {(0, utils_1.calculateDuration)(
              row.original.start_date,
              row.original.end_date
            )}
            )
          </div>
        </div>
      ),
    },
    {
      accessorKey: "request_type",
      header: "Type",
      cell: ({ row }) => (
        <badge_1.Badge variant="outline">
          {row.original.request_type
            .replace("_", " ")
            .replace("LEAVE", " Leave")}
        </badge_1.Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        let variant = "secondary";
        const label = row.original.status;
        if (row.original.status === "APPROVED") variant = "default";
        if (row.original.status === "REJECTED") variant = "destructive";
        if (row.original.status === "PENDING") variant = "outline";
        return <badge_1.Badge variant={variant}>{label}</badge_1.Badge>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Requested",
      cell: ({ row }) => (
        <div className="text-sm">
          {(0, utils_1.formatDate)(new Date(row.original.created_at))}
        </div>
      ),
    },
  ];
  const table = (0, react_table_1.useReactTable)({
    data: timeOffRequests,
    columns,
    getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
  });
  return (
    <div className="flex flex-col gap-6">
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
        <button_1.Button onClick={() => setCreateModalOpen(true)}>
          <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
          New Request
        </button_1.Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <lucide_react_1.FilterIcon className="h-4 w-4 text-muted-foreground" />
        <input_1.Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          placeholder="Start date"
          type="date"
          value={filters.startDate}
        />
        <input_1.Input
          className="max-w-[150px]"
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          placeholder="End date"
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
        <select_1.Select
          onValueChange={(value) => handleFilterChange("status", value)}
          value={filters.status}
        >
          <select_1.SelectTrigger className="w-[150px]">
            <select_1.SelectValue placeholder="Status" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All statuses</select_1.SelectItem>
            <select_1.SelectItem value="PENDING">Pending</select_1.SelectItem>
            <select_1.SelectItem value="APPROVED">Approved</select_1.SelectItem>
            <select_1.SelectItem value="REJECTED">Rejected</select_1.SelectItem>
            <select_1.SelectItem value="CANCELLED">
              Cancelled
            </select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <select_1.Select
          onValueChange={(value) => handleFilterChange("type", value)}
          value={filters.type}
        >
          <select_1.SelectTrigger className="w-[150px]">
            <select_1.SelectValue placeholder="Type" />
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="">All types</select_1.SelectItem>
            <select_1.SelectItem value="VACATION">Vacation</select_1.SelectItem>
            <select_1.SelectItem value="SICK_LEAVE">
              Sick Leave
            </select_1.SelectItem>
            <select_1.SelectItem value="PERSONAL_DAY">
              Personal Day
            </select_1.SelectItem>
            <select_1.SelectItem value="BEREAVEMENT">
              Bereavement
            </select_1.SelectItem>
            <select_1.SelectItem value="MATERNITY_LEAVE">
              Maternity Leave
            </select_1.SelectItem>
            <select_1.SelectItem value="PATERNITY_LEAVE">
              Paternity Leave
            </select_1.SelectItem>
            <select_1.SelectItem value="OTHER">Other</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        {(filters.startDate ||
          filters.endDate ||
          filters.employeeId ||
          filters.locationId ||
          filters.status ||
          filters.type) && (
          <button_1.Button
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
            ) : timeOffRequests.length === 0 ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No time off requests found. Create a new request to get
                  started.
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
            {pagination.total} time off requests
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
      <time_off_detail_modal_1.TimeOffDetailModal
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
            <time_off_form_1.TimeOffForm
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
