"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { StatusPill } from "@repo/design-system/components/blocks/page-shell";
import { formatCurrency } from "@repo/design-system/lib/format-currency";
import {
  Landmark,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReconciliationStatus = "RECONCILED" | "PENDING" | "IN_PROGRESS";

interface BankReconciliationRecord {
  id: string;
  accountNumber: string;
  accountName: string;
  description: string | null;
  bookBalance: number;
  statementBalance: number;
  difference: number;
  status: ReconciliationStatus;
  lastReconciledDate: string | null;
  transactionCount: number;
}

interface ReconciliationMetrics {
  totalAccounts: number;
  reconciledCount: number;
  unreconciledCount: number;
  lastReconciledDate: string | null;
}

interface InitialMetrics {
  totalAccounts: number;
  reconciledCount: number;
  unreconciledCount: number;
  lastReconciledDate: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (d: string | null) => {
  if (!d) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
};

const STATUS_CONFIG: Record<
  ReconciliationStatus,
  { label: string; variant: string }
> = {
  RECONCILED: { label: "Reconciled", variant: "default" },
  PENDING: { label: "Pending", variant: "secondary" },
  IN_PROGRESS: { label: "In progress", variant: "outline" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BankReconciliationClientProps {
  initialMetrics: InitialMetrics;
}

export function BankReconciliationClient({
  initialMetrics,
}: BankReconciliationClientProps) {
  // State
  const [accounts, setAccounts] = useState<BankReconciliationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialMetrics.totalAccounts);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await apiFetch(
        `/api/accounting/bank-reconciliation?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to load bank reconciliation data");

      const data = await res.json();
      setAccounts(data.data ?? []);
      setTotalCount(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load bank reconciliation data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ---------------------------------------------------------------------------
  // Client-side search
  // ---------------------------------------------------------------------------

  const filteredAccounts = accounts.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.accountName.toLowerCase().includes(q) ||
      a.accountNumber.toLowerCase().includes(q)
    );
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Filters & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-9 w-64 rounded-md border border-hairline bg-transparent px-10 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts..."
              type="text"
              value={searchQuery}
            />
          </div>
          <Select
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            value={statusFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="RECONCILED">Reconciled</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadAccounts} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={() =>
              toast.info(
                "New reconciliation wizard coming soon. Select an account to begin matching."
              )
            }
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            New reconciliation
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && filteredAccounts.length === 0 && (
        <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
          {searchQuery || statusFilter !== "all"
            ? "No accounts match the current filters. Try adjusting your search or filters."
            : "No bank accounts found. Add bank accounts to your chart of accounts to start reconciling."}
        </div>
      )}

      {!isLoading && filteredAccounts.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          {/* Header row */}
          <div className="grid grid-cols-[0.8fr_1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Account</span>
            <span>Account name</span>
            <span>Book balance</span>
            <span>Statement</span>
            <span>Difference</span>
            <span>Status</span>
            <span>Last reconciled</span>
          </div>

          {/* Data rows */}
          {filteredAccounts.map((account) => (
            <div
              className="grid grid-cols-[0.8fr_1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-hairline px-5 py-4 text-sm last:border-b-0"
              key={account.id}
            >
              {/* Account number */}
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-ink">
                  {account.accountNumber}
                </span>
              </div>

              {/* Account name */}
              <div className="space-y-1">
                <div className="font-medium text-ink">
                  {account.accountName}
                </div>
                {account.description && (
                  <div className="text-muted-foreground">
                    {account.description}
                  </div>
                )}
              </div>

              {/* Book balance */}
              <div className="font-medium text-ink">
                {formatCurrency(account.bookBalance)}
              </div>

              {/* Statement balance */}
              <div className="text-muted-foreground">
                {formatCurrency(account.statementBalance)}
              </div>

              {/* Difference */}
              <div
                className={
                  account.difference > 0.01
                    ? "font-medium text-coral"
                    : "text-muted-foreground"
                }
              >
                {formatCurrency(account.difference)}
              </div>

              {/* Status */}
              <div className="flex items-center">
                <StatusPill>
                  {STATUS_CONFIG[account.status]?.label ?? account.status}
                </StatusPill>
              </div>

              {/* Last reconciled */}
              <div className="text-muted-foreground">
                {formatDate(account.lastReconciledDate)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 25 + 1}&ndash;{Math.min(page * 25, totalCount)}{" "}
            of {totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              size="sm"
              variant="outline"
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              size="sm"
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
