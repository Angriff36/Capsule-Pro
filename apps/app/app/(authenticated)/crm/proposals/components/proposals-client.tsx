"use client";

/**
 * Proposals Client Component
 *
 * Client-side component for the proposals list with filtering and search
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
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
import { format } from "date-fns";
import {
  Calendar,
  Copy,
  DollarSign,
  Edit,
  FileText,
  MoreHorizontal,
  Send,
  Trash2,
  View,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Proposal = {
  id: string;
  proposalNumber: string;
  title: string;
  status: string;
  eventDate: string | null;
  guestCount: number | null;
  total: number | null;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  client?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
  lead?: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ProposalsResponse = {
  data: Proposal[];
  pagination: PaginationData;
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "default",
  sent: "secondary",
  viewed: "outline",
  accepted: "default" as const,
  rejected: "destructive",
  expired: "secondary",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

function getClientName(proposal: Proposal): string {
  if (proposal.client?.company_name) {
    return proposal.client.company_name;
  }
  if (proposal.client) {
    return (
      `${proposal.client.first_name || ""} ${proposal.client.last_name || ""}`.trim() ||
      "No name"
    );
  }
  if (proposal.lead?.company_name) {
    return proposal.lead.company_name;
  }
  if (proposal.lead) {
    return (
      `${proposal.lead.first_name || ""} ${proposal.lead.last_name || ""}`.trim() ||
      "No name"
    );
  }
  return "No client";
}

type ProposalsClientProps = {
  initialPage?: number;
  initialSearch?: string;
  initialStatus?: string;
  initialClientId?: string;
};

export function ProposalsClient({
  initialPage = 1,
  initialSearch = "",
  initialStatus = "",
  initialClientId = "",
}: ProposalsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: initialPage,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(searchParams.get("page") || initialPage));
      if (searchParams.get("search")) {
        params.set("search", searchParams.get("search")!);
      }
      if (searchParams.get("status")) {
        params.set("status", searchParams.get("status")!);
      }
      if (searchParams.get("clientId")) {
        params.set("clientId", searchParams.get("clientId")!);
      }

      const response = await fetch(`/api/crm/proposals?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch proposals");
      }

      const data: ProposalsResponse = await response.json();
      setProposals(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to load proposals", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch proposals
  useEffect(() => {
    fetchProposals();
  }, []);

  const updateFilters = () => {
    const params = new URLSearchParams();
    params.set("page", "1");
    if (searchInput) {
      params.set("search", searchInput);
    }
    if (statusFilter) {
      params.set("status", statusFilter);
    }
    if (initialClientId) {
      params.set("clientId", initialClientId);
    }

    router.push(`/crm/proposals?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      updateFilters();
    }
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const _handleStatusChangeOpen = (open: boolean) => {
    if (!open && statusFilter !== "") {
      updateFilters();
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/crm/proposals?${params.toString()}`);
  };

  const handleDeleteClick = (proposal: Proposal) => {
    setProposalToDelete(proposal);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!proposalToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/crm/proposals/${proposalToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete proposal");
      }

      toast.success("Proposal deleted successfully");

      setDeleteDialogOpen(false);
      setProposalToDelete(null);
      fetchProposals();
    } catch (error) {
      console.error("Error deleting proposal:", error);
      toast.error("Failed to delete proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendProposal = async (proposal: Proposal) => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/crm/proposals/${proposal.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to send proposal");
      }

      toast.success("Proposal sent successfully");

      fetchProposals();
    } catch (error) {
      console.error("Error sending proposal:", error);
      toast.error("Failed to send proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDuplicateProposal = async (proposal: Proposal) => {
    try {
      // Fetch full proposal with line items
      const response = await fetch(`/api/crm/proposals/${proposal.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch proposal");
      }

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

      if (!createResponse.ok) {
        throw new Error("Failed to duplicate proposal");
      }

      toast.success("Proposal duplicated successfully");

      fetchProposals();
    } catch (error) {
      console.error("Error duplicating proposal:", error);
      toast.error("Failed to duplicate proposal", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const columns: ColumnDef<Proposal>[] = [
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
          <Badge variant={statusVariants[status] || "default"}>
            {statusLabels[status] || status}
          </Badge>
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(date), "MMM d, yyyy")}
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
            {format(new Date(date), "MMM d, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const proposal = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={`/crm/proposals/${proposal.id}`}>
                  <View className="mr-2 h-4 w-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/crm/proposals/${proposal.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Proposal
                </Link>
              </DropdownMenuItem>
              {proposal.status === "draft" && (
                <DropdownMenuItem
                  disabled={isSending}
                  onClick={() => handleSendProposal(proposal)}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send to Client
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => handleDuplicateProposal(proposal)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteClick(proposal)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: proposals,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Input
            className="max-w-sm"
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            placeholder="Search proposals..."
            value={searchInput}
          />
          <Select onValueChange={handleStatusChange} value={statusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={updateFilters} variant="outline">
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell className="text-center" colSpan={columns.length}>
                  Loading proposals...
                </TableCell>
              </TableRow>
            ) : proposals.length === 0 ? (
              <TableRow>
                <TableCell className="text-center" colSpan={columns.length}>
                  <div className="flex flex-col items-center gap-2 py-8">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No proposals found</p>
                    <Button asChild variant="outline">
                      <Link href="/crm/proposals/new">
                        Create your first proposal
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} proposals
          </p>
          <div className="flex items-center gap-2">
            <Button
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{proposalToDelete?.title}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
