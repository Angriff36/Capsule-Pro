/**
 * @module ProposalsPageClient
 * @intent Interactive proposals list with search, status filter, and actions
 * @responsibility Render the proposal table with client-side filtering, status
 *   badges, action menus, and real-time state updates via server action mutations
 * @domain CRM
 * @tags proposals, crm, client-component
 * @canonical true
 */

"use client";

import { SectionHeader } from "@repo/design-system/components/blocks/page-shell";
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
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MoreHorizontal,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  acceptProposal,
  formatCurrency,
  getClientName,
  getStatusColor,
  getStatusLabel,
  type Proposal,
  type ProposalStatus,
  rejectProposal,
  sendProposal,
  withdrawProposal,
} from "@/app/lib/proposals";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposalSummary {
  acceptedCount: number;
  formattedTotalValue: string;
  pendingCount: number;
  totalCount: number;
  totalValue: number;
}

interface ProposalsPageClientProps {
  proposals: Proposal[];
  summary: ProposalSummary;
}

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "__all__", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "expired", label: "Expired" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProposalsPageClient({
  proposals: initialProposals,
  summary,
}: ProposalsPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Client-side filtering
  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return initialProposals.filter((proposal) => {
      // Status filter
      if (statusFilter !== "__all__" && proposal.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (query) {
        const clientName = getClientName(proposal).toLowerCase();
        const haystack = [
          proposal.title,
          proposal.proposalNumber,
          clientName,
          proposal.venueName ?? "",
          proposal.eventType ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [initialProposals, searchQuery, statusFilter]);

  // Computed filter stats
  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const proposal of initialProposals) {
      counts[proposal.status] = (counts[proposal.status] ?? 0) + 1;
    }
    return counts;
  }, [initialProposals]);

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------

  const handleSend = useCallback(
    async (proposal: Proposal) => {
      setActionInProgress(proposal.id);
      try {
        await sendProposal(proposal.id);
        toast.success("Proposal sent", {
          description: `${proposal.proposalNumber} has been sent to the client.`,
        });
        router.refresh();
      } catch (error) {
        toast.error("Failed to send proposal", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setActionInProgress(null);
      }
    },
    [router]
  );

  const handleAccept = useCallback(
    async (proposal: Proposal) => {
      setActionInProgress(proposal.id);
      try {
        await acceptProposal(proposal.id);
        toast.success("Proposal accepted", {
          description: `${proposal.proposalNumber} marked as accepted.`,
        });
        router.refresh();
      } catch (error) {
        toast.error("Failed to accept proposal", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setActionInProgress(null);
      }
    },
    [router]
  );

  const handleReject = useCallback(
    async (proposal: Proposal) => {
      setActionInProgress(proposal.id);
      try {
        await rejectProposal(proposal.id);
        toast.success("Proposal rejected", {
          description: `${proposal.proposalNumber} marked as rejected.`,
        });
        router.refresh();
      } catch (error) {
        toast.error("Failed to reject proposal", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setActionInProgress(null);
      }
    },
    [router]
  );

  const handleWithdraw = useCallback(
    async (proposal: Proposal) => {
      setActionInProgress(proposal.id);
      try {
        await withdrawProposal(proposal.id);
        toast.success("Proposal withdrawn", {
          description: `${proposal.proposalNumber} has been withdrawn.`,
        });
        router.refresh();
      } catch (error) {
        toast.error("Failed to withdraw proposal", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setActionInProgress(null);
      }
    },
    [router]
  );

  // ---------------------------------------------------------------------------
  // Status badge rendering
  // ---------------------------------------------------------------------------

  const statusBadge = (status: ProposalStatus) => (
    <Badge variant={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
  );

  // ---------------------------------------------------------------------------
  // Available actions per status
  // ---------------------------------------------------------------------------

  const getAvailableActions = (
    proposal: Proposal
  ): Array<{
    label: string;
    icon: React.ReactNode;
    handler: () => void;
    destructive?: boolean;
  }> => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      handler: () => void;
      destructive?: boolean;
    }> = [];

    if (proposal.status === "draft") {
      actions.push({
        label: "Send to client",
        icon: <Send className="mr-2 h-4 w-4" />,
        handler: () => handleSend(proposal),
      });
    }

    if (proposal.status === "sent" || proposal.status === "viewed") {
      actions.push({
        label: "Accept",
        icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        handler: () => handleAccept(proposal),
      });
      actions.push({
        label: "Reject",
        icon: <XCircle className="mr-2 h-4 w-4" />,
        handler: () => handleReject(proposal),
      });
      actions.push({
        label: "Withdraw",
        icon: <ArrowLeft className="mr-2 h-4 w-4" />,
        handler: () => handleWithdraw(proposal),
        destructive: true,
      });
    }

    return actions;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="space-y-4">
      <SectionHeader
        count={`${filtered.length} of ${summary.totalCount}`}
        description="Search, filter, and take action on client proposals."
        eyebrow="Deals"
        title="All proposals"
      />

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, clients, venues..."
            value={searchQuery}
          />
        </div>
        <Select onValueChange={setStatusFilter} value={statusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {option.value !== "__all__" && countsByStatus[option.value]
                  ? ` (${countsByStatus[option.value]})`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas px-4 py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium text-ink">
            {initialProposals.length === 0
              ? "No proposals yet"
              : "No proposals match your filters"}
          </p>
          <p className="mt-1 text-muted-foreground text-sm">
            {initialProposals.length === 0
              ? "Create your first proposal to start tracking deals."
              : "Try adjusting your search or status filter."}
          </p>
          {initialProposals.length === 0 && (
            <Button asChild className="mt-4" variant="outline">
              <Link href="/crm/proposals/new">Create proposal</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          {/* Column headers */}
          <div className="grid grid-cols-[0.7fr_1fr_0.8fr_0.6fr_0.65fr_0.7fr_0.6fr_auto] gap-4 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <span>Proposal #</span>
            <span>Title / Client</span>
            <span>Event</span>
            <span>Status</span>
            <span className="text-right">Total</span>
            <span>Sent</span>
            <span>Valid until</span>
            <span className="sr-only">Actions</span>
          </div>

          {/* Rows */}
          {filtered.map((proposal) => {
            const actions = getAvailableActions(proposal);
            const isActing = actionInProgress === proposal.id;

            return (
              <div
                className="grid grid-cols-[0.7fr_1fr_0.8fr_0.6fr_0.65fr_0.7fr_0.6fr_auto] gap-4 border-hairline border-b px-5 py-4 text-sm transition-colors last:border-b-0 hover:bg-muted/30"
                key={proposal.id}
              >
                {/* Proposal # */}
                <div className="font-mono text-muted-foreground text-xs">
                  {proposal.proposalNumber}
                </div>

                {/* Title / Client */}
                <div className="min-w-0 space-y-1">
                  <Link
                    className="block truncate font-medium text-ink hover:underline"
                    href={`/crm/proposals/${proposal.id}`}
                  >
                    {proposal.title}
                  </Link>
                  <div className="truncate text-muted-foreground text-xs">
                    {getClientName(proposal)}
                  </div>
                </div>

                {/* Event */}
                <div className="space-y-1 text-muted-foreground">
                  <div className="truncate">
                    {proposal.eventType || "\u2014"}
                  </div>
                  {proposal.guestCount ? (
                    <div className="text-xs">
                      {proposal.guestCount.toLocaleString()} guests
                    </div>
                  ) : null}
                </div>

                {/* Status */}
                <div>{statusBadge(proposal.status as ProposalStatus)}</div>

                {/* Total */}
                <div className="text-right font-medium text-ink">
                  {formatCurrency(proposal.total)}
                </div>

                {/* Sent */}
                <div className="text-muted-foreground">
                  {proposal.sentAt ? (
                    <div className="flex items-center gap-1.5">
                      <Send className="h-3 w-3" />
                      <span className="text-xs">
                        {new Date(proposal.sentAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Not sent</span>
                    </div>
                  )}
                </div>

                {/* Valid until */}
                <div className="text-muted-foreground text-xs">
                  {proposal.validUntil
                    ? new Date(proposal.validUntil).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )
                    : "\u2014"}
                </div>

                {/* Actions */}
                <div>
                  {actions.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button disabled={isActing} size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">
                            Actions for {proposal.proposalNumber}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/proposals/${proposal.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/proposals/${proposal.id}/edit`}>
                            <FileText className="mr-2 h-4 w-4" />
                            Edit proposal
                          </Link>
                        </DropdownMenuItem>
                        {actions.length > 0 && <DropdownMenuSeparator />}
                        {actions.map((action) => (
                          <DropdownMenuItem
                            className={
                              action.destructive ? "text-destructive" : ""
                            }
                            disabled={isActing}
                            key={action.label}
                            onClick={action.handler}
                          >
                            {action.icon}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">
                            Actions for {proposal.proposalNumber}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/crm/proposals/${proposal.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
