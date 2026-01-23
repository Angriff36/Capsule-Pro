"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type BudgetListResponse,
  type EventBudget,
  type EventBudgetStatus,
  getBudgetStatusLabel,
  getVarianceColor,
  listBudgets,
  deleteBudget,
} from "../../../lib/use-budgets";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { CreateBudgetModal } from "./components/create-budget-modal";

export const BudgetsPageClient = () => {
  const router = useRouter();
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<EventBudgetStatus | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<EventBudget | null>(
    null
  );

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: BudgetListResponse = await listBudgets({
        page,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setBudgets(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.total);
    } catch (error) {
      console.error("Failed to load budgets:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load budgets"
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const filteredBudgets = budgets.filter((budget) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      budget.event?.title?.toLowerCase().includes(query) ||
      budget.id.toLowerCase().includes(query)
    );
  });

  const handleDelete = useCallback(async () => {
    if (!budgetToDelete) return;

    try {
      await deleteBudget(budgetToDelete.id);
      toast.success("Budget deleted successfully");
      setDeleteDialogOpen(false);
      setBudgetToDelete(null);
      loadBudgets();
    } catch (error) {
      console.error("Failed to delete budget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget"
      );
    }
  }, [budgetToDelete, loadBudgets]);

  const confirmDelete = (budget: EventBudget) => {
    if (budget.status === "locked") {
      toast.error("Cannot delete a locked budget");
      return;
    }
    setBudgetToDelete(budget);
    setDeleteDialogOpen(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        {/* Header with filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Input
                className="w-64"
                placeholder="Search budgets..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              onValueChange={(value) =>
                setStatusFilter(
                  value === "all" ? "all" : (value as EventBudgetStatus)
                )
              }
              value={statusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            New Budget
          </Button>
        </div>

        {/* Summary stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Budgets</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Draft Budgets</div>
            <div className="text-2xl font-bold">
              {budgets.filter((b) => b.status === "draft").length}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Approved Budgets</div>
            <div className="text-2xl font-bold">
              {budgets.filter((b) => b.status === "approved").length}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="text-muted-foreground text-sm">Total Budgeted</div>
            <div className="text-2xl font-bold">
              {formatCurrency(
                budgets.reduce((sum, b) => sum + b.total_budget_amount, 0)
              )}
            </div>
          </div>
        </div>

        {/* Budgets table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <PlusIcon className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              {searchQuery || statusFilter !== "all"
                ? "No budgets found"
                : "No budgets yet"}
            </h3>
            <p className="mb-4 text-muted-foreground text-sm">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Create your first budget to track event finances"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="mr-2 size-4" />
                Create Budget
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Budgeted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {budget.event?.title || "Unknown Event"}
                        </div>
                        {budget.event?.event_date && (
                          <div className="text-muted-foreground text-xs">
                            {new Date(
                              budget.event.event_date
                            ).toLocaleDateString("en-US", {
                              dateStyle: "medium",
                            })}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          budget.status === "draft"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : budget.status === "approved"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                        variant="outline"
                      >
                        {getBudgetStatusLabel(budget.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        v{budget.version}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(budget.total_budget_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(budget.total_actual_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={getVarianceColor(budget.variance_amount)}>
                        <div className="font-medium">
                          {formatCurrency(budget.variance_amount)}
                        </div>
                        <div className="text-xs">
                          {formatPercentage(budget.variance_percentage)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() =>
                            router.push(`/events/budgets/${budget.id}`)
                          }
                          size="sm"
                          variant="ghost"
                        >
                          View
                        </Button>
                        {budget.status !== "locked" && (
                          <Button
                            onClick={() => confirmDelete(budget)}
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                          >
                            Delete
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
                  Showing {Math.min((page - 1) * 20 + 1, totalCount)} to{" "}
                  {Math.min(page * 20, totalCount)} of {totalCount} budgets
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
      </div>

      {/* Create Budget Modal */}
      <CreateBudgetModal
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadBudgets}
        open={isCreateModalOpen}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Budget?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the budget for{" "}
              <strong>{budgetToDelete?.event?.title}</strong>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setDeleteDialogOpen(false);
                setBudgetToDelete(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
