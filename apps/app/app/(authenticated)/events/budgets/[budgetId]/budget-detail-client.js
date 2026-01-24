"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetDetailClient = BudgetDetailClient;
const navigation_1 = require("next/navigation");
const react_1 = require("react");
const sonner_1 = require("sonner");
const use_event_budgets_1 = require("@/app/lib/use-event-budgets");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const card_1 = require("@repo/design-system/components/ui/card");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const progress_1 = require("@repo/design-system/components/ui/progress");
const select_1 = require("@repo/design-system/components/ui/select");
const table_1 = require("@repo/design-system/components/ui/table");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
function BudgetDetailClient() {
  const params = (0, navigation_1.useParams)();
  const router = (0, navigation_1.useRouter)();
  const budgetId = params.budgetId;
  // State
  const [budget, setBudget] = (0, react_1.useState)(null);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [actionLoading, setActionLoading] = (0, react_1.useState)(false);
  // Edit mode
  const [editMode, setEditMode] = (0, react_1.useState)(false);
  const [editStatus, setEditStatus] = (0, react_1.useState)("");
  const [editNotes, setEditNotes] = (0, react_1.useState)("");
  // Line item modal
  const [lineItemModalOpen, setLineItemModalOpen] = (0, react_1.useState)(
    false
  );
  const [selectedLineItem, setSelectedLineItem] = (0, react_1.useState)(null);
  const [lineItemForm, setLineItemForm] = (0, react_1.useState)({
    category: "other",
    name: "",
    description: "",
    budgetedAmount: "",
    actualAmount: "",
    notes: "",
  });
  // Fetch budget
  const fetchBudget = (0, react_1.useCallback)(async () => {
    setLoading(true);
    try {
      const data = await (0, use_event_budgets_1.getBudget)(budgetId);
      setBudget(data);
      setEditStatus(data.status);
      setEditNotes(data.notes || "");
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to fetch budget"
      );
      router.push("/events/budgets");
    } finally {
      setLoading(false);
    }
  }, [budgetId, router]);
  (0, react_1.useEffect)(() => {
    fetchBudget();
  }, [fetchBudget]);
  // Handle budget update
  const handleUpdateBudget = async () => {
    if (!budget) return;
    setActionLoading(true);
    try {
      await (0, use_event_budgets_1.updateBudget)(budgetId, {
        status: editStatus,
        notes: editNotes,
      });
      sonner_1.toast.success("Budget updated successfully");
      setEditMode(false);
      await fetchBudget();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to update budget"
      );
    } finally {
      setActionLoading(false);
    }
  };
  // Open line item modal for new item
  const handleAddLineItem = () => {
    setSelectedLineItem(null);
    setLineItemForm({
      category: "other",
      name: "",
      description: "",
      budgetedAmount: "",
      actualAmount: "",
      notes: "",
    });
    setLineItemModalOpen(true);
  };
  // Open line item modal for editing
  const handleEditLineItem = (item) => {
    setSelectedLineItem(item);
    setLineItemForm({
      category: item.category,
      name: item.name,
      description: item.description || "",
      budgetedAmount: item.budgetedAmount.toString(),
      actualAmount: item.actualAmount.toString(),
      notes: item.notes || "",
    });
    setLineItemModalOpen(true);
  };
  // Save line item
  const handleSaveLineItem = async () => {
    if (!budget) return;
    setActionLoading(true);
    try {
      const data = {
        category: lineItemForm.category,
        name: lineItemForm.name,
        description: lineItemForm.description || undefined,
        budgetedAmount: Number.parseFloat(lineItemForm.budgetedAmount) || 0,
        notes: lineItemForm.notes || undefined,
      };
      if (selectedLineItem) {
        // Update existing line item
        await (0, use_event_budgets_1.updateLineItem)(
          budgetId,
          selectedLineItem.id,
          {
            ...data,
            actualAmount: Number.parseFloat(lineItemForm.actualAmount) || 0,
          }
        );
        sonner_1.toast.success("Line item updated successfully");
      } else {
        // Create new line item
        await (0, use_event_budgets_1.createLineItem)(budgetId, data);
        sonner_1.toast.success("Line item created successfully");
      }
      setLineItemModalOpen(false);
      await fetchBudget();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to save line item"
      );
    } finally {
      setActionLoading(false);
    }
  };
  // Delete line item
  const handleDeleteLineItem = async (itemId) => {
    if (!budget) return;
    setActionLoading(true);
    try {
      await (0, use_event_budgets_1.deleteLineItem)(budgetId, itemId);
      sonner_1.toast.success("Line item deleted successfully");
      await fetchBudget();
    } catch (error) {
      sonner_1.toast.error(
        error instanceof Error ? error.message : "Failed to delete line item"
      );
    } finally {
      setActionLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <lucide_react_1.Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!budget) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Budget not found</p>
        <button_1.Button
          className="mt-4"
          onClick={() => router.push("/events/budgets")}
          variant="outline"
        >
          <lucide_react_1.ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Budgets
        </button_1.Button>
      </div>
    );
  }
  const utilizationPct =
    budget.totalBudgetAmount > 0
      ? (budget.totalActualAmount / budget.totalBudgetAmount) * 100
      : 0;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button_1.Button
            onClick={() => router.push("/events/budgets")}
            size="sm"
            variant="ghost"
          >
            <lucide_react_1.ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back
          </button_1.Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Event Budget Details
            </h1>
            <p className="text-muted-foreground">
              Event ID: {budget.eventId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <button_1.Button
          disabled={loading}
          onClick={fetchBudget}
          size="sm"
          variant="outline"
        >
          {loading ? (
            <lucide_react_1.Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <lucide_react_1.RefreshCwIcon className="h-4 w-4" />
          )}
        </button_1.Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Status
            </card_1.CardTitle>
            <lucide_react_1.CheckCircle2Icon className="h-4 w-4 text-green-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <badge_1.Badge
              className={(0, use_event_budgets_1.getStatusColor)(budget.status)}
            >
              {budget.status}
            </badge_1.Badge>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Budget
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-blue-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_event_budgets_1.formatCurrency)(
                budget.totalBudgetAmount
              )}
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Actual
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-purple-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="text-2xl font-bold">
              {(0, use_event_budgets_1.formatCurrency)(
                budget.totalActualAmount
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {utilizationPct.toFixed(1)}% utilized
            </p>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <card_1.CardTitle className="text-sm font-medium">
              Variance
            </card_1.CardTitle>
            <lucide_react_1.DollarSignIcon className="h-4 w-4 text-green-600" />
          </card_1.CardHeader>
          <card_1.CardContent>
            <div
              className={`text-2xl font-bold ${
                budget.varianceAmount < 0
                  ? "text-red-600"
                  : budget.varianceAmount > 0
                    ? "text-green-600"
                    : ""
              }`}
            >
              {(0, use_event_budgets_1.formatCurrency)(
                Math.abs(budget.varianceAmount)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {budget.variancePercentage.toFixed(1)}%
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Utilization Progress */}
      <card_1.Card>
        <card_1.CardHeader>
          <card_1.CardTitle>Budget Utilization</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{utilizationPct.toFixed(1)}%</span>
            </div>
            <progress_1.Progress
              className="h-3"
              value={Math.min(utilizationPct, 100)}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {(0, use_event_budgets_1.formatCurrency)(
                  budget.totalActualAmount
                )}{" "}
                spent
              </span>
              <span>
                of{" "}
                {(0, use_event_budgets_1.formatCurrency)(
                  budget.totalBudgetAmount
                )}
              </span>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* Budget Settings */}
      <card_1.Card>
        <card_1.CardHeader>
          <div className="flex items-center justify-between">
            <card_1.CardTitle>Budget Settings</card_1.CardTitle>
            <button_1.Button
              disabled={actionLoading}
              onClick={() => {
                if (editMode) {
                  handleUpdateBudget();
                } else {
                  setEditMode(true);
                }
              }}
              size="sm"
              variant="outline"
            >
              {editMode ? (
                <>
                  <lucide_react_1.CheckCircle2Icon className="mr-2 h-4 w-4" />
                  Save
                </>
              ) : (
                <>
                  <lucide_react_1.EditIcon className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </button_1.Button>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div>
            <label_1.Label htmlFor="status">Status</label_1.Label>
            <select_1.Select
              disabled={!editMode}
              onValueChange={setEditStatus}
              value={editMode ? editStatus : budget.status}
            >
              <select_1.SelectTrigger id="status">
                <select_1.SelectValue />
              </select_1.SelectTrigger>
              <select_1.SelectContent>
                <select_1.SelectItem value="draft">Draft</select_1.SelectItem>
                <select_1.SelectItem value="approved">
                  Approved
                </select_1.SelectItem>
                <select_1.SelectItem value="active">Active</select_1.SelectItem>
                <select_1.SelectItem value="completed">
                  Completed
                </select_1.SelectItem>
                <select_1.SelectItem value="exceeded">
                  Exceeded
                </select_1.SelectItem>
              </select_1.SelectContent>
            </select_1.Select>
          </div>

          <div>
            <label_1.Label htmlFor="notes">Notes</label_1.Label>
            {editMode ? (
              <textarea_1.Textarea
                id="notes"
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes about this budget"
                rows={3}
                value={editNotes}
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {budget.notes || "No notes"}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Version:</span>{" "}
              {budget.version}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              {new Date(budget.createdAt).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>{" "}
              {new Date(budget.updatedAt).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">ID:</span>{" "}
              {budget.id.slice(0, 8)}...
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* Line Items */}
      <card_1.Card>
        <card_1.CardHeader>
          <div className="flex items-center justify-between">
            <card_1.CardTitle>Line Items</card_1.CardTitle>
            <button_1.Button onClick={handleAddLineItem} size="sm">
              <lucide_react_1.PlusIcon className="mr-2 h-4 w-4" />
              Add Line Item
            </button_1.Button>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent>
          <table_1.Table>
            <table_1.TableHeader>
              <table_1.TableRow>
                <table_1.TableHead>Category</table_1.TableHead>
                <table_1.TableHead>Name</table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Budgeted
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Actual
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Variance
                </table_1.TableHead>
                <table_1.TableHead className="text-right">
                  Actions
                </table_1.TableHead>
              </table_1.TableRow>
            </table_1.TableHeader>
            <table_1.TableBody>
              {!budget.lineItems || budget.lineItems.length === 0 ? (
                <table_1.TableRow>
                  <table_1.TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No line items yet. Add your first line item to track
                    expenses.
                  </table_1.TableCell>
                </table_1.TableRow>
              ) : (
                budget.lineItems.map((item) => {
                  const itemVariance = item.budgetedAmount - item.actualAmount;
                  const itemVariancePct =
                    item.budgetedAmount > 0
                      ? (itemVariance / item.budgetedAmount) * 100
                      : 0;
                  return (
                    <table_1.TableRow key={item.id}>
                      <table_1.TableCell>
                        <badge_1.Badge
                          className={(0, use_event_budgets_1.getCategoryColor)(
                            item.category
                          )}
                        >
                          {item.category}
                        </badge_1.Badge>
                      </table_1.TableCell>
                      <table_1.TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        {(0, use_event_budgets_1.formatCurrency)(
                          item.budgetedAmount
                        )}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        {(0, use_event_budgets_1.formatCurrency)(
                          item.actualAmount
                        )}
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        <div
                          className={
                            itemVariance < 0
                              ? "text-red-600"
                              : itemVariance > 0
                                ? "text-green-600"
                                : ""
                          }
                        >
                          {itemVariance < 0 ? "-" : itemVariance > 0 ? "+" : ""}
                          {(0, use_event_budgets_1.formatCurrency)(
                            Math.abs(itemVariance)
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {itemVariancePct.toFixed(1)}%
                        </div>
                      </table_1.TableCell>
                      <table_1.TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button_1.Button
                            onClick={() => handleEditLineItem(item)}
                            size="sm"
                            variant="ghost"
                          >
                            <lucide_react_1.EditIcon className="h-4 w-4" />
                          </button_1.Button>
                          <button_1.Button
                            disabled={actionLoading}
                            onClick={() => handleDeleteLineItem(item.id)}
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

      {/* Line Item Modal */}
      {lineItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setLineItemModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {selectedLineItem ? "Edit Line Item" : "Add Line Item"}
              </h2>
              <button_1.Button
                onClick={() => setLineItemModalOpen(false)}
                size="sm"
                variant="ghost"
              >
                <lucide_react_1.XIcon className="h-4 w-4" />
              </button_1.Button>
            </div>

            <div className="space-y-4">
              <div>
                <label_1.Label htmlFor="li-category">Category</label_1.Label>
                <select_1.Select
                  onValueChange={(v) =>
                    setLineItemForm({ ...lineItemForm, category: v })
                  }
                  value={lineItemForm.category}
                >
                  <select_1.SelectTrigger id="li-category">
                    <select_1.SelectValue />
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="venue">
                      Venue
                    </select_1.SelectItem>
                    <select_1.SelectItem value="catering">
                      Catering
                    </select_1.SelectItem>
                    <select_1.SelectItem value="beverages">
                      Beverages
                    </select_1.SelectItem>
                    <select_1.SelectItem value="labor">
                      Labor
                    </select_1.SelectItem>
                    <select_1.SelectItem value="equipment">
                      Equipment
                    </select_1.SelectItem>
                    <select_1.SelectItem value="other">
                      Other
                    </select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              <div>
                <label_1.Label htmlFor="li-name">Name</label_1.Label>
                <input_1.Input
                  id="li-name"
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, name: e.target.value })
                  }
                  placeholder="Line item name"
                  value={lineItemForm.name}
                />
              </div>

              <div>
                <label_1.Label htmlFor="li-description">
                  Description
                </label_1.Label>
                <input_1.Input
                  id="li-description"
                  onChange={(e) =>
                    setLineItemForm({
                      ...lineItemForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional description"
                  value={lineItemForm.description}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label_1.Label htmlFor="li-budgeted">Budgeted</label_1.Label>
                  <input_1.Input
                    id="li-budgeted"
                    onChange={(e) =>
                      setLineItemForm({
                        ...lineItemForm,
                        budgetedAmount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={lineItemForm.budgetedAmount}
                  />
                </div>

                <div>
                  <label_1.Label htmlFor="li-actual">Actual</label_1.Label>
                  <input_1.Input
                    id="li-actual"
                    onChange={(e) =>
                      setLineItemForm({
                        ...lineItemForm,
                        actualAmount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={lineItemForm.actualAmount}
                  />
                </div>
              </div>

              <div>
                <label_1.Label htmlFor="li-notes">Notes</label_1.Label>
                <textarea_1.Textarea
                  id="li-notes"
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, notes: e.target.value })
                  }
                  placeholder="Optional notes"
                  rows={2}
                  value={lineItemForm.notes}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button_1.Button
                  disabled={actionLoading}
                  onClick={() => setLineItemModalOpen(false)}
                  variant="outline"
                >
                  Cancel
                </button_1.Button>
                <button_1.Button
                  disabled={actionLoading}
                  onClick={handleSaveLineItem}
                >
                  {actionLoading
                    ? "Saving..."
                    : selectedLineItem
                      ? "Update"
                      : "Add"}
                </button_1.Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
