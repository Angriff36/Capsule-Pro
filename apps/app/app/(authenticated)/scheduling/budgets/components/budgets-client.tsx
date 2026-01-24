"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
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
import {
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
import type {
  BudgetFilters,
  BudgetStatus,
  BudgetType,
  CreateBudgetInput,
  LaborBudget,
  UpdateBudgetInput,
} from "@/app/lib/use-labor-budgets";
import {
  createBudget,
  deleteBudget,
  formatUtilization,
  getBudgets,
  getBudgetTypeName,
  getBudgetUnitSymbol,
  getStatusColor,
  getUtilizationColor,
  updateBudget,
} from "@/app/lib/use-labor-budgets";
import { BudgetFormModal } from "./budget-form-modal";

export function BudgetsClient() {
  const router = useRouter();

  // State
  const [budgets, setBudgets] = useState<LaborBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<BudgetFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<LaborBudget | null>(
    null
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<LaborBudget | null>(
    null
  );

  // Fetch budgets
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgets(filters);
      setBudgets(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch budgets"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Handle create/update
  const handleSave = async (data: CreateBudgetInput | UpdateBudgetInput) => {
    setActionLoading(true);
    try {
      if (selectedBudget) {
        await updateBudget(selectedBudget.id, data as UpdateBudgetInput);
        toast.success("Budget updated successfully");
      } else {
        await createBudget(data as CreateBudgetInput);
        toast.success("Budget created successfully");
      }
      setModalOpen(false);
      setSelectedBudget(null);
      await fetchBudgets();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save budget"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (budget: LaborBudget) => {
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
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (budget: LaborBudget) => {
    setBudgetToDelete(budget);
    setDeleteConfirmOpen(true);
  };

  // Filter budgets by search query
  const filteredBudgets = budgets.filter((budget) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      budget.name.toLowerCase().includes(query) ||
      budget.description?.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const activeBudgets = budgets.filter((b) => b.status === "active").length;
  const totalBudgetTarget = budgets
    .filter((b) => b.status === "active" && b.budget_unit === "cost")
    .reduce((sum, b) => sum + b.budget_target, 0);
  const totalActualSpend = budgets
    .filter(
      (b) => b.status === "active" && b.budget_unit === "cost" && b.actual_spend
    )
    .reduce((sum, b) => sum + (b.actual_spend || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Labor Budgets</h1>
          <p className="text-muted-foreground">
            Manage and track labor budgets for your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={loading}
            onClick={fetchBudgets}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={handleCreate} size="sm">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Budgets
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">
              Total Budget Target
            </CardTitle>
            <DollarSignIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalBudgetTarget.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost-based budgets only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spend</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalActualSpend.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBudgetTarget > 0
                ? `${((totalActualSpend / totalBudgetTarget) * 100).toFixed(1)}% utilized`
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
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search budgets..."
            value={searchQuery}
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
          variant="outline"
        >
          <FilterIcon className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 md:grid-cols-4">
          <Select
            onValueChange={(value) =>
              setFilters({
                ...filters,
                budgetType: value === "all" ? undefined : (value as BudgetType),
              })
            }
            value={filters.budgetType || "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Budget Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value) =>
              setFilters({
                ...filters,
                status: value === "all" ? undefined : (value as BudgetStatus),
              })
            }
            value={filters.status || "all"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Button
            disabled={Object.keys(filters).length === 0}
            onClick={() => setFilters({})}
            variant="outline"
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
                <TableHead>Budget Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="h-24 text-center" colSpan={7}>
                    <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredBudgets.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    {searchQuery || Object.keys(filters).length > 0
                      ? "No budgets match your search criteria"
                      : "No budgets found. Create your first budget to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBudgets.map((budget) => {
                  const utilizationPct =
                    budget.actual_spend && budget.budget_target > 0
                      ? (budget.actual_spend / budget.budget_target) * 100
                      : 0;

                  return (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{budget.name}</div>
                          {budget.description && (
                            <div className="text-sm text-muted-foreground">
                              {budget.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getBudgetTypeName(budget.budget_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {budget.period_start && budget.period_end ? (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {new Date(budget.period_start).toLocaleDateString()}{" "}
                            - {new Date(budget.period_end).toLocaleDateString()}
                          </div>
                        ) : budget.event_id ? (
                          <span className="text-sm">
                            Event: {budget.event_id.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Ongoing
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {getBudgetUnitSymbol(budget.budget_unit)}
                            {budget.budget_target.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {budget.budget_unit === "hours" ? "hours" : "cost"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={getUtilizationColor(utilizationPct)}
                            >
                              {budget.actual_spend !== null
                                ? formatUtilization(
                                    budget.actual_spend,
                                    budget.budget_target,
                                    budget.budget_unit
                                  )
                                : "No data"}
                            </span>
                            {budget.actual_spend !== null && (
                              <span
                                className={`font-medium ${getUtilizationColor(
                                  utilizationPct
                                )}`}
                              >
                                {utilizationPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {budget.actual_spend !== null && (
                            <Progress
                              className="h-2"
                              value={Math.min(utilizationPct, 100)}
                            />
                          )}
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
                            onClick={() => handleEdit(budget)}
                            size="sm"
                            variant="ghost"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClick(budget)}
                            size="sm"
                            variant="ghost"
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
      <BudgetFormModal
        budget={selectedBudget || undefined}
        loading={actionLoading}
        onClose={() => {
          setModalOpen(false);
          setSelectedBudget(null);
        }}
        onSave={handleSave}
        open={modalOpen}
      />

      {/* Delete Confirmation */}
      <BudgetDeleteModal
        budget={budgetToDelete}
        loading={actionLoading}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setBudgetToDelete(null);
        }}
        onConfirm={handleDelete}
        open={deleteConfirmOpen}
      />
    </div>
  );
}

// Delete Confirmation Modal
interface BudgetDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  budget: LaborBudget | null;
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
          Are you sure you want to delete the budget &quot;{budget?.name}&quot;?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button disabled={loading} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={loading} onClick={onConfirm} variant="destructive">
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Delete Budget
          </Button>
        </div>
      </div>
    </div>
  );
}
