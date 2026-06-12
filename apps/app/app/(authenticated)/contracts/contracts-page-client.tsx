/**
 * @module ContractsPageClient
 * @intent Interactive unified contracts list with search, status filters, and ResearchTable
 * @responsibility Render aggregated event + vendor contracts with client-side filtering,
 *   status badges, expiry warnings, and compliance indicators
 * @domain Contracts
 * @tags contracts, unified-view, client-component
 * @canonical true
 */

"use client";

import { BlogFilterChip } from "@repo/design-system/components/blocks/blog-filter-chip";
import { MonoLabel } from "@repo/design-system/components/blocks/page-shell";
import { ResearchTable } from "@repo/design-system/components/blocks/research-table";
import { Button } from "@repo/design-system/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContractType = "event" | "vendor";

interface UnifiedContract {
  complianceScore: number | null;
  contractNumber: string | null;
  createdAt: string;
  expiresAt: string | null;
  id: string;
  partyName: string | null;
  status: string;
  title: string;
  type: ContractType;
}

// ---------------------------------------------------------------------------
// Status color map
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  submitted: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  active: "bg-green-100 text-green-700",
  approved: "bg-blue-50 text-blue-600",
  expired: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500 line-through",
  terminated: "bg-slate-100 text-slate-500 line-through",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) {
    return "\u2014";
  }
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatExpiry(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const exp = new Date(iso);
  const now = new Date();
  const diffDays = Math.ceil(
    (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) {
    return `Expired ${Math.abs(diffDays)}d ago`;
  }
  if (diffDays === 0) {
    return "Expires today";
  }
  if (diffDays <= 30) {
    return `Expires in ${diffDays}d`;
  }
  return formatDate(iso);
}

function isExpiringSoon(iso: string | null): boolean {
  if (!iso) {
    return false;
  }
  const exp = new Date(iso);
  const thirty = new Date();
  thirty.setDate(thirty.getDate() + 30);
  return exp <= thirty;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContractsPageClientProps {
  contracts: UnifiedContract[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContractsPageClient({ contracts }: ContractsPageClientProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let result = contracts;

    if (activeFilter !== "all") {
      result = result.filter((c) => c.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.contractNumber?.toLowerCase().includes(q) ||
          c.partyName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [contracts, activeFilter, search]);

  const uniqueStatuses = useMemo(() => {
    const s = new Set(contracts.map((c) => c.status));
    return ["all", ...Array.from(s).sort()];
  }, [contracts]);

  const rows = filtered.map((c) => {
    const expiringWarning =
      isExpiringSoon(c.expiresAt) &&
      !["signed", "cancelled", "terminated", "expired"].includes(c.status);

    return {
      id: c.id,
      title: (
        <div className="flex flex-col gap-1">
          <span className="ds-body-large">{c.title}</span>
          <span className="ds-caption text-ink/50">
            {c.contractNumber || "No number"} &middot;{" "}
            {c.partyName || "No party"}
          </span>
        </div>
      ),
      href: `/contracts/${c.id}`,
      pills: (
        <>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-600"}`}
          >
            {c.status}
          </span>
          <span className="inline-flex items-center rounded-full border border-hairline px-2.5 py-0.5 text-ink/60 text-xs">
            {c.type === "event" ? "Event" : "Vendor"}
          </span>
          {c.complianceScore !== null && c.complianceScore < 80 && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 font-medium text-red-600 text-xs">
              Compliance: {c.complianceScore}
            </span>
          )}
          {expiringWarning && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
              Expiring
            </span>
          )}
        </>
      ),
      meta: (
        <div className="flex flex-col items-end gap-1">
          <span className="ds-caption text-ink/60">
            {formatDate(c.createdAt)}
          </span>
          {c.expiresAt && (
            <span
              className={`ds-mono text-xs ${expiringWarning ? "font-medium text-red-600" : "text-ink/40"}`}
            >
              {formatExpiry(c.expiresAt)}
            </span>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          className="flex-1 rounded-md border border-hairline bg-canvas px-4 py-2 text-ink text-sm placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-[var(--ds-coral-soft)]"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contracts..."
          type="text"
          value={search}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {uniqueStatuses.map((status) => (
          <BlogFilterChip
            key={status}
            onSelect={() => setActiveFilter(status)}
            selected={activeFilter === status}
          >
            {status === "all"
              ? "All"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </BlogFilterChip>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[22px] bg-soft-stone px-6 py-16 text-center">
          <p className="ds-feature-heading text-ink">No contracts found</p>
          <p className="ds-body mt-2 text-ink/60">
            {search || activeFilter !== "all"
              ? "Try adjusting your filters or search."
              : "Create your first contract to get started."}
          </p>
          {!search && activeFilter === "all" && (
            <Button asChild className="mt-4">
              <Link href="/events/contracts">
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <MonoLabel className="text-ink/50">
            {filtered.length} contract{filtered.length === 1 ? "" : "s"}
          </MonoLabel>
          <ResearchTable
            linkComponent={({ href, className, children }) => (
              <Link className={className} href={href}>
                {children}
              </Link>
            )}
            rows={rows}
          />
        </>
      )}
    </div>
  );
}
