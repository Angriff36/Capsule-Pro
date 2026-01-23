"use client";

import { PencilIcon, PlusIcon, SaveIcon, TrashIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type BudgetCategory,
  type BudgetLineItem,
  type EventBudget,
  type EventBudgetStatus,
  type UpdateBudgetRequest,
  type UpdateLineItemRequest,
  getBudget,
  getBudgetStatusLabel,
  getCategoryLabel,
  getVarianceColor,
  isBudgetEditable,
  updateBudget,
  deleteBudget,
  createLineItem,
  updateLineItem,
  deleteLineItem,
} from "../../../../../lib/use-budgets";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";

interface BudgetDetailClientProps {
  budgetId: string;
  tenantId: string;
}

interface EditingLineItem {
  id: string;
  category: BudgetCategory;
  name: string;
  description: string;
  budgetedAmount: number;
  actualAmount: number;
  notes: string;
}

export const BudgetDetailClient = ({
  budgetId,
  tenantId,
}: BudgetDetailClientProps) => {
  const [budget, setBudget] = useState<EventBudget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newLineItem, setNewLineItem] = useState<EditingLineItem>({
    id: "",
    category: "food",
    name: "",
    description: "",
    budgetedAmount: 0,
    actualAmount: 0,
    notes: "",
  });
  const [showAddLine, setShowAddLine] = useState(false);

  // Editable budget fields
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<EventBudgetStatus>("draft");

  const loadBudget = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBudget(budgetId);
      setBudget(data);
      setEditNotes(data.notes || "");
      setEditStatus(data.status);
    } catch (error) {
      console.error("Failed to load budget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load budget"
      );
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  const handleSave = useCallback(async () => {
    if (!budget) return;

    setIsSaving(true);
    try {
      const updateData: UpdateBudgetRequest = {
        notes: editNotes || undefined,
      };

      // Only update status if changed
      if (editStatus !== budget.status) {
        updateData.status = editStatus;
      }

      await updateBudget(budgetId, updateData);
      toast.success("Budget updated successfully");
      setIsEditing(false);
      loadBudget();
    } catch (error) {
      console.error("Failed to update budget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update budget"
      );
    } finally {
      setIsSaving(false);
    }
  }, [budget, budgetId, editNotes, editStatus, loadBudget]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteBudget(budgetId);
      toast.success("Budget deleted successfully");
      window.location.href = "/events/budgets";
    } catch (error) {
      console.error("Failed to delete budget:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget"
      );
    }
  }, [budgetId]);

  const handleAddLineItem = useCallback(async () => {
    if (!newLineItem.name) {
      toast.error("Line item name is required");
      return;
    }

    try {
      await createLineItem({
        budgetId,
        category: newLineItem.category,
        name: newLineItem.name,
        description: newLineItem.description || undefined,
        budgetedAmount: newLineItem.budgetedAmount,
        actualAmount: newLineItem.actualAmount,
        notes: newLineItem.notes || undefined,
      });
      toast.success("Line item added successfully");
      setNewLineItem({
        id: "",
        category: "food",
        name: "",
        description: "",
        budgetedAmount: 0,
        actualAmount: 0,
        notes: "",
      });
      setShowAddLine(false);
      loadBudget();
    } catch (error) {
      console.error("Failed to add line item:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add line item"
      );
    }
  }, [budgetId, newLineItem, loadBudget]);

  const handleUpdateLineItem = useCallback(
    async (item: BudgetLineItem, updates: UpdateLineItemRequest) => {
      try {
        await updateLineItem(budgetId, item.id, updates);
        toast.success("Line item updated successfully");
        loadBudget();
      } catch (error) {
        console.error("Failed to update line item:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to update line item"
        );
      }
    },
    [budgetId, loadBudget]
  );

  const handleDeleteLineItem = useCallback(
    async (item: BudgetLineItem) => {
      if (item.actual_amount > 0) {
        toast.error("Cannot delete line item with actual costs recorded");
        return;
      }

      try {
        await deleteLineItem(budgetId, item.id);
        toast.success("Line item deleted successfully");
        loadBudget();
      } catch (error) {
        console.error("Failed to delete line item:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to delete line item"
        );
      }
    },
    [budgetId, loadBudget]
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Calculate category totals
  const categoryTotals = budget?.line_items?.reduce(
    (acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = { budgeted: 0, actual: 0 };
      }
      acc[category].budgeted += item.budgeted_amount;
      acc[category].actual += item.actual_amount;
      return acc;
    },
    {} as Record<
      BudgetCategory,
      { budgeted: number; actual: number }
    >
  ) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-2 text-lg font-semibold">Budget not found</h3>
        <p className="mb-4 text-muted-foreground text-sm">
          The budget you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => (window.location.href = "/events/budgets")}>
          Back to Budgets
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Budget Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-3">
                {budget.event?.title || "Unknown Event"}
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
                <Badge variant="outline">v{budget.version}</Badge>
              </CardTitle>
              <CardDescription>
                {budget.event?.event_date &&
                  new Date(budget.event.event_date).toLocaleDateString(
                    "en-US",
                    { dateStyle: "long" }
                  )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isBudgetEditable(budget.status) && (
                <>
                  {isEditing ? (
                    <>
                      <Button
                        disabled={isSaving}
                        onClick={handleSave}
                        size="sm"
                      >
                        <SaveIcon className="mr-2 size-4" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        disabled={isSaving}
                        onClick={() => {
                          setIsEditing(false);
                          setEditNotes(budget.notes || "");
                          setEditStatus(budget.status);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        <XIcon className="mr-2 size-4" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setIsEditing(true)}
                        size="sm"
                        variant="outline"
                      >
                        <PencilIcon className="mr-2 size-4" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setDeleteDialogOpen(true)}
                        size="sm"
                        variant="destructive"
                      >
                        <TrashIcon className="mr-2 size-4" />
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        {isEditing && (
          <CardContent className="space-y-4 border-t">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  onValueChange={(v) => setEditStatus(v as EventBudgetStatus)}
                  value={editStatus}
                >
                  <SelectTrigger id="editStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="locked">Locked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                placeholder="Add notes about this budget..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budgeted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(budget.total_budget_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(budget.total_actual_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Variance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(budget.variance_amount)}`}>
              {formatCurrency(budget.variance_amount)}
            </div>
            <div className={`text-sm ${getVarianceColor(budget.variance_amount)}`}>
              {formatPercentage(budget.variance_percentage)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {budget.variance_amount < 0
                ? "Over Budget"
                : budget.variance_amount === 0
                ? "On Budget"
                : "Under Budget"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(categoryTotals).map(([category, totals]) => (
                <div
                  key={category}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-2 text-sm font-medium uppercase">
                    {getCategoryLabel(category as BudgetCategory)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budgeted:</span>
                      <span className="font-medium">
                        {formatCurrency(totals.budgeted)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual:</span>
                      <span className="font-medium">
                        {formatCurrency(totals.actual)}
                      </span>
                    </div>
                    <div
                      className={`flex justify-between ${
                        totals.budgeted - totals.actual < 0
                          ? "text-red-600"
                          : totals.budgeted - totals.actual === 0
                          ? "text-gray-600"
                          : "text-green-600"
                      }`}
                    >
                      <span>Variance:</span>
                      <span className="font-medium">
                        {formatCurrency(totals.budgeted - totals.actual)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>
                {budget.line_items?.length || 0} items
              </CardDescription>
            </div>
            {isBudgetEditable(budget.status) && (
              <Button onClick={() => setShowAddLine(!showAddLine)} size="sm">
                <PlusIcon className="mr-2 size-4" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddLine && (
            <div className="mb-4 rounded-lg border p-4">
              <h4 className="mb-4 font-semibold">Add Line Item</h4>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    onValueChange={(v) =>
                      setNewLineItem({ ...newLineItem, category: v as BudgetCategory })
                    }
                    value={newLineItem.category}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="rentals">Rentals</SelectItem>
                      <SelectItem value="miscellaneous">
                        Miscellaneous
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Item name"
                    value={newLineItem.name}
                    onChange={(e) =>
                      setNewLineItem({ ...newLineItem, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budgeted</Label>
                  <Input
                    min={0}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={newLineItem.budgetedAmount || ""}
                    onChange={(e) =>
                      setNewLineItem({
                        ...newLineItem,
                        budgetedAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Actual</Label>
                  <Input
                    min={0}
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={newLineItem.actualAmount || ""}
                    onChange={(e) =>
                      setNewLineItem({
                        ...newLineItem,
                        actualAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    disabled={!newLineItem.name}
                    onClick={handleAddLineItem}
                    className="flex-1"
                  >
                    <PlusIcon className="mr-2 size-4" />
                    Add
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddLine(false);
                      setNewLineItem({
                        id: "",
                        category: "food",
                        name: "",
                        description: "",
                        budgetedAmount: 0,
                        actualAmount: 0,
                        notes: "",
                      });
                    }}
                    variant="outline"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!budget.line_items || budget.line_items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No line items yet. Add items to track budget categories.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Budgeted</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budget.line_items.map((item) => (
                    <LineItemRow
                      item={item}
                      key={item.id}
                      editable={isBudgetEditable(budget.status)}
                      onUpdate={(updates) => handleUpdateLineItem(item, updates)}
                      onDelete={() => handleDeleteLineItem(item)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Inline editable line item row
interface LineItemRowProps {
  item: BudgetLineItem;
  editable: boolean;
  onUpdate: (updates: UpdateLineItemRequest) => void;
  onDelete: () => void;
}

const LineItemRow = ({ item, editable, onUpdate, onDelete }: LineItemRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    budgetedAmount: item.budgeted_amount,
    actualAmount: item.actual_amount,
  });

  const handleSave = () => {
    onUpdate(editValues);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const variance = editValues.budgetedAmount - editValues.actualAmount;

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
      </TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {item.description || "-"}
      </TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <Input
            className="h-8 text-right"
            min={0}
            step="0.01"
            type="number"
            value={editValues.budgetedAmount || ""}
            onChange={(e) =>
              setEditValues({
                ...editValues,
                budgetedAmount: parseFloat(e.target.value) || 0,
              })
            }
          />
        ) : (
          formatCurrency(item.budgeted_amount)
        )}
      </TableCell>
      <TableCell className="text-right">
        {isEditing ? (
          <Input
            className="h-8 text-right"
            min={0}
            step="0.01"
            type="number"
            value={editValues.actualAmount || ""}
            onChange={(e) =>
              setEditValues({
                ...editValues,
                actualAmount: parseFloat(e.target.value) || 0,
              })
            }
          />
        ) : (
          formatCurrency(item.actual_amount)
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className={getVarianceColor(variance)}>
          <div className="font-medium">{formatCurrency(variance)}</div>
        </div>
      </TableCell>
      <TableCell>
        {isEditing ? (
          <div className="flex justify-end gap-1">
            <Button
              onClick={handleSave}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <SaveIcon className="size-4" />
            </Button>
            <Button
              onClick={() => {
                setIsEditing(false);
                setEditValues({
                  budgetedAmount: item.budgeted_amount,
                  actualAmount: item.actual_amount,
                });
              }}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-1">
            {editable && (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  disabled={item.actual_amount > 0}
                  onClick={onDelete}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </>
            )}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
};
