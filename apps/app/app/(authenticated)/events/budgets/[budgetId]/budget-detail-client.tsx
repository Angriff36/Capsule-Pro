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
import { Label } from "@repo/design-system/components/ui/label";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DollarSignIcon,
  EditIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  BudgetLineItem,
  BudgetLineItemCategory,
  EventBudget,
  EventBudgetStatus,
} from "@/app/lib/use-event-budgets";
import {
  createLineItem,
  deleteLineItem,
  formatCurrency,
  getBudget,
  getCategoryColor,
  getStatusColor,
  updateBudget,
  updateLineItem,
} from "@/app/lib/use-event-budgets";

export function BudgetDetailClient() {
  const params = useParams();
  const router = useRouter();
  const budgetId = (params?.budgetId as string) ?? "";

  // State
  const [budget, setBudget] = useState<EventBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Valid status values for validation
  const validStatuses: readonly string[] = [
    "draft",
    "approved",
    "active",
    "completed",
    "exceeded",
  ] as const;

  // Handler for status change from Select component
  const handleStatusChange = (value: string) => {
    setEditStatus(value);
  };

  // Type guard to check if a string is a valid EventBudgetStatus
  const isValidStatus = (value: string): value is EventBudgetStatus => {
    return validStatuses.includes(value);
  };

  // Line item modal
  const [lineItemModalOpen, setLineItemModalOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] =
    useState<BudgetLineItem | null>(null);
  const [lineItemForm, setLineItemForm] = useState({
    category: "other" as BudgetLineItemCategory,
    name: "",
    description: "",
    budgetedAmount: "",
    actualAmount: "",
    notes: "",
  });

  // Fetch budget
  const fetchBudget = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudget(budgetId);
      setBudget(data);
      setEditStatus(data.status);
      setEditNotes(data.notes || "");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch budget"
      );
      router.push("/events/budgets");
    } finally {
      setLoading(false);
    }
  }, [budgetId, router]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  // Handle budget update
  const handleUpdateBudget = async () => {
    if (!budget) {
      return;
    }

    setActionLoading(true);
    try {
      const updateData: {
        status?: EventBudgetStatus;
        notes?: string;
      } = {
        notes: editNotes,
      };

      // Only include status if it's valid
      if (editStatus && isValidStatus(editStatus)) {
        updateData.status = editStatus;
      }

      await updateBudget(budgetId, updateData);
      toast.success("Budget updated successfully");
      setEditMode(false);
      await fetchBudget();
    } catch (error) {
      toast.error(
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
  const handleEditLineItem = (item: BudgetLineItem) => {
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
    if (!budget) {
      return;
    }

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
        await updateLineItem(budgetId, selectedLineItem.id, {
          ...data,
          actualAmount: Number.parseFloat(lineItemForm.actualAmount) || 0,
        });
        toast.success("Line item updated successfully");
      } else {
        // Create new line item
        await createLineItem(budgetId, data);
        toast.success("Line item created successfully");
      }

      setLineItemModalOpen(false);
      await fetchBudget();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save line item"
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Delete line item
  const handleDeleteLineItem = async (itemId: string) => {
    if (!budget) {
      return;
    }

    setActionLoading(true);
    try {
      await deleteLineItem(budgetId, itemId);
      toast.success("Line item deleted successfully");
      await fetchBudget();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete line item"
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Budget not found</p>
        <Button
          className="mt-4"
          onClick={() => router.push("/events/budgets")}
          variant="outline"
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          Back to Budgets
        </Button>
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
          <Button
            onClick={() => router.push("/events/budgets")}
            size="sm"
            variant="ghost"
          >
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Event Budget Details
            </h1>
            <p className="text-muted-foreground">
              Event ID: {budget.eventId.slice(0, 8)}...
            </p>
          </div>
        </div>
        <Button
          disabled={loading}
          onClick={fetchBudget}
          size="sm"
          variant="outline"
        >
          {loading ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCwIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(budget.status)}>
              {budget.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(budget.totalBudgetAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(budget.totalActualAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {utilizationPct.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                budget.varianceAmount < 0
                  ? "text-red-600"
                  : budget.varianceAmount > 0
                    ? "text-green-600"
                    : ""
              }`}
            >
              {formatCurrency(Math.abs(budget.varianceAmount))}
            </div>
            <p className="text-xs text-muted-foreground">
              {budget.variancePercentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{utilizationPct.toFixed(1)}%</span>
            </div>
            <Progress className="h-3" value={Math.min(utilizationPct, 100)} />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(budget.totalActualAmount)} spent</span>
              <span>of {formatCurrency(budget.totalBudgetAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget Settings</CardTitle>
            <Button
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
                  <CheckCircle2Icon className="mr-2 h-4 w-4" />
                  Save
                </>
              ) : (
                <>
                  <EditIcon className="mr-2 h-4 w-4" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              disabled={!editMode}
              onValueChange={handleStatusChange}
              value={editMode ? editStatus : budget.status}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="exceeded">Exceeded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            {editMode ? (
              <Textarea
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
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button onClick={handleAddLineItem} size="sm">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Line Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!budget.lineItems || budget.lineItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No line items yet. Add your first line item to track
                    expenses.
                  </TableCell>
                </TableRow>
              ) : (
                budget.lineItems.map((item: BudgetLineItem) => {
                  const itemVariance = item.budgetedAmount - item.actualAmount;
                  const itemVariancePct =
                    item.budgetedAmount > 0
                      ? (itemVariance / item.budgetedAmount) * 100
                      : 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.budgetedAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.actualAmount)}
                      </TableCell>
                      <TableCell className="text-right">
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
                          {formatCurrency(Math.abs(itemVariance))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {itemVariancePct.toFixed(1)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleEditLineItem(item)}
                            size="sm"
                            variant="ghost"
                          >
                            <EditIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            disabled={actionLoading}
                            onClick={() => handleDeleteLineItem(item.id)}
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
              <Button
                onClick={() => setLineItemModalOpen(false)}
                size="sm"
                variant="ghost"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="li-category">Category</Label>
                <Select
                  onValueChange={(v) =>
                    setLineItemForm({
                      ...lineItemForm,
                      category: v as BudgetLineItemCategory,
                    })
                  }
                  value={lineItemForm.category}
                >
                  <SelectTrigger id="li-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venue">Venue</SelectItem>
                    <SelectItem value="catering">Catering</SelectItem>
                    <SelectItem value="beverages">Beverages</SelectItem>
                    <SelectItem value="labor">Labor</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="li-name">Name</Label>
                <Input
                  id="li-name"
                  onChange={(e) =>
                    setLineItemForm({ ...lineItemForm, name: e.target.value })
                  }
                  placeholder="Line item name"
                  value={lineItemForm.name}
                />
              </div>

              <div>
                <Label htmlFor="li-description">Description</Label>
                <Input
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
                  <Label htmlFor="li-budgeted">Budgeted</Label>
                  <Input
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
                  <Label htmlFor="li-actual">Actual</Label>
                  <Input
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
                <Label htmlFor="li-notes">Notes</Label>
                <Textarea
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
                <Button
                  disabled={actionLoading}
                  onClick={() => setLineItemModalOpen(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={actionLoading} onClick={handleSaveLineItem}>
                  {actionLoading
                    ? "Saving..."
                    : selectedLineItem
                      ? "Update"
                      : "Add"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
