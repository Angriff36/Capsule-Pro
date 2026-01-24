/**
 * @module ContractsPageClient
 * @intent Client-side filtering, search, and pagination for contracts list
 * @responsibility Handle user interactions for contracts list page
 * @domain Events
 * @tags contracts, events, crm
 * @canonical true
 */
"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractsPageClient = void 0;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const empty_1 = require("@repo/design-system/components/ui/empty");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const statusVariantMap = {
  draft: "outline",
  sent: "default",
  signed: "default",
  expired: "destructive",
  canceled: "secondary",
};
const statusColorMap = {
  draft: "text-gray-600 dark:text-gray-400",
  sent: "text-blue-600 dark:text-blue-400",
  signed: "text-green-600 dark:text-green-400",
  expired: "text-red-600 dark:text-red-400",
  canceled: "text-gray-500 dark:text-gray-500",
};
const getDocumentIcon = (documentType) => {
  switch (documentType) {
    case "application/pdf":
      return <lucide_react_1.FileTextIcon className="size-4" />;
    case "application/json":
      return <lucide_react_1.FileJsonIcon className="size-4" />;
    default:
      return <lucide_react_1.FileIcon className="size-4" />;
  }
};
const ITEMS_PER_PAGE = 12;
const ContractsPageClient = ({
  contracts,
  uniqueStatuses,
  uniqueClients,
  uniqueDocumentTypes,
  tenantId,
}) => {
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [statusFilter, setStatusFilter] = (0, react_1.useState)("all");
  const [clientFilter, setClientFilter] = (0, react_1.useState)("all");
  const [documentTypeFilter, setDocumentTypeFilter] = (0, react_1.useState)(
    "all"
  );
  const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
  // Filter and search contracts
  const filteredContracts = (0, react_1.useMemo)(() => {
    return contracts.filter((contract) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.contractNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contract.client?.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        contract.event?.title.toLowerCase().includes(searchQuery.toLowerCase());
      // Status filter
      const matchesStatus =
        statusFilter === "all" || contract.status === statusFilter;
      // Client filter
      const matchesClient =
        clientFilter === "all" || contract.client?.name === clientFilter;
      // Document type filter
      const matchesDocumentType =
        documentTypeFilter === "all" ||
        contract.documentType === documentTypeFilter;
      return (
        matchesSearch && matchesStatus && matchesClient && matchesDocumentType
      );
    });
  }, [contracts, searchQuery, statusFilter, clientFilter, documentTypeFilter]);
  // Pagination
  const totalPages = Math.ceil(filteredContracts.length / ITEMS_PER_PAGE);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  // Reset to page 1 when filters change
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };
  const handleClientFilterChange = (value) => {
    setClientFilter(value);
    setCurrentPage(1);
  };
  const handleDocumentTypeFilterChange = (value) => {
    setDocumentTypeFilter(value);
    setCurrentPage(1);
  };
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setClientFilter("all");
    setDocumentTypeFilter("all");
    setCurrentPage(1);
  };
  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    clientFilter !== "all" ||
    documentTypeFilter !== "all";
  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Filters Section */}
      <div className="border-border rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Search
            </label>
            <div className="relative">
              <lucide_react_1.SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input_1.Input
                className="pl-9"
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search contracts..."
                value={searchQuery}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:w-48">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Status
            </label>
            <select_1.Select
              onValueChange={handleStatusFilterChange}
              value={statusFilter}
            >
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="All statuses" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All statuses
                </select_1.SelectItem>
                {uniqueStatuses.map((status) => (
                  <select_1.SelectItem
                    className="capitalize"
                    key={status}
                    value={status}
                  >
                    {status}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          {/* Client Filter */}
          <div className="lg:w-56">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Client
            </label>
            <select_1.Select
              onValueChange={handleClientFilterChange}
              value={clientFilter}
            >
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="All clients" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">
                  All clients
                </select_1.SelectItem>
                {uniqueClients.map((client) => (
                  <select_1.SelectItem key={client} value={client}>
                    {client}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          {/* Document Type Filter */}
          <div className="lg:w-56">
            <label className="text-muted-foreground mb-1.5 block text-sm font-medium">
              Document Type
            </label>
            <select_1.Select
              onValueChange={handleDocumentTypeFilterChange}
              value={documentTypeFilter}
            >
              <select_1.SelectTrigger>
                <select_1.SelectValue placeholder="All types" />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="all">All types</select_1.SelectItem>
                {uniqueDocumentTypes.map((type) => (
                  <select_1.SelectItem key={type} value={type}>
                    {type}
                  </select_1.SelectItem>
                ))}
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button_1.Button
              className="lg:mt-6"
              onClick={clearFilters}
              variant="ghost"
            >
              <lucide_react_1.XIcon className="mr-2 size-4" />
              Clear filters
            </button_1.Button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          Showing {paginatedContracts.length} of {filteredContracts.length}{" "}
          contracts
          {filteredContracts.length !== contracts.length && (
            <span> (filtered from {contracts.length} total)</span>
          )}
        </p>
      </div>

      {/* Contracts Grid */}
      {paginatedContracts.length === 0 ? (
        <empty_1.Empty>
          <empty_1.EmptyHeader>
            <empty_1.EmptyMedia variant="icon">
              <lucide_react_1.FileTextIcon />
            </empty_1.EmptyMedia>
            <empty_1.EmptyTitle>No contracts found</empty_1.EmptyTitle>
            <empty_1.EmptyDescription>
              {hasActiveFilters
                ? "Try adjusting your filters or search query"
                : "No contracts have been created yet"}
            </empty_1.EmptyDescription>
          </empty_1.EmptyHeader>
          {hasActiveFilters ? (
            <empty_1.EmptyContent>
              <button_1.Button onClick={clearFilters} variant="outline">
                Clear filters
              </button_1.Button>
            </empty_1.EmptyContent>
          ) : null}
        </empty_1.Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {paginatedContracts.map((contract) => (
            <link_1.default
              className="group"
              href={`/events/contracts/${contract.id}`}
              key={`${contract.tenantId}-${contract.id}`}
            >
              <card_1.Card className="h-full transition hover:border-primary/40 hover:shadow-md">
                <card_1.CardHeader className="gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <card_1.CardDescription className="flex items-center gap-1.5">
                      {getDocumentIcon(contract.documentType)}
                      <span className="truncate">
                        {contract.contractNumber ?? "No contract number"}
                      </span>
                    </card_1.CardDescription>
                    <badge_1.Badge
                      className={statusColorMap[contract.status] || ""}
                      variant={statusVariantMap[contract.status] || "outline"}
                    >
                      {contract.status}
                    </badge_1.Badge>
                  </div>
                  <card_1.CardTitle className="text-lg line-clamp-2">
                    {contract.title}
                  </card_1.CardTitle>
                  {contract.notes && (
                    <card_1.CardDescription className="line-clamp-2">
                      {contract.notes}
                    </card_1.CardDescription>
                  )}
                </card_1.CardHeader>
                <card_1.CardContent className="grid gap-3 text-sm">
                  {contract.client && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.UserIcon className="size-4 shrink-0" />
                      <span className="truncate">{contract.client.name}</span>
                    </div>
                  )}
                  {contract.event && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <lucide_react_1.CalendarIcon className="size-4 shrink-0" />
                      <span className="truncate">{contract.event.title}</span>
                      <span className="text-muted-foreground/60 text-xs">
                        ({dateFormatter.format(contract.event.eventDate)})
                      </span>
                    </div>
                  )}
                  {contract.expiresAt && (
                    <div
                      className={`flex items-center gap-2 ${
                        contract.status === "expired" ||
                        (
                          new Date(contract.expiresAt) < new Date() &&
                            contract.status !== "signed"
                        )
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      <lucide_react_1.AlertCircleIcon className="size-4 shrink-0" />
                      <span>
                        Expires:{" "}
                        {dateFormatter.format(new Date(contract.expiresAt))}
                      </span>
                    </div>
                  )}
                </card_1.CardContent>
              </card_1.Card>
            </link_1.default>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-border border-t pt-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button_1.Button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                size="sm"
                variant="outline"
              >
                Previous
              </button_1.Button>
              <button_1.Button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                size="sm"
                variant="outline"
              >
                Next
              </button_1.Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
exports.ContractsPageClient = ContractsPageClient;
