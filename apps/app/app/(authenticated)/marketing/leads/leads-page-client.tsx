/**
 * @module marketing/leads/leads-page-client
 * @intent Interactive client component for the leads listing — search, filter,
 *   status badges, and action menus per lead
 * @responsibility Client-side interactivity for search/filter and lead actions
 * @domain Marketing / CRM
 * @tags leads, marketing, client-component
 * @canonical true
 */

"use client";

import { MonoLabel } from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input } from "@repo/design-system/components/ui/input";
import { MoreHorizontal, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  archiveLead,
  convertLeadToClient,
  disqualifyLead,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusLabel,
  type Lead,
  type LeadStatus,
  type LeadSummary,
} from "@/app/lib/use-leads";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeadsPageClientProps {
  leads: Lead[];
  summary: LeadSummary;
}

// ---------------------------------------------------------------------------
// Filter chips
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { label: string; value: LeadStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Converted", value: "converted" },
  { label: "Disqualified", value: "disqualified" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeadsPageClient({ leads, summary }: LeadsPageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (statusFilter !== "all") {
      result = result.filter((lead) => lead.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.contactName.toLowerCase().includes(q) ||
          (lead.companyName?.toLowerCase().includes(q) ?? false) ||
          (lead.contactEmail?.toLowerCase().includes(q) ?? false) ||
          (lead.eventType?.toLowerCase().includes(q) ?? false) ||
          (lead.source?.toLowerCase().includes(q) ?? false)
      );
    }

    return result;
  }, [leads, statusFilter, searchQuery]);

  // Actions
  const handleConvertToClient = async (leadId: string, name: string) => {
    setActionInProgress(leadId);
    try {
      await convertLeadToClient(leadId);
      toast.success(`"${name}" converted to client`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to convert lead"
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDisqualify = async (leadId: string, name: string) => {
    setActionInProgress(leadId);
    try {
      await disqualifyLead(leadId);
      toast.success(`"${name}" disqualified`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disqualify lead"
      );
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArchive = async (leadId: string, name: string) => {
    setActionInProgress(leadId);
    try {
      await archiveLead(leadId);
      toast.success(`"${name}" archived`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to archive lead"
      );
    } finally {
      setActionInProgress(null);
    }
  };

  // Empty state
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-hairline bg-soft-stone px-6 py-16 text-center">
        <UserPlus className="mb-4 size-10 text-muted-foreground" />
        <h3 className="text-lg font-medium">No leads yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Start tracking potential clients by creating your first lead.
        </p>
        <Button asChild className="mt-4" size="sm">
          <a href="/marketing/leads/new">Create lead</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            value={searchQuery}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-ink text-white"
                  : "border border-hairline bg-canvas text-muted-foreground hover:bg-soft-stone"
              }`}
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              type="button"
            >
              {filter.label}
              {filter.value !== "all" && (
                <span className="ml-1 opacity-60">
                  {filter.value === "new"
                    ? summary.newCount
                    : filter.value === "contacted"
                      ? summary.contactedCount
                      : filter.value === "qualified"
                        ? summary.qualifiedCount
                        : filter.value === "converted"
                          ? summary.convertedCount
                          : summary.disqualifiedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Leads table */}
      <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_130px_100px_100px_44px] gap-2 border-b border-hairline px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Lead</span>
          <span>Status</span>
          <span>Event date</span>
          <span>Guests</span>
          <span className="text-right">Value</span>
          <span />
        </div>

        {/* Table rows */}
        {filteredLeads.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "No leads match your filters."
              : "No leads found."}
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {filteredLeads.map((lead) => (
              <div
                className="grid grid-cols-[1fr_120px_130px_100px_100px_44px] items-center gap-2 px-4 py-3 text-sm transition-colors hover:bg-soft-stone"
                key={lead.id}
              >
                {/* Lead info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      className="font-medium text-foreground hover:underline"
                      href={`/marketing/leads/${lead.id}`}
                    >
                      {lead.contactName}
                    </a>
                    {lead.possibleDuplicate && (
                      <MonoLabel
                        className="border border-hairline px-1.5 py-0.5 text-[10px] text-amber-700"
                        title="Email matches an existing client or lead"
                      >
                        POSSIBLE DUPLICATE
                      </MonoLabel>
                    )}
                  </div>
                  {lead.companyName && (
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.companyName}
                      {lead.source && (
                        <span className="ml-1 opacity-60">
                          via {lead.source}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Status */}
                <Badge variant={getStatusColor(lead.status as LeadStatus)}>
                  {getStatusLabel(lead.status)}
                </Badge>

                {/* Event date */}
                <span className="text-muted-foreground">
                  {formatDate(lead.eventDate)}
                </span>

                {/* Guests */}
                <span className="text-muted-foreground">
                  {lead.estimatedGuests ?? "\u2014"}
                </span>

                {/* Value */}
                <span className="text-right font-medium">
                  {formatCurrency(lead.estimatedValue)}
                </span>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="size-8"
                      disabled={actionInProgress === lead.id}
                      size="icon"
                      variant="ghost"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={`/marketing/leads/${lead.id}`}>View details</a>
                    </DropdownMenuItem>
                    {lead.status !== "converted" &&
                      lead.status !== "disqualified" && (
                        <>
                          <DropdownMenuSeparator />
                          {(lead.status === "qualified" ||
                            lead.status === "contacted") && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleConvertToClient(lead.id, lead.contactName)
                              }
                            >
                              Convert to client
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() =>
                              handleDisqualify(lead.id, lead.contactName)
                            }
                          >
                            Disqualify
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleArchive(lead.id, lead.contactName)
                            }
                          >
                            Archive
                          </DropdownMenuItem>
                        </>
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
