"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalsClient = ProposalsClient;
/**
 * Proposals Client Component
 *
 * Client-side component for the proposals list with filtering and search
 */
const alert_dialog_1 = require("@repo/design-system/components/ui/alert-dialog");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dropdown_menu_1 = require("@repo/design-system/components/ui/dropdown-menu");
const input_1 = require("@repo/design-system/components/ui/input");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const react_table_1 = require("@tanstack/react-table");
const date_fns_1 = require("date-fns");
const lucide_react_1 = require("lucide-react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const statusVariants = {
  draft: "default",
  sent: "secondary",
  viewed: "outline",
  accepted: "default",
  rejected: "destructive",
  expired: "secondary",
};
const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};
function getClientName(proposal) {
  if (proposal.client?.company_name) return proposal.client.company_name;
  if (proposal.client) {
    return (
      `${proposal.client.first_name || ""} ${proposal.client.last_name || ""}`.trim() ||
      "No name"
    );
  }
  if (proposal.lead?.company_name) return proposal.lead.company_name;
  if (proposal.lead) {
    return (
      `${proposal.lead.first_name || ""} ${proposal.lead.last_name || ""}`.trim() ||
      "No name"
    );
  }
  return "No client";
}
function ProposalsClient({
  initialPage = 1,
  initialSearch = "",
  initialStatus = "",
  initialClientId = "",
}) {
  const router = (0, navigation_1.useRouter)();
  const searchParams = (0, navigation_1.useSearchParams)();
  const [proposals, setProposals] = (0, react_1.useState)([]);
  const [pagination, setPagination] = (0, react_1.useState)({
    page: initialPage,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = (0, react_1.useState)(true);
  const [searchInput, setSearchInput] = (0, react_1.useState)(initialSearch);
  const [statusFilter, setStatusFilter] = (0, react_1.useState)(initialStatus);
  const [deleteDialogOpen, setDeleteDialogOpen] = (0, react_1.useState)(false);
  const [proposalToDelete, setProposalToDelete] = (0, react_1.useState)(null);
  const [isDeleting, setIsDeleting] = (0, react_1.useState)(false);
  const [isSending, setIsSending] = (0, react_1.useState)(false);
  // Fetch proposals
  (0, react_1.useEffect)(() => {
    fetchProposals();
  }, [searchParams]);
  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(searchParams.get("page") || initialPage));
      if (searchParams.get("search"))
        params.set("search", searchParams.get("search"));
      if (searchParams.get("status"))
        params.set("status", searchParams.get("status"));
      if (searchParams.get("clientId"))
        params.set("clientId", searchParams.get("clientId"));
      const response = await fetch(`/api/crm/proposals?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch proposals");
      const data = await response.json();
      setProposals(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      sonner_1.toast.error("Failed to load proposals", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const updateFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (searchInput) params.set("search", searchInput);
    if (statusFilter) params.set("status", statusFilter);
    if (initialClientId) params.set("clientId", initialClientId);
    router.push(`/crm/proposals?${params.toString()}`);
  };
  const handleSearchChange = (value) => {
    setSearchInput(value);
  };
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      updateFilters();
    }
  };
  const handleStatusChange = (value) => {
    setStatusFilter(value);
  };
  const handleStatusChangeOpen = (open) => {
    if (!open && statusFilter !== "") {
      updateFilters();
    }
  };
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/crm/proposals?${params.toString()}`);
  };
  const handleDeleteClick = (proposal) => {
    setProposalToDelete(proposal);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!proposalToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/crm/proposals/${proposalToDelete.id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete proposal");
      sonner_1.toast.success("Proposal deleted successfully");
      setDeleteDialogOpen(false);
      setProposalToDelete(null);
      fetchProposals();
    } catch (error) {
      console.error("Error deleting proposal:", error);
      sonner_1.toast.error("Failed to delete proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleSendProposal = async (proposal) => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/crm/proposals/${proposal.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to send proposal");
      sonner_1.toast.success("Proposal sent successfully");
      fetchProposals();
    } catch (error) {
      console.error("Error sending proposal:", error);
      sonner_1.toast.error("Failed to send proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSending(false);
    }
  };
  const handleDuplicateProposal = async (proposal) => {
    try {
      // Fetch full proposal with line items
      const response = await fetch(`/api/crm/proposals/${proposal.id}`);
      if (!response.ok) throw new Error("Failed to fetch proposal");
      const fullProposal = await response.json();
      // Create duplicate
      const createResponse = await fetch("/api/crm/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fullProposal.data,
          title: `${fullProposal.data.title} (Copy)`,
          status: "draft",
          sentAt: null,
          viewedAt: null,
          acceptedAt: null,
          rejectedAt: null,
        }),
      });
      if (!createResponse.ok) throw new Error("Failed to duplicate proposal");
      sonner_1.toast.success("Proposal duplicated successfully");
      fetchProposals();
    } catch (error) {
      console.error("Error duplicating proposal:", error);
      sonner_1.toast.error("Failed to duplicate proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  const columns = [
    {
      accessorKey: "title",
      header: "Proposal",
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <div>
            <div className="font-medium">{proposal.title}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono text-xs">
                {proposal.proposalNumber}
              </span>
              <span>•</span>
              <span>{getClientName(proposal)}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <badge_1.Badge variant={statusVariants[status] || "default"}>
            {statusLabels[status] || status}
          </badge_1.Badge>
        );
      },
    },
    {
      accessorKey: "eventDate",
      header: "Event Date",
      cell: ({ row }) => {
        const date = row.original.eventDate;
        return date ? (
          <div className="flex items-center gap-2 text-sm">
            <lucide_react_1.Calendar className="h-4 w-4 text-muted-foreground" />
            {(0, date_fns_1.format)(new Date(date), "MMM d, yyyy")}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not set</span>
        );
      },
    },
    {
      accessorKey: "guestCount",
      header: "Guests",
      cell: ({ row }) => {
        const count = row.original.guestCount;
        return count ? (
          <span className="text-sm">{count.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => {
        const total = row.original.total;
        return total ? (
          <div className="flex items-center gap-2 text-sm">
            <lucide_react_1.DollarSign className="h-4 w-4 text-muted-foreground" />
            {total.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return (
          <span className="text-sm text-muted-foreground">
            {(0, date_fns_1.format)(new Date(date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger asChild>
              <button_1.Button size="icon" variant="ghost">
                <lucide_react_1.MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </button_1.Button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              <dropdown_menu_1.DropdownMenuLabel>
                Actions
              </dropdown_menu_1.DropdownMenuLabel>
              <dropdown_menu_1.DropdownMenuItem asChild>
                <link_1.default href={`/crm/proposals/${proposal.id}`}>
                  <lucide_react_1.View className="mr-2 h-4 w-4" />
                  View Details
                </link_1.default>
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem asChild>
                <link_1.default href={`/crm/proposals/${proposal.id}/edit`}>
                  <lucide_react_1.Edit className="mr-2 h-4 w-4" />
                  Edit Proposal
                </link_1.default>
              </dropdown_menu_1.DropdownMenuItem>
              {proposal.status === "draft" && (
                <dropdown_menu_1.DropdownMenuItem
                  disabled={isSending}
                  onClick={() => handleSendProposal(proposal)}
                >
                  <lucide_react_1.Send className="mr-2 h-4 w-4" />
                  Send to Client
                </dropdown_menu_1.DropdownMenuItem>
              )}
              <dropdown_menu_1.DropdownMenuItem
                onClick={() => handleDuplicateProposal(proposal)}
              >
                <lucide_react_1.Copy className="mr-2 h-4 w-4" />
                Duplicate
              </dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuSeparator />
              <dropdown_menu_1.DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteClick(proposal)}
              >
                <lucide_react_1.Trash2 className="mr-2 h-4 w-4" />
                Delete
              </dropdown_menu_1.DropdownMenuItem>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>
        );
      },
    },
  ];
  const table = (0, react_table_1.useReactTable)({
    data: proposals,
    columns,
    getCoreRowModel: (0, react_table_1.getCoreRowModel)(),
  });
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <input_1.Input
            className="max-w-sm"
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="Search proposals..."
            value={searchInput}
          />
          <select_1.Select
            onValueChange={handleStatusChange}
            value={statusFilter}
          >
            <select_1.SelectTrigger className="w-[180px]">
              <select_1.SelectValue placeholder="Filter by status" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="">All Statuses</select_1.SelectItem>
              <select_1.SelectItem value="draft">Draft</select_1.SelectItem>
              <select_1.SelectItem value="sent">Sent</select_1.SelectItem>
              <select_1.SelectItem value="viewed">Viewed</select_1.SelectItem>
              <select_1.SelectItem value="accepted">
                Accepted
              </select_1.SelectItem>
              <select_1.SelectItem value="rejected">
                Rejected
              </select_1.SelectItem>
              <select_1.SelectItem value="expired">Expired</select_1.SelectItem>
            </select_1.SelectContent>
          </select_1.Select>
          <button_1.Button onClick={updateFilters} variant="outline">
            Apply Filters
          </button_1.Button>
        </div>
      </div>

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
            {isLoading ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="text-center"
                  colSpan={columns.length}
                >
                  Loading proposals...
                </table_1.TableCell>
              </table_1.TableRow>
            ) : proposals.length === 0 ? (
              <table_1.TableRow>
                <table_1.TableCell
                  className="text-center"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center gap-2 py-8">
                    <lucide_react_1.FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No proposals found</p>
                    <button_1.Button asChild variant="outline">
                      <link_1.default href="/crm/proposals/new">
                        Create your first proposal
                      </link_1.default>
                    </button_1.Button>
                  </div>
                </table_1.TableCell>
              </table_1.TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <table_1.TableRow key={row.id}>
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

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} proposals
          </p>
          <div className="flex items-center gap-2">
            <button_1.Button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </button_1.Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button_1.Button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </button_1.Button>
          </div>
        </div>
      )}

      <alert_dialog_1.AlertDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <alert_dialog_1.AlertDialogContent>
          <alert_dialog_1.AlertDialogHeader>
            <alert_dialog_1.AlertDialogTitle>
              Delete Proposal?
            </alert_dialog_1.AlertDialogTitle>
            <alert_dialog_1.AlertDialogDescription>
              Are you sure you want to delete &quot;{proposalToDelete?.title}
              &quot;? This action cannot be undone.
            </alert_dialog_1.AlertDialogDescription>
          </alert_dialog_1.AlertDialogHeader>
          <alert_dialog_1.AlertDialogFooter>
            <alert_dialog_1.AlertDialogCancel>
              Cancel
            </alert_dialog_1.AlertDialogCancel>
            <alert_dialog_1.AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </alert_dialog_1.AlertDialogAction>
          </alert_dialog_1.AlertDialogFooter>
        </alert_dialog_1.AlertDialogContent>
      </alert_dialog_1.AlertDialog>
    </>
  );
}
