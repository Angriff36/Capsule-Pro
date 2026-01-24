"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Progress } from "@repo/design-system/components/ui/progress";
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
import type {
  EventBudget,
  EventBudgetStatus,
  CreateEventBudgetInput,
  UpdateEventBudgetInput,
  EventBudgetFilters,
} from "@/app/lib/use-event-budgets";
import {
  createBudget,
  deleteBudget,
  getBudgets,
  updateBudget,
  getStatusColor,
  formatCurrency,
  getUtilizationColor,
} from "@/app/lib/use-event-budgets";
import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  EditIcon,
  FilterIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CreateBudgetModal } from "./components/create-budget-modal";

export function BudgetsPageClient() {
  const router = useRouter();

  // State
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<EventBudgetFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<EventBudget | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<EventBudget | null>(null);

  // Fetch budgets
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgets(filters);
      setBudgets(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch budgets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Handle create/update
  const handleSave = async (data: CreateEventBudgetInput | UpdateEventBudgetInput) => {
    setActionLoading(true);
    try {
      if (selectedBudget) {
        await updateBudget(selectedBudget.id, data as UpdateEventBudgetInput);
        toast.success("Budget updated successfully");
      } else {
        await createBudget(data as CreateEventBudgetInput);
        toast.success("Budget created successfully");
      }
      setModalOpen(false);
      setSelectedBudget(null);
      await fetchBudgets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save budget");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle view detail
  const handleView = (budget: EventBudget) => {
    router.push(`/events/budgets/${budget.id}`);
  };

  // Handle edit
  const handleEdit = (budget: EventBudget) => {
    setSelectedBudget(budget);
    setModalOpen(true);
  };

  // Handle create
  const handleCreate = () => {
    setSelectedBudget(null);
    setModalOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!budgetToDelete) return;

    setActionLoading(true);
    try {
      await deleteBudget(budgetToDelete.id);
      toast.success("Budget deleted successfully");
      setDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      await fetchBudgets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete budget");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (budget: EventBudget) => {
    setBudgetToDelete(budget);
    setDeleteConfirmOpen(true);
  };

  // Filter budgets by search query
  const filteredBudgets = budgets.filter((budget) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      budget.eventId.toLowerCase().includes(query) ||
      budget.notes?.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const activeBudgets = budgets.filter((b) => b.status === "active").length;
  const totalBudget = budgets
    .filter((b) => b.status === "active")
    .reduce((sum, b) => sum + b.totalBudgetAmount, 0);
  const totalActual = budgets
    .filter((b) => b.status === "active")
    .reduce((sum, b) => sum + b.totalActualAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Event Budgets</h1>
          <p className="text-muted-foreground">
            Manage and track event budgets with line items
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchBudgets} disabled={loading}>
            {loading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBudgets}</div>
            <p className="text-xs text-muted-foreground">
              {budgets.length} total budgets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Active budgets only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spend</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0
                ? `${((totalActual / totalBudget) * 100).toFixed(1)}% utilized`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search budgets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterIcon className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              setFilters({
                ...filters,
                status: value === "all" ? undefined : (value as EventBudgetStatus),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="exceeded">Exceeded</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setFilters({})}
            disabled={Object.keys(filters).length === 0}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Budgets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchQuery || Object.keys(filters).length > 0
                      ? "No budgets match your search criteria"
                      : "No budgets found. Create your first budget to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((budget) => {
                  const utilizationPct =
                    budget.totalBudgetAmount > 0
                      ? (budget.totalActualAmount / budget.totalBudgetAmount) * 100
                      : 0;

                  return (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {budget.eventId.slice(0, 8)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Budget: {formatCurrency(budget.totalBudgetAmount)}
                            </span>
                            <span className="text-muted-foreground">
                              Actual: {formatCurrency(budget.totalActualAmount)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className={getUtilizationColor(utilizationPct)}>
                              {utilizationPct.toFixed(1)}% utilized
                            </span>
                            {budget.varianceAmount < 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <AlertTriangleIcon className="h-3 w-3" />
                                Over budget
                              </span>
                            )}
                          </div>
                          {budget.totalBudgetAmount > 0 && (
                            <Progress
                              value={Math.min(utilizationPct, 100)}
                              className="h-2"
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div
                            className={
                              budget.varianceAmount < 0
                                ? "text-red-600"
                                : budget.varianceAmount > 0
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(Math.abs(budget.varianceAmount))}
                            {budget.varianceAmount < 0 ? " over" : budget.varianceAmount > 0 ? " under" : ""}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {budget.variancePercentage.toFixed(1)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(budget.status)}>
                          {budget.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(budget)}
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(budget)}
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(budget)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <CreateBudgetModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedBudget(null);
        }}
        onSave={handleSave}
        budget={selectedBudget || undefined}
        loading={actionLoading}
      />

      {/* Delete Confirmation */}
      <BudgetDeleteModal
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setBudgetToDelete(null);
        }}
        onConfirm={handleDelete}
        budget={budgetToDelete}
        loading={actionLoading}
      />
    </div>
  );
}

// Delete Confirmation Modal
interface BudgetDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  budget: EventBudget | null;
  loading: boolean;
}

function BudgetDeleteModal({
  open,
  onClose,
  onConfirm,
  budget,
  loading,
}: BudgetDeleteModalProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "" : "hidden"}`}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <div className="mb-4">
          <XCircleIcon className="h-12 w-12 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold">Delete Budget</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete the budget for event &quot;{budget?.eventId.slice(0, 8)}...&quot;? This
          action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Delete Budget
          </Button>
        </div>
      </div>
    </div>
  );
}
