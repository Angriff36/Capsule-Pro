"use client";

/**
 * @module ChartOfAccountsClient
 * @intent Main client component for Chart of Accounts management page
 * @responsibility Render summary cards, filters, and accounts table with actions
 * @domain Accounting
 * @tags chart-of-accounts, page, accounting
 * @canonical true
 */

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { AlertTriangle, FileText, PlusIcon, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ACCOUNT_TYPES,
  type AccountType,
  type ChartOfAccountsFilters,
  type ChartOfAccountWithParent,
  deactivateChartOfAccount,
  getAccountTypeLabel,
  listChartOfAccounts,
} from "@/app/lib/use-chart-of-accounts";
import { AccountModal } from "./components/account-modal";
import { AccountTypeBadge } from "./components/account-type-badge";

export const ChartOfAccountsClient = () => {
  const [accounts, setAccounts] = useState<ChartOfAccountWithParent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [accountTypeFilter, setAccountTypeFilter] = useState<
    AccountType | "all"
  >("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [accountToDeactivate, setAccountToDeactivate] =
    useState<ChartOfAccountWithParent | null>(null);
  const [editAccount, setEditAccount] =
    useState<ChartOfAccountWithParent | null>(null);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ChartOfAccountsFilters = {
        page,
        limit: 50,
        account_type:
          accountTypeFilter === "all" ? undefined : accountTypeFilter,
        include_inactive: includeInactive,
      };

      const response = await listChartOfAccounts(filters);
      setAccounts(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load chart of accounts:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load chart of accounts"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, accountTypeFilter, includeInactive]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      account.account_name.toLowerCase().includes(query) ||
      account.account_number.toLowerCase().includes(query)
    );
  });

  const handleDeactivate = useCallback(async () => {
    if (!accountToDeactivate) {
      return;
    }

    try {
      await deactivateChartOfAccount(accountToDeactivate.id);
      toast.success("Account deactivated successfully");
      setDeactivateDialogOpen(false);
      setAccountToDeactivate(null);
      loadAccounts();
    } catch (error) {
      console.error("Failed to deactivate account:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deactivate account"
      );
    }
  }, [accountToDeactivate, loadAccounts]);

  const confirmDeactivate = (account: ChartOfAccountWithParent) => {
    setAccountToDeactivate(account);
    setDeactivateDialogOpen(true);
  };

  const openEditModal = (account: ChartOfAccountWithParent) => {
    setEditAccount(account);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditAccount(null);
  };

  // Calculate summary stats
  const activeAccountsCount = accounts.filter((acc) => acc.is_active).length;
  const inactiveAccountsCount = accounts.filter((acc) => !acc.is_active).length;

  const accountsByType = ACCOUNT_TYPES.reduce(
    (acc, type) => {
      acc[type] = accounts.filter(
        (account) => account.account_type === type && account.is_active
      ).length;
      return acc;
    },
    {} as Record<AccountType, number>
  );

  return (
    <>
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage your chart of accounts, organize financial categories, and
            track account balances.
          </p>
        </div>

        <Separator />

        {/* Summary Cards */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Overview
          </h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Accounts</CardDescription>
                <CardTitle className="text-2xl">{totalCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Accounts</CardDescription>
                <CardTitle className="text-2xl text-green-600">
                  {activeAccountsCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Inactive Accounts</CardDescription>
                <CardTitle className="text-2xl text-gray-600">
                  {inactiveAccountsCount}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Account Types</CardDescription>
                <div className="flex gap-1 flex-wrap mt-1">
                  {ACCOUNT_TYPES.map((type) => (
                    <Badge className="text-xs" key={type} variant="outline">
                      {getAccountTypeLabel(type)}: {accountsByType[type]}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Filters Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Filters
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-64 pl-10"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search accounts..."
                  type="text"
                  value={searchQuery}
                />
              </div>
              <Select
                onValueChange={(value) =>
                  setAccountTypeFilter(
                    value === "all" ? "all" : (value as AccountType)
                  )
                }
                value={accountTypeFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getAccountTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <input
                  checked={includeInactive}
                  className="h-4 w-4 rounded border-gray-300"
                  id="include-inactive"
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  type="checkbox"
                />
                <label
                  className="text-sm cursor-pointer select-none"
                  htmlFor="include-inactive"
                >
                  Include Inactive
                </label>
              </div>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              New Account
            </Button>
          </div>
        </section>

        {/* Accounts Table Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            Accounts ({filteredAccounts.length})
          </h2>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}
          {!isLoading && filteredAccounts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <FileText className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">
                {searchQuery || accountTypeFilter !== "all"
                  ? "No accounts found"
                  : "No accounts yet"}
              </h3>
              <p className="mb-4 text-muted-foreground text-sm">
                {searchQuery || accountTypeFilter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Create your first account to get started"}
              </p>
              {!searchQuery && accountTypeFilter === "all" && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <PlusIcon className="mr-2 size-4" />
                  Create Account
                </Button>
              )}
            </div>
          )}
          {!isLoading && filteredAccounts.length > 0 && (
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Parent Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">
                        {account.account_number}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {account.account_name}
                        </div>
                        {account.description && (
                          <div className="text-muted-foreground text-xs truncate max-w-xs">
                            {account.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountTypeBadge type={account.account_type} />
                      </TableCell>
                      <TableCell>
                        {account.parent_account_name ? (
                          <span className="text-sm">
                            {account.parent_account_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            account.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }
                          variant="outline"
                        >
                          {account.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openEditModal(account)}
                            size="sm"
                            variant="ghost"
                          >
                            Edit
                          </Button>
                          {account.is_active && (
                            <Button
                              className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                              onClick={() => confirmDeactivate(account)}
                              size="sm"
                              variant="ghost"
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-4">
                  <div className="text-muted-foreground text-sm">
                    Showing {Math.min((page - 1) * 50 + 1, totalCount)} to{" "}
                    {Math.min(page * 50, totalCount)} of {totalCount} accounts
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      size="sm"
                      variant="outline"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-3 text-sm">
                      Page {page} of {totalPages}
                    </div>
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
            </div>
          )}
        </section>
      </div>

      {/* Create/Edit Modal */}
      <AccountModal
        editAccount={editAccount}
        onClose={handleCloseModal}
        onCreated={loadAccounts}
        open={isCreateModalOpen}
        parentAccounts={accounts}
      />

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        onOpenChange={setDeactivateDialogOpen}
        open={deactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-600" />
              Deactivate Account?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate{" "}
              <strong>{accountToDeactivate?.account_name}</strong>? The account
              will no longer be available for transactions but will be retained
              for historical records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDeactivateDialogOpen(false);
                setAccountToDeactivate(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDeactivate} variant="default">
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
