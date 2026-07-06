"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Landmark, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// NOTE: Keeping apiFetch — bank-reconciliation endpoint is a custom aggregation with no generated client

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankAccountRecord {
  accountName: string;
  accountNumber: string;
  description: string | null;
  id: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BankReconciliationClient() {
  // State
  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
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

      const res = await apiFetch(
        `/api/accounting/bank-reconciliation?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error("Failed to load bank accounts");
      }

      const data = await res.json();
      setAccounts(data.data ?? []);
      setTotalCount(data.pagination?.total ?? 0);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load bank accounts"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ---------------------------------------------------------------------------
  // Client-side search
  // ---------------------------------------------------------------------------

  const filteredAccounts = accounts.filter((a) => {
    if (!searchQuery) {
      return true;
    }
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
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-9 w-64 rounded-md border border-hairline bg-transparent px-10 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts..."
            type="text"
            value={searchQuery}
          />
        </div>
        <Button onClick={loadAccounts} size="sm" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Statement matching is not available yet — say so instead of faking it. */}
      <div className="rounded-[22px] border border-hairline bg-muted/20 px-5 py-4 text-muted-foreground text-sm">
        Statement import and per-account matching are not available yet.
        Payments are not linked to individual bank accounts, so this view lists
        your bank accounts without statement balances or reconciliation
        statuses.
      </div>

      {/* Table */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!isLoading && filteredAccounts.length === 0 && (
        <div className="rounded-[22px] border border-hairline border-dashed bg-canvas p-8 text-muted-foreground text-sm">
          {searchQuery
            ? "No accounts match the current search."
            : "No bank accounts found. Add bank accounts to your chart of accounts to see them here."}
        </div>
      )}

      {!isLoading && filteredAccounts.length > 0 && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          {/* Header row */}
          <div className="grid grid-cols-[0.8fr_2fr] gap-3 border-hairline border-b px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
            <span>Account</span>
            <span>Account name</span>
          </div>

          {/* Data rows */}
          {filteredAccounts.map((account) => (
            <div
              className="grid grid-cols-[0.8fr_2fr] gap-3 border-hairline border-b px-5 py-4 text-sm last:border-b-0"
              key={account.id}
            >
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-ink">
                  {account.accountNumber}
                </span>
              </div>

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
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-1 pt-2 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * 25 + 1}&ndash;
            {Math.min(page * 25, totalCount)} of {totalCount}
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
