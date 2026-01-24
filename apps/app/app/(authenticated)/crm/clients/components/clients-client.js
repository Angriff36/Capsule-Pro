"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsClient = ClientsClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const table_1 = require("@repo/design-system/components/ui/table");
const react_table_1 = require("@tanstack/react-table");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const actions_1 = require("../actions");
function ClientsClient() {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  // State
  const [clients, setClients] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [pagination, setPagination] = (0, react_1.useState)({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  // Filters
  const [filters, setFilters] = (0, react_1.useState)({
    search: searchParams.get("search") || "",
    clientType: searchParams.get("clientType") || undefined,
    source: searchParams.get("source") || "",
  });
  const [searchInput, setSearchInput] = (0, react_1.useState)(
    filters.search || ""
  );
  // Fetch clients
  const fetchClients = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, actions_1.getClients)(
        {
          ...filters,
          search: filters.search || undefined,
          clientType: filters.clientType,
          source: filters.source || undefined,
        },
        pagination.page,
        pagination.limit
      );
      setClients(data.data || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      sonner_1.toast.error("Failed to load clients", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);
  // Initial load
  (0, react_1.useEffect)(() => {
    fetchClients();
  }, [fetchClients]);
  // Update URL when filters change
  (0, react_1.useEffect)(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.clientType) params.set("clientType", filters.clientType);
    if (filters.source) params.set("source", filters.source);
    const queryString = params.toString();
    router.push(`/crm/clients${queryString ? `?${queryString}` : ""}`);
  }, [filters, router]);
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const clearFilters = () => {
    setSearchInput("");
    setFilters({});
    setPagination((prev) => ({ ...prev, page: 1 }));
  };
  const handleRowClick = (client) => {
    router.push(`/crm/clients/${client.id}`);
  };
  const getClientDisplayName = (client) => {
    if (client.clientType === "company" && client.company_name) {
      return client.company_name;
    }
    if (client.first_name || client.last_name) {
      return `${client.first_name || ""} ${client.last_name || ""}`.trim();
    }
    return client.email || "Unnamed Client";
  };
  const getClientSecondaryInfo = (client) => {
    const parts = [];
    if (
      client.clientType === "company" &&
      (client.first_name || client.last_name)
    ) {
      parts.push(`${client.first_name || ""} ${client.last_name || ""}`.trim());
    }
    if (client.email) parts.push(client.email);
    return parts.join(" • ");
  };
  const getLocation = (client) => {
    const parts = [];
    if (client.city) parts.push(client.city);
    if (client.stateProvince) parts.push(client.stateProvince);
    return parts.join(", ") || "—";
  };
  // Table columns
  const columns = [
    {
      accessorKey: "name",
      header: "Client",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            {row.original.clientType === "company" ? (
              <lucide_react_1.Building2Icon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <lucide_react_1.UserIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="font-medium">
              {getClientDisplayName(row.original)}
            </div>
            {getClientSecondaryInfo(row.original) && (
              <div className="text-sm text-muted-foreground">
                {getClientSecondaryInfo(row.original)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => getLocation(row.original),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => row.original.phone || "—",
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) =>
        row.original.tags && row.original.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.slice(0, 2).map((tag) => (
              <badge_1.Badge className="text-xs" key={tag} variant="secondary">
                {tag}
              </badge_1.Badge>
            ))}
            {row.original.tags.length > 2 && (
              <badge_1.Badge className="text-xs" variant="secondary">
                +{row.original.tags.length - 2}
              </badge_1.Badge>
            )}
          </div>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
    },
  ];
  const table = (0, react_table_1.useReactTable)({
    data: clients,
    columns,
    getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
  });
  const hasFilters = filters.search || filters.clientType || filters.source;
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client relationships and contact information.
          </p>
        </div>
        <button_1.Button onClick={() => router.push("/crm/clients/new")}>
          <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
          New Client
        </button_1.Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
        <lucide_react_1.FilterIcon className="h-4 w-4 text-muted-foreground" />

        <form
          className="flex items-center gap-2 flex-1"
          onSubmit={handleSearchSubmit}
        >
          <input_1.Input
            className="max-w-xs"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email..."
            type="text"
            value={searchInput}
          />
          <button_1.Button size="sm" type="submit" variant="secondary">
            Search
          </button_1.Button>
        </form>

        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          onChange={(e) => handleFilterChange("clientType", e.target.value)}
          value={filters.clientType || ""}
        >
          <option value="">All Types</option>
          <option value="company">Companies</option>
          <option value="individual">Individuals</option>
        </select>

        <input_1.Input
          className="max-w-xs"
          onChange={(e) => handleFilterChange("source", e.target.value)}
          placeholder="Source..."
          type="text"
          value={filters.source || ""}
        />

        {hasFilters && (
          <button_1.Button onClick={clearFilters} size="sm" variant="ghost">
            <lucide_react_1.XIcon className="h-4 w-4 mr-2" />
            Clear
          </button_1.Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <lucide_react_1.Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <lucide_react_1.Building2Icon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clients found</h3>
          <p className="text-muted-foreground mb-4">
            {hasFilters
              ? "Try adjusting your filters or search terms."
              : "Get started by adding your first client."}
          </p>
          {!hasFilters && (
            <button_1.Button onClick={() => router.push("/crm/clients/new")}>
              <lucide_react_1.PlusIcon className="h-4 w-4 mr-2" />
              Add Client
            </button_1.Button>
          )}
        </div>
      ) : (
        <>
          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {clients.length} of {pagination.total} clients
          </div>

          {/* Table */}
          <div className="rounded-md border">
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
                {table.getRowModel().rows?.length ? (
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
                ) : (
                  <table_1.TableRow>
                    <table_1.TableCell
                      className="h-24 text-center"
                      colSpan={columns.length}
                    >
                      No results.
                    </table_1.TableCell>
                  </table_1.TableRow>
                )}
              </table_1.TableBody>
            </table_1.Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
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
        </>
      )}
    </div>
  );
}
