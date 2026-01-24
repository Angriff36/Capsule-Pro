"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetsClient = BudgetsClient;
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const progress_1 = require("@repo/design-system/components/ui/progress");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const use_labor_budgets_1 = require("@/app/lib/use-labor-budgets");
const lucide_react_1 = require("lucide-react");
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const budget_form_modal_1 = require("./budget-form-modal");
function BudgetsClient() {
  const router = (0, navigation_1.useRouter)();
  // State
  const [budgets, setBudgets] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
  // Filters
  const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
  const [filters, setFilters] = (0, react_1.useState)({});
  const [showFilters, setShowFilters] = (0, react_1.useState)(false);
  // Modal state
  const [modalOpen, setModalOpen] = (0, react_1.useState)(false);
  const [selectedBudget, setSelectedBudget] = (0, react_1.useState)(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = (0, react_1.useState)(
    false
  );
  const [budgetToDelete, setBudgetToDelete] = (0, react_1.useState)(null);
  // Fetch budgets
  const fetchBudgets = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, use_labor_budgets_1.getBudgets)(filters);
      setBudgets(data);
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to fetch budgets"
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  (0, react_1.useEffect)(() => {
    fetchBudgets();
  }, [fetchBudgets]);
  // Handle create/update
  const handleSave = async (data) => {
    setActionLoading(true);
    try {
      if (selectedBudget) {
        await (0, use_labor_budgets_1.updateBudget)(selectedBudget.id, data);
        sonner_1.toast.success("Budget updated successfully");
      } else {
        await (0, use_labor_budgets_1.createBudget)(data);
        sonner_1.toast.success("Budget created successfully");
      }
      setModalOpen(false);
      setSelectedBudget(null);
      await fetchBudgets();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to save budget"
      );
    } finally {
      setActionLoading(false);
    }
  };
  // Handle edit
  const handleEdit = (budget) => {
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
      await (0, use_labor_budgets_1.deleteBudget)(budgetToDelete.id);
      sonner_1.toast.success("Budget deleted successfully");
      setDeleteConfirmOpen(false);
      setBudgetToDelete(null);
      await fetchBudgets();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to delete budget"
      );
    } finally {
      setActionLoading(false);
    }
  };
  // Handle delete confirmation
  const handleDeleteClick = (budget) => {
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
          <button_1.Button
            disabled={loading}
            onClick={fetchBudgets}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <lucide_react_1.Loader2Icon className="h-4 w-4 animate-spin" />
            ) : (
              <lucide_react_1.RefreshCwIcon className="h-4 w-4" />
            )}
          </button_1.Button>
          <button_1.Button onClick={handleCreate} size="sm">
            <lucide_react_1.PlusIcon className="mr-2 h-4 w-4" />
            New Budget
          </button_1.Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Active Budgets
            </card_1.CardTitle>
            <lucide_react_1.CheckCircle2Icon className="h-4 w-4 text-green-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">{activeBudgets}</div>
            <p className="text-xs text-muted-foreground">
              {budgets.length} total budgets
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Total Budget Target
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-blue-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              ${totalBudgetTarget.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cost-based budgets only
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Actual Spend
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-purple-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              ${totalActualSpend.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalBudgetTarget > 0
                ? `${((totalActualSpend / totalBudgetTarget) * 100).toFixed(1)}% utilized`
                : "N/A"}
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <lucide_react_1.SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input_1.Input
            className="pl-10"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search budgets..."
            value={searchQuery}
          />
        </div>
        <button_1.Button
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
          variant="outline"
        >
          <lucide_react_1.FilterIcon className="mr-2 h-4 w-4" />
          Filters
        </button_1.Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 md:grid-cols-4">
          <select_1.Select
            onValueChange={(value) =>
              setFilters({
                ...filters,
                budgetType: value === "all" ? undefined : value,
              })
            }
            value={filters.budgetType || "all"}
          >
            <select_1.SelectTrigger>
              <select_1.SelectValue placeholder="Budget Type" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="all">All Types</select_1.SelectItem>
              <select_1.SelectItem value="event">Event</select_1.SelectItem>
              <select_1.SelectItem value="week">Weekly</select_1.SelectItem>
              <select_1.SelectItem value="month">Monthly</select_1.SelectItem>
            </select_1.SelectContent>
          </select_1.Select>

          <select_1.Select
            onValueChange={(value) =>
              setFilters({
                ...filters,
                status: value === "all" ? undefined : value,
              })
            }
            value={filters.status || "all"}
          >
            <select_1.SelectTrigger>
              <select_1.SelectValue placeholder="Status" />
            </select_1.SelectTrigger>
            <select_1.SelectContent>
              <select_1.SelectItem value="all">
                All Statuses
              </select_1.SelectItem>
              <select_1.SelectItem value="active">Active</select_1.SelectItem>
              <select_1.SelectItem value="paused">Paused</select_1.SelectItem>
              <select_1.SelectItem value="archived">
                Archived
              </select_1.SelectItem>
            </select_1.SelectContent>
          </select_1.Select>

          <button_1.Button
            disabled={Object.keys(filters).length === 0}
            onClick={() => setFilters({})}
            variant="outline"
          >
            Clear Filters
          </button_1.Button>
        </div>
      )}

      {/* Budgets Table */}
      <card_1.Card>
        <card_1.CardContent className="p-0">
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Budget Name</table_1.TableHead>
                <table_1.TableHead>Type</table_1.TableHead>
                <table_1.TableHead>Period</table_1.TableHead>
                <table_1.TableHead>Target</table_1.TableHead>
                <table_1.TableHead>Utilization</table_1.TableHead>
                <table_1.TableHead>Status</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Actions
                </table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {loading ? (
                <table_1.TableRow>
                  <table_1.TableCell className="h-24 text-center" colSpan={7}>
                    <lucide_react_1.Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : filteredBudgets.length === 0 ? (
                <table_1.TableRow>
                  <table_1.TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={7}
                  >
                    {searchQuery || Object.keys(filters).length > 0
                      ? "No budgets match your search criteria"
                      : "No budgets found. Create your first budget to get started."}
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : (
                filteredBudgets.map((budget) => {
                  const utilizationPct =
                    budget.actual_spend && budget.budget_target > 0
                      ? (budget.actual_spend / budget.budget_target) * 100
                      : 0;
                  return (
                    <table_1.TableRow key={budget.id}>
                      <table_1.TableCell>
                        <div>
                          <div className="font-medium">{budget.name}</div>
                          {budget.description && (
                            <div className="text-sm text-muted-foreground">
                              {budget.description}
                            </div>
                          )}
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <badge_1.Badge variant="outline">
                          {(0, use_labor_budgets_1.getBudgetTypeName)(
                            budget.budget_type
                          )}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        {budget.period_start && budget.period_end ? (
                          <div className="flex items-center gap-2 text-sm">
                            <lucide_react_1.CalendarIcon className="h-4 w-4 text-muted-foreground" />
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
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div>
                          <div className="font-medium">
                            {(0, use_labor_budgets_1.getBudgetUnitSymbol)(
                              budget.budget_unit
                            )}
                            {budget.budget_target.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {budget.budget_unit === "hours" ? "hours" : "cost"}
                          </div>
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span
                              className={(0,
                              use_labor_budgets_1.getUtilizationColor)(
                                utilizationPct
                              )}
                            >
                              {budget.actual_spend !== null
                                ? (0, use_labor_budgets_1.formatUtilization)(
                                    budget.actual_spend,
                                    budget.budget_target,
                                    budget.budget_unit
                                  )
                                : "No data"}
                            </span>
                            {budget.actual_spend !== null && (
                              <span
                                className={`font-medium ${(0, use_labor_budgets_1.getUtilizationColor)(utilizationPct)}`}
                              >
                                {utilizationPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {budget.actual_spend !== null && (
                            <progress_1.Progress
                              className="h-2"
                              value={Math.min(utilizationPct, 100)}
                            />
                          )}
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <badge_1.Badge
                          className={(0, use_labor_budgets_1.getStatusColor)(
                            budget.status
                          )}
                        >
                          {budget.status}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button_1.Button
                            onClick={() => handleEdit(budget)}
                            size="sm"
                            variant="ghost"
                          >
                            <lucide_react_1.EditIcon className="h-4 w-4" />
                          </button_1.Button>
                          <button_1.Button
                            onClick={() => handleDeleteClick(budget)}
                            size="sm"
                            variant="ghost"
                          >
                            <lucide_react_1.Trash2Icon className="h-4 w-4" />
                          </button_1.Button>
                        </div>
                      </table_1.TableCell>
                    </table_1.TableRow>
                  );
                })
              )}
            </table_1.TableBody>
          </table_1.Table>
        </card_1.CardContent>
      </card_1.Card>

      {/* Create/Edit Modal */}
      <budget_form_modal_1.BudgetFormModal
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
function BudgetDeleteModal({ open, onClose, onConfirm, budget, loading }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "" : "hidden"}`}
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
        <div className="mb-4">
          <lucide_react_1.XCircleIcon className="h-12 w-12 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold">Delete Budget</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to delete the budget &quot;{budget?.name}&quot;?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button_1.Button
            disabled={loading}
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </button_1.Button>
          <button_1.Button
            disabled={loading}
            onClick={onConfirm}
            variant="destructive"
          >
            {loading && (
              <lucide_react_1.Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete Budget
          </button_1.Button>
        </div>
      </div>
    </div>
  );
}
